import JSZip from 'jszip';

const AUDIO_EXTENSION_MIME: Record<string, string> = {
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
};

export type ZipImportErrorReason =
    'not-a-zip' | 'invalid-zip' | 'no-audio-files';

export class ZipImportError extends Error {
    reason: ZipImportErrorReason;

    constructor(reason: ZipImportErrorReason, message: string) {
        super(message);
        this.name = 'ZipImportError';
        this.reason = reason;
    }
}

export interface ExtractedZipChannel {
    name: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
}

export function isZipFile(originalName: string): boolean {
    return originalName.toLowerCase().endsWith('.zip');
}

export function deriveChannelName(entryName: string): string {
    const base = entryName.split('/').pop() ?? entryName;
    const dotIndex = base.lastIndexOf('.');
    return dotIndex > 0 ? base.slice(0, dotIndex) : base;
}

function getAudioMimeType(entryName: string): string | null {
    const ext = entryName.split('.').pop()?.toLowerCase();
    if (!ext) return null;
    return AUDIO_EXTENSION_MIME[ext] ?? null;
}

/**
 * Versão server-side do parsing que antes rodava no browser
 * (`apps/web/src/lib/zip.ts`) — mesma whitelist de formato, mesma
 * derivação de nome. Migrou pro backend junto com o resto da
 * persistência; a whitelist de áudio agora vive num lugar só.
 */
export async function extractAudioChannelsFromZip(
    originalName: string,
    buffer: Buffer,
): Promise<ExtractedZipChannel[]> {
    if (!isZipFile(originalName)) {
        throw new ZipImportError(
            'not-a-zip',
            'O arquivo selecionado não é um .zip.',
        );
    }

    let zip: JSZip;
    try {
        zip = await JSZip.loadAsync(buffer);
    } catch {
        throw new ZipImportError(
            'invalid-zip',
            'Não foi possível ler o conteúdo do .zip.',
        );
    }

    const entries = Object.values(zip.files).filter((entry) => !entry.dir);
    const channels: ExtractedZipChannel[] = [];

    for (const entry of entries) {
        const mimeType = getAudioMimeType(entry.name);
        if (!mimeType) continue; // ignora arquivos não-áudio (ex.: readme, imagens)

        const entryBuffer = await entry.async('nodebuffer');
        channels.push({
            name: deriveChannelName(entry.name),
            fileName: entry.name,
            mimeType,
            buffer: entryBuffer,
        });
    }

    if (channels.length === 0) {
        throw new ZipImportError(
            'no-audio-files',
            'Nenhum arquivo de áudio foi encontrado no .zip.',
        );
    }

    return channels;
}
