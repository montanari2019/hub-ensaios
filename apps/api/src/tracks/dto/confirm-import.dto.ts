import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
    MinLength,
    ValidateNested,
} from 'class-validator';

import { ConfirmImportChannelDto } from './confirm-import-channel.dto.js';
import { MusicalNote } from '../musical-note.enum.js';

export class ConfirmImportDto {
    @ApiProperty()
    @IsString()
    @MinLength(1)
    name: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(400)
    bpm?: number;

    @ApiProperty({ required: false, enum: MusicalNote })
    @IsOptional()
    @IsEnum(MusicalNote)
    tonality?: MusicalNote;

    @ApiProperty({ type: [ConfirmImportChannelDto] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ConfirmImportChannelDto)
    channels: ConfirmImportChannelDto[];
}
