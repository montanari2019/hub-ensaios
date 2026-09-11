import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlobStorageService } from './blob-storage.service.js';
import { Channel } from './entities/channel.entity.js';
import { StagingImport } from './entities/staging-import.entity.js';
import { Track } from './entities/track.entity.js';
import { StagingService } from './staging.service.js';
import { TracksController } from './tracks.controller.js';
import { TracksService } from './tracks.service.js';

@Module({
    imports: [TypeOrmModule.forFeature([Track, Channel, StagingImport])],
    controllers: [TracksController],
    providers: [TracksService, StagingService, BlobStorageService],
})
export class TracksModule {}
