import {
    del,
    list,
    put,
    copy,
    issueSignedToken,
    presignUrl,
    type PutBlobResult,
    type IssuedSignedToken,
} from '@vercel/blob';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const SIGNED_URL_VALIDITY_MS = 60 * 60 * 1000; // 1h — reemitida a cada GET /tracks*
const DELEGATION_REFRESH_MARGIN_MS = 5 * 60 * 1000;

// Fino wrapper sobre o SDK do Vercel Blob só pra centralizar o token (uma
// única leitura via ConfigService, compartilhada entre StagingService e
// TracksService) em vez de cada um ler `blobStorage.readWriteToken` sozinho.
//
// O store é privado (não existe mais opção pública no plano/conta atual),
// então nada aqui é acessível por URL crua — leitura de áudio passa por
// `getSignedGetUrl`, que assina uma URL temporária por pathname.
@Injectable()
export class BlobStorageService {
    private delegation: IssuedSignedToken | null = null;

    constructor(private readonly configService: ConfigService) {}

    private get token(): string {
        return this.configService.getOrThrow<string>(
            'blobStorage.readWriteToken',
        );
    }

    async put(pathname: string, body: Buffer, contentType: string): Promise<PutBlobResult> {
        return put(pathname, body, {
            access: 'private',
            contentType,
            token: this.token,
        });
    }

    async copy(fromUrl: string, toPathname: string, contentType: string): Promise<PutBlobResult> {
        return copy(fromUrl, toPathname, {
            access: 'private',
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

    /** Baixa o conteúdo de um blob privado (ex.: o .zip recém-enviado), autenticado com o token. */
    async fetchPrivateBlob(url: string): Promise<Buffer> {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${this.token}` },
        });
        if (!response.ok) {
            throw new Error(
                `Falha ao ler blob privado (${response.status}): ${url}`,
            );
        }
        return Buffer.from(await response.arrayBuffer());
    }

    /**
     * URL assinada e temporária pra ler um blob privado direto (sem passar
     * pela função). O delegation token (escopo `*`, só `get`) é cacheado na
     * instância do serviço e reaproveitado entre invocações "quentes" da
     * função — só reemite quando está perto de expirar, pra não bater na
     * control API a cada requisição.
     */
    async getSignedGetUrl(pathname: string): Promise<string> {
        const delegation = await this.getDelegation();
        const { presignedUrl } = await presignUrl(delegation, {
            operation: 'get',
            pathname,
            access: 'private',
            validUntil: Date.now() + SIGNED_URL_VALIDITY_MS,
        });
        return presignedUrl;
    }

    private async getDelegation(): Promise<IssuedSignedToken> {
        const now = Date.now();
        if (
            this.delegation &&
            this.delegation.validUntil - now > DELEGATION_REFRESH_MARGIN_MS
        ) {
            return this.delegation;
        }

        this.delegation = await issueSignedToken({
            pathname: '*',
            operations: ['get'],
            validUntil: now + SIGNED_URL_VALIDITY_MS,
            token: this.token,
        });
        return this.delegation;
    }
}
