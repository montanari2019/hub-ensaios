import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotFoundError } from '../common/errors/not-found.error.js';
import { UnprocessableEntityError } from '../common/errors/unprocessable-entity.error.js';
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
        @InjectRepository(Channel)
        private readonly channelRepository: Repository<Channel>,
        private readonly stagingService: StagingService,
        private readonly configService: ConfigService,
    ) {}

    private get tracksDir(): string {
        return this.configService.getOrThrow<string>('tracksStorage.tracksDir');
    }

    async startImport(
        originalName: string,
        buffer: Buffer,
    ): Promise<ImportPreview> {
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
        const finalPathsByTempId =
            await this.stagingService.moveChannelsToTracksDir(
                manifest,
                this.tracksDir,
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
                        trackId,
                        name: channelDto?.name ?? staged.suggestedName,
                        fileName: staged.fileName,
                        filePath: finalPathsByTempId.get(staged.tempChannelId)!,
                        mimeType: staged.mimeType,
                        order: index,
                        durationSeconds: staged.durationSeconds,
                        pitchEditable: channelDto?.pitchEditable ?? true,
                    });
                });
                await manager.save(channelEntities);
            });
        } catch (error) {
            // Desfaz os arquivos já movidos se o banco falhar, pra não deixar
            // uma pasta em tracks/ sem registro nenhum no banco.
            await fs.rm(path.join(this.tracksDir, trackId), {
                recursive: true,
                force: true,
            });
            throw error;
        }

        await this.stagingService.discardStagingImport(importId);

        return this.findById(trackId);
    }

    async cancelImport(importId: string): Promise<void> {
        await this.stagingService.discardStagingImport(importId);
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
            channels: channels.map((channel) => ({
                id: channel.id,
                name: channel.name,
                order: channel.order,
                durationSeconds: channel.durationSeconds,
                pitchEditable: channel.pitchEditable,
            })),
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
        // canal são removidas junto pelo próprio SQLite.
        await this.trackRepository.remove(track);
        await fs.rm(path.join(this.tracksDir, id), {
            recursive: true,
            force: true,
        });
    }

    async getChannelFile(
        trackId: string,
        channelId: string,
    ): Promise<{ absolutePath: string; mimeType: string }> {
        const channel = await this.channelRepository.findOne({
            where: { id: channelId, trackId },
        });
        if (!channel) throw new NotFoundError(23, 'Canal não encontrado.');

        return {
            absolutePath: path.join(this.tracksDir, channel.filePath),
            mimeType: channel.mimeType,
        };
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
