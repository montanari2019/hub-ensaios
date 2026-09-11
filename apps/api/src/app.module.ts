import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import databaseConfig from './config/database.config.js';
import tracksStorageConfig from './config/tracks-storage.config.js';
import { TracksModule } from './tracks/tracks.module.js';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig, tracksStorageConfig],
        }),
        TypeOrmModule.forRootAsync({
            useFactory: () => databaseConfig(),
        }),
        TracksModule,
    ],
})
export class AppModule {}
