import fs from 'node:fs';

import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    Patch,
    Post,
    Res,
    StreamableFile,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { UnprocessableEntityError } from '../common/errors/unprocessable-entity.error.js';
import { ConfirmImportDto } from './dto/confirm-import.dto.js';
import { UpdateTrackTonalityDto } from './dto/update-track-tonality.dto.js';
import { TracksService } from './tracks.service.js';

const MAX_ZIP_SIZE_BYTES = 500 * 1024 * 1024; // zips de multitrack podem ser grandes

@ApiTags('Tracks')
@Controller('tracks')
export class TracksController {
    constructor(private readonly tracksService: TracksService) {}

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
    updateTonality(@Param('id') id: string, @Body() dto: UpdateTrackTonalityDto) {
        return this.tracksService.updateTonality(id, dto);
    }

    @Delete(':id')
    @HttpCode(204)
    async remove(@Param('id') id: string) {
        await this.tracksService.remove(id);
    }

    @Get(':id/channels/:channelId/audio')
    async getChannelAudio(
        @Param('id') id: string,
        @Param('channelId') channelId: string,
        @Res({ passthrough: true }) response: Response,
    ) {
        const { absolutePath, mimeType } =
            await this.tracksService.getChannelFile(id, channelId);
        response.setHeader('Content-Type', mimeType);
        return new StreamableFile(fs.createReadStream(absolutePath));
    }

    @Post('import')
    @UseInterceptors(
        FileInterceptor('file', { limits: { fileSize: MAX_ZIP_SIZE_BYTES } }),
    )
    async startImport(@UploadedFile() file?: Express.Multer.File) {
        if (!file) {
            throw new UnprocessableEntityError(12, 'Nenhum arquivo enviado.');
        }
        return this.tracksService.startImport(file.originalname, file.buffer);
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
}
