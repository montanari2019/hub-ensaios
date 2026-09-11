import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerAs } from '@nestjs/config';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
// De apps/api/src/config -> apps/api/src -> apps/api -> apps -> raiz do monorepo.
const monorepoRoot = path.resolve(moduleDir, '../../../..');
const defaultTracksDir = path.join(monorepoRoot, 'tracks');

export default registerAs('tracksStorage', () => ({
    // Pasta onde ficam os áudios das tracks confirmadas — SEMPRE na raiz do
    // monorepo (não dentro de apps/api), pra ser fácil de achar/copiar/fazer
    // backup. Configurável via env só pra quem quiser apontar pra outro lugar.
    tracksDir: process.env.TRACKS_DIR
        ? path.resolve(process.env.TRACKS_DIR)
        : defaultTracksDir,
}));
