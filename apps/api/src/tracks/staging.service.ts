import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { NotFoundError } from '../common/errors/not-found.error.js';
import { getAudioDurationSeconds } from './audio-duration.helper.js';
import type { ExtractedZipChannel } from './zip-import.helper.js';

const STAGING_PREFIX = 'hub-import-';
const ORPHAN_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

export interface StagedChannel {
    tempChannelId: string;
    suggestedName: string;
    fileName: string;
    stagedFileName: string;
    mimeType: string;
    durationSeconds: number;
}

export interface StagingManifest {
    importId: string;
    suggestedName: string;
    createdAt: string;
    channels: StagedChannel[];
}

function deriveTrackNameFromZip(zipFileName: string): string {
    const base = zipFileName.split('/').pop() ?? zipFileName;
    const dotIndex = base.lastIndexOf('.');
    return dotIndex > 0 ? base.slice(0, dotIndex) : base;
}

/**
 * Gerencia o estado "parseado, mas ainda não salvo" da importação — vive
 * como arquivos num diretório temporário (fora de TRACKS_DIR de propósito:
 * um import cancelado/abandonado nunca deve deixar rastro dentro da pasta
 * que só devia conter tracks confirmadas).
 */
@Injectable()
export class StagingService implements OnModuleInit {
    private readonly logger = new Logger(StagingService.name);

    // Varre staging órfão (aba fechada sem cancelar) toda vez que o backend sobe.
    async onModuleInit(): Promise<void> {
        await this.sweepOrphans();
    }

    private stagingDir(importId: string): string {
        return path.join(os.tmpdir(), `${STAGING_PREFIX}${importId}`);
    }

    private manifestPath(importId: string): string {
        return path.join(this.stagingDir(importId), 'manifest.json');
    }

    async createStagingImport(
        originalZipName: string,
        extractedChannels: ExtractedZipChannel[],
    ): Promise<StagingManifest> {
        const importId = randomUUID();
        const dir = this.stagingDir(importId);
        await fs.mkdir(dir, { recursive: true });

        const channels: StagedChannel[] = [];
        for (const channel of extractedChannels) {
            const tempChannelId = randomUUID();
            const ext = channel.fileName.split('.').pop() ?? 'bin';
            const stagedFileName = `${tempChannelId}.${ext}`;
            await fs.writeFile(path.join(dir, stagedFileName), channel.buffer);
            const durationSeconds = await getAudioDurationSeconds(
                channel.buffer,
                channel.mimeType,
            );

            channels.push({
                tempChannelId,
                suggestedName: channel.name,
                fileName: channel.fileName,
                stagedFileName,
                mimeType: channel.mimeType,
                durationSeconds,
            });
        }

        const manifest: StagingManifest = {
            importId,
            suggestedName: deriveTrackNameFromZip(originalZipName),
            createdAt: new Date().toISOString(),
            channels,
        };

        await fs.writeFile(
            this.manifestPath(importId),
            JSON.stringify(manifest, null, 2),
        );
        return manifest;
    }

    async readManifest(importId: string): Promise<StagingManifest> {
        try {
            const raw = await fs.readFile(this.manifestPath(importId), 'utf-8');
            return JSON.parse(raw) as StagingManifest;
        } catch {
            throw new NotFoundError(
                21,
                'Importação não encontrada ou expirada.',
            );
        }
    }

    /** Move os arquivos do staging pra `<tracksDir>/<trackId>/`, devolvendo o caminho final (relativo a tracksDir) de cada tempChannelId. */
    async moveChannelsToTracksDir(
        manifest: StagingManifest,
        tracksDir: string,
        trackId: string,
    ): Promise<Map<string, string>> {
        const targetDir = path.join(tracksDir, trackId);
        await fs.mkdir(targetDir, { recursive: true });

        const finalPathsByTempId = new Map<string, string>();
        for (const channel of manifest.channels) {
            const source = path.join(
                this.stagingDir(manifest.importId),
                channel.stagedFileName,
            );
            const relativeTarget = path.join(trackId, channel.stagedFileName);
            const absoluteTarget = path.join(tracksDir, relativeTarget);
            await this.moveFile(source, absoluteTarget);
            finalPathsByTempId.set(channel.tempChannelId, relativeTarget);
        }

        return finalPathsByTempId;
    }

    private async moveFile(source: string, destination: string): Promise<void> {
        try {
            await fs.rename(source, destination);
        } catch (error) {
            // EXDEV: staging (tmp) e TRACKS_DIR em volumes diferentes — rename
            // não atravessa device, então cai pra copiar + apagar a origem.
            if ((error as NodeJS.ErrnoException).code === 'EXDEV') {
                await fs.copyFile(source, destination);
                await fs.unlink(source);
                return;
            }
            throw error;
        }
    }

    async discardStagingImport(importId: string): Promise<void> {
        await fs.rm(this.stagingDir(importId), {
            recursive: true,
            force: true,
        });
    }

    /** Remove diretórios de staging abandonados (ex.: aba fechada sem cancelar). */
    async sweepOrphans(): Promise<void> {
        const tmp = os.tmpdir();
        let entries: string[];
        try {
            entries = await fs.readdir(tmp);
        } catch {
            return;
        }

        const now = Date.now();
        await Promise.all(
            entries
                .filter((entry) => entry.startsWith(STAGING_PREFIX))
                .map(async (entry) => {
                    const fullPath = path.join(tmp, entry);
                    try {
                        const stat = await fs.stat(fullPath);
                        if (now - stat.mtimeMs > ORPHAN_MAX_AGE_MS) {
                            await fs.rm(fullPath, {
                                recursive: true,
                                force: true,
                            });
                            this.logger.log(`Staging órfão removido: ${entry}`);
                        }
                    } catch {
                        // já removido por outra rota nesse meio tempo, ignora
                    }
                }),
        );
    }
}
