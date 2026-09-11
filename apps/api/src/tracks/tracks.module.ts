import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Channel } from './entities/channel.entity.js';
import { Track } from './entities/track.entity.js';
import { StagingService } from './staging.service.js';
import { TracksController } from './tracks.controller.js';
import { TracksService } from './tracks.service.js';

@Module({
    imports: [TypeOrmModule.forFeature([Track, Channel])],
    controllers: [TracksController],
    providers: [TracksService, StagingService],
})
export class TracksModule {}
