import { parseBuffer } from 'music-metadata';

export async function getAudioDurationSeconds(
    buffer: Buffer,
    mimeType: string,
): Promise<number> {
    const metadata = await parseBuffer(buffer, mimeType);
    return metadata.format.duration ?? 0;
}
