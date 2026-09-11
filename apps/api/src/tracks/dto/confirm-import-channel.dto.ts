import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsOptional,
    IsString,
    IsUUID,
    MinLength,
} from 'class-validator';

export class ConfirmImportChannelDto {
    @ApiProperty()
    @IsUUID()
    tempChannelId: string;

    @ApiProperty()
    @IsString()
    @MinLength(1)
    name: string;

    @ApiProperty({ required: false, default: true })
    @IsOptional()
    @IsBoolean()
    pitchEditable?: boolean;
}
