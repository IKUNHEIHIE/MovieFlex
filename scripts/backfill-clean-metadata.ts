import 'dotenv/config';
import prisma from '../src/lib/prisma';
import { normalizeMetadataValue } from '../src/lib/metadata-normalization';

const BATCH_SIZE = 500;

async function main() {
  let lastId = 0;
  let updated = 0;

  while (true) {
    const movies = await prisma.movie.findMany({
      where: { id: { gt: lastId } },
      select: { id: true, area: true, language: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
    });
    if (!movies.length) break;

    await prisma.$transaction(movies.map((movie) => prisma.movie.update({
      where: { id: movie.id },
      data: {
        areaClean: normalizeMetadataValue(movie.area),
        languageClean: normalizeMetadataValue(movie.language),
      },
    })));

    updated += movies.length;
    lastId = movies.at(-1)!.id;
    console.log(`Updated ${updated} movies`);
  }

  console.log(`Finished backfilling ${updated} movies.`);
}

main()
  .catch((error) => {
    console.error('Metadata backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
