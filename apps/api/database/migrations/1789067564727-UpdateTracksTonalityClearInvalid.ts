import { MigrationInterface, QueryRunner } from 'typeorm';

// Lista própria, não importada de `src/` — migrations ficam congeladas no
// tempo e não devem depender de código de aplicação que pode mudar depois.
const VALID_NOTES = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
];

export class UpdateTracksTonalityClearInvalid1789067564727
    implements MigrationInterface
{
    name = 'UpdateTracksTonalityClearInvalid1789067564727';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const placeholders = VALID_NOTES.map(() => '?').join(', ');
        await queryRunner.query(
            `UPDATE tracks SET tonality = NULL WHERE tonality IS NOT NULL AND tonality NOT IN (${placeholders})`,
            VALID_NOTES,
        );
    }

    public async down(): Promise<void> {
        // Não reversível — os valores fora do enum já foram descartados.
    }
}
