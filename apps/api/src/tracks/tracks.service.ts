import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotFoundError } from '../common/errors/not-found.error.js';
import { UnprocessableEntityError } from '../common/errors/unprocessable-entity.error.js';
import { BlobStorageService } from './blob-storage.service.js';
import { ConfirmImportDto } from './dto/confirm-import.dto.js';
import { UpdateTrackTonalityDto } from './dto/update-track-tonality.dto.js';
import { Channel } from './entities/channel.entity.js';
import { Track } from './entities/track.entity.js';
import { MusicalNote } from './musical-note.enum.js';
import { StagingService } from './staging.service.js';
import { extractAudioChannelsFromZip } from './zip-import.helper.js';

export interface TrackSummary {
    id: string;
    name: string;
    importedAt: string;
    channelCount: number;
    durationSeconds: number;
    bpm: number | null;
    tonality: MusicalNote | null;
}

export interface TrackDetail extends TrackSummary {
    channels: Array<{
        id: string;
        name: string;
        order: number;
        durationSeconds: number;
        pitchEditable: boolean;
        fileUrl: string;
    }>;
}

export interface ImportPreview {
    importId: string;
    suggestedName: string;
    channels: Array<{
        tempChannelId: string;
        suggestedName: string;
        durationSeconds: number;
    }>;
}

@Injectable()
export class TracksService {
    constructor(
        @InjectRepository(Track)
        private readonly trackRepository: Repository<Track>,
        private readonly stagingService: StagingService,
        private readonly blobStorage: BlobStorageService,
    ) {}

    async startImport(
        blobUrl: string,
        originalName: string,
    ): Promise<ImportPreview> {
        let buffer: Buffer;
        try {
            buffer = await this.blobStorage.fetchPrivateBlob(blobUrl);
        } catch {
            throw new UnprocessableEntityError(
                13,
                'Não foi possível ler o arquivo enviado.',
            );
        }

        try {
            const extracted = await extractAudioChannelsFromZip(
                originalName,
                buffer,
            );
            const manifest = await this.stagingService.createStagingImport(
                originalName,
                extracted,
            );

            return {
                importId: manifest.importId,
                suggestedName: manifest.suggestedName,
                channels: manifest.channels.map((channel) => ({
                    tempChannelId: channel.tempChannelId,
                    suggestedName: channel.suggestedName,
                    durationSeconds: channel.durationSeconds,
                })),
            };
        } finally {
            // O .zip enviado só existia pra chegar até aqui — nunca faz
            // parte do staging de canais nem da track final.
            await this.blobStorage.del(blobUrl).catch(() => undefined);
        }
    }

    /** Refaz o preview a partir do manifest de staging — usado quando o
     * usuário recarrega a página de revisão (o preview do POST original não
     * sobrevive a um reload, já que só existe na memória do browser). */
    async getImportPreview(importId: string): Promise<ImportPreview> {
        const manifest = await this.stagingService.readManifest(importId);
        return {
            importId: manifest.importId,
            suggestedName: manifest.suggestedName,
            channels: manifest.channels.map((channel) => ({
                tempChannelId: channel.tempChannelId,
                suggestedName: channel.suggestedName,
                durationSeconds: channel.durationSeconds,
            })),
        };
    }

