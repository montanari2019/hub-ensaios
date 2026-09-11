import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import blobStorageConfig from './config/blob-storage.config.js';
import databaseConfig from './config/database.config.js';
import { TracksModule } from './tracks/tracks.module.js';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig, blobStorageConfig],
        }),
        TypeOrmModule.forRootAsync({
            useFactory: () => databaseConfig(),
        }),
        TracksModule,
    ],
})
export class AppModule {}
