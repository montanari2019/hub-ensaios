import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { MusicalNote } from '../musical-note.enum.js';

export class UpdateTrackTonalityDto {
    @ApiProperty({ enum: MusicalNote })
    @IsEnum(MusicalNote)
    tonality: MusicalNote;
}
