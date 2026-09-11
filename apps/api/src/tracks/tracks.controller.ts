import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    HttpCode,
    Param,
    Patch,
    Post,
    Req,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { ConfirmImportDto } from './dto/confirm-import.dto.js';
import { StartImportDto } from './dto/start-import.dto.js';
import { UpdateTrackTonalityDto } from './dto/update-track-tonality.dto.js';
import { TracksService } from './tracks.service.js';

@ApiTags('Tracks')
@Controller('tracks')
export class TracksController {
    constructor(
        private readonly tracksService: TracksService,
        private readonly configService: ConfigService,
    ) {}

    @Get()
    findAll() {
        return this.tracksService.findAll();
    }

    // Precisa vir ANTES de `@Get(':id')` — senão "import" seria interpretado
    // como um :id (rotas são casadas na ordem de declaração).
    @Get('import/:importId')
    getImportPreview(@Param('importId') importId: string) {
        return this.tracksService.getImportPreview(importId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.tracksService.findById(id);
    }

    @Patch(':id/tonality')
    updateTonality(
        @Param('id') id: string,
        @Body() dto: UpdateTrackTonalityDto,
    ) {
        return this.tracksService.updateTonality(id, dto);
    }

    @Delete(':id')
    @HttpCode(204)
    async remove(@Param('id') id: string) {
        await this.tracksService.remove(id);
    }

    // Handshake do @vercel/blob/client: o frontend chama isso antes de subir
    // o .zip direto pro Blob, contornando o limite de tamanho de body das
    // funções serverless da Vercel (ver design.md).
    @Post('import/authorize')
    @HttpCode(200)
    async authorizeImportUpload(
        @Body() body: HandleUploadBody,
        @Req() request: Request,
    ) {
        return handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname) => ({
                pathname,
                allowedContentTypes: [
                    'application/zip',
                    'application/x-zip-compressed',
                    'application/octet-stream',
                ],
                addRandomSuffix: true,
            }),
            onUploadCompleted: async () => {
                // Nada a fazer aqui — o frontend chama POST /tracks/import
                // com a blobUrl assim que o upload termina; não dependemos
                // deste callback pra seguir o fluxo.
            },
        });
    }

    @Post('import')
    startImport(@Body() dto: StartImportDto) {
        return this.tracksService.startImport(dto.blobUrl, dto.originalName);
    }

    @Post('import/:importId/confirm')
    confirmImport(
        @Param('importId') importId: string,
        @Body() dto: ConfirmImportDto,
    ) {
        return this.tracksService.confirmImport(importId, dto);
    }

    @Post('import/:importId/cancel')
    @HttpCode(204)
    async cancelImport(@Param('importId') importId: string) {
        await this.tracksService.cancelImport(importId);
    }

    // Chamado pelo Vercel Cron (ver apps/api/vercel.json) — não existe mais
    // um "boot" de processo único pra rodar a varredura de staging órfão
    // como antes (OnModuleInit), então isso vira um endpoint agendado. Cron
    // Jobs da Vercel só disparam GET e anexam automaticamente
    // `Authorization: Bearer $CRON_SECRET` quando essa env var está
    // configurada no projeto — é essa convenção que validamos aqui, não um
    // header customizado.
    @Get('internal/sweep-staging')
    @HttpCode(204)
    async sweepStaging(@Headers('authorization') authorization?: string) {
        const expected = this.configService.get<string>('CRON_SECRET');
        if (!expected) {
            throw new BadRequestException('CRON_SECRET não configurado.');
        }
        if (authorization !== `Bearer ${expected}`) {
            throw new UnauthorizedException();
        }
        await this.tracksService.sweepStaging();
    }
}
