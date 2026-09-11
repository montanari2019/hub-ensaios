import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, MinLength } from 'class-validator';

export class StartImportDto {
    @ApiProperty({ description: 'URL do .zip já enviado ao Vercel Blob.' })
    @IsUrl()
    blobUrl: string;

    @ApiProperty({ description: 'Nome original do arquivo .zip selecionado.' })
    @IsString()
    @MinLength(1)
    originalName: string;
}