    async confirmImport(
        importId: string,
        dto: ConfirmImportDto,
    ): Promise<TrackDetail> {
        const manifest = await this.stagingService.readManifest(importId);

        const manifestIds = new Set(
            manifest.channels.map((channel) => channel.tempChannelId),
        );
        const dtoIds = new Set(
            dto.channels.map((channel) => channel.tempChannelId),
        );
        const idsMatch =
            manifestIds.size === dtoIds.size &&
            [...manifestIds].every((id) => dtoIds.has(id));
        if (!idsMatch) {
            throw new UnprocessableEntityError(
                11,
                'A lista de canais não confere com a importação.',
            );
        }

        const trackId = randomUUID();
        const finalPathnameByTempId =
            await this.stagingService.moveChannelsToTracksDir(
                manifest,
                trackId,
            );

        try {
            await this.trackRepository.manager.transaction(async (manager) => {
                const track = manager.create(Track, {
                    id: trackId,
                    name: dto.name,
                    bpm: dto.bpm ?? null,
                    tonality: dto.tonality ?? null,
                });
                await manager.save(track);

                const dtoByTempId = new Map(
                    dto.channels.map((channel) => [channel.tempChannelId, channel]),
                );
                const channelEntities = manifest.channels.map((staged, index) => {
                    const channelDto = dtoByTempId.get(staged.tempChannelId);
                    return manager.create(Channel, {
                        // Postgres não gera o uuid sozinho sem um DEFAULT na
                        // coluna (nossas migrations não adicionam um de
                        // propósito) — sempre gerar explícito, como já
                        // fazemos pra Track/StagingImport.
                        id: randomUUID(),
                        trackId,
                        name: channelDto?.name ?? staged.suggestedName,
                        fileName: staged.fileName,
                        blobPathname: finalPathnameByTempId.get(
                            staged.tempChannelId,
                        )!,
                        mimeType: staged.mimeType,
                        order: index,
                        durationSeconds: staged.durationSeconds,
                        pitchEditable: channelDto?.pitchEditable ?? true,
                    });
                });
                await manager.save(channelEntities);
            });
        } catch (error) {
            // Desfaz os blobs já movidos se o banco falhar, pra não deixar
            // arquivos em tracks/ sem registro nenhum no banco.
            const urls = await this.blobStorage.listByPrefix(
                `tracks/${trackId}/`,
            );
            if (urls.length > 0) {
                await this.blobStorage.del(urls).catch(() => undefined);
            }
            throw error;
        }

        await this.stagingService.discardStagingImport(importId);

        return this.findById(trackId);
    }

    async cancelImport(importId: string): Promise<void> {
        await this.stagingService.discardStagingImport(importId);
    }

    async sweepStaging(): Promise<void> {
        await this.stagingService.sweepOrphans();
    }

    async findAll(): Promise<TrackSummary[]> {
        const tracks = await this.trackRepository.find({
            relations: { channels: true },
            order: { createdAt: 'DESC' },
        });
        return tracks.map((track) => this.toSummary(track));
    }

    async findById(id: string): Promise<TrackDetail> {
        const track = await this.trackRepository.findOne({
            where: { id },
            relations: { channels: true },
        });
        if (!track) throw new NotFoundError(22, 'Track não encontrada.');

        const channels = [...track.channels].sort((a, b) => a.order - b.order);

        return {
            ...this.toSummary(track),
            channels: await Promise.all(
                channels.map(async (channel) => ({
                    id: channel.id,
                    name: channel.name,
                    order: channel.order,
                    durationSeconds: channel.durationSeconds,
                    pitchEditable: channel.pitchEditable,
                    fileUrl: await this.blobStorage.getSignedGetUrl(
                        channel.blobPathname,
                    ),
                })),
            ),
        };
    }

    async updateTonality(
        id: string,
        dto: UpdateTrackTonalityDto,
    ): Promise<TrackDetail> {
        const track = await this.trackRepository.findOne({ where: { id } });
        if (!track) throw new NotFoundError(22, 'Track não encontrada.');

        track.tonality = dto.tonality;
        await this.trackRepository.save(track);

        return this.findById(id);
    }

    async remove(id: string): Promise<void> {
        const track = await this.trackRepository.findOne({ where: { id } });
        if (!track) throw new NotFoundError(22, 'Track não encontrada.');

        // O FK de channels->track tem ON DELETE CASCADE, então as linhas de
        // canal são removidas junto pelo próprio Postgres.
        await this.trackRepository.remove(track);

        const urls = await this.blobStorage.listByPrefix(`tracks/${id}/`);
        if (urls.length > 0) {
            await this.blobStorage.del(urls);
        }
    }

    private toSummary(track: Track): TrackSummary {
        const durationSeconds = track.channels.reduce(
            (max, channel) => Math.max(max, channel.durationSeconds),
            0,
        );

        return {
            id: track.id,
            name: track.name,
            importedAt: track.createdAt.toISOString(),
            channelCount: track.channels.length,
            durationSeconds,
            bpm: track.bpm,
            tonality: track.tonality,
        };
    }
}
