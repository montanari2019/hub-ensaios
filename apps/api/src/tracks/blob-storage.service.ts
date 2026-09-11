import { del, list, put, copy, type PutBlobResult } from '@vercel/blob';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Fino wrapper sobre o SDK do Vercel Blob só pra centralizar o token (uma
// única leitura via ConfigService, compartilhada entre StagingService e
// TracksService) em vez de cada um ler `blobStorage.readWriteToken` sozinho.
@Injectable()
export class BlobStorageService {
    constructor(private readonly configService: ConfigService) {}

    private get token(): string {
        return this.configService.getOrThrow<string>(
            'blobStorage.readWriteToken',
        );
    }

    async put(pathname: string, body: Buffer, contentType: string): Promise<PutBlobResult> {
        return put(pathname, body, {
            access: 'public',
            contentType,
            token: this.token,
        });
    }

    async copy(fromUrl: string, toPathname: string, contentType: string): Promise<PutBlobResult> {
        return copy(fromUrl, toPathname, {
            access: 'public',
            contentType,
            token: this.token,
        });
    }

    async del(urlOrUrls: string | string[]): Promise<void> {
        await del(urlOrUrls, { token: this.token });
    }

    async listByPrefix(prefix: string): Promise<string[]> {
        const { blobs } = await list({ prefix, token: this.token });
        return blobs.map((blob) => blob.url);
    }
}
