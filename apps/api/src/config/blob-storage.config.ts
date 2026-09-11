import { registerAs } from '@nestjs/config';

export default registerAs('blobStorage', () => ({
    // Token de leitura/escrita do Vercel Blob store (produção ou o store de
    // dev/preview, dependendo do ambiente) — sem valor padrão de propósito:
    // sem ele o app não sobe, já que não existe mais fallback em disco.
    readWriteToken: process.env.BLOB_READ_WRITE_TOKEN,
}));
