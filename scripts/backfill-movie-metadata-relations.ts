import 'dotenv/config';
import prisma from '../src/lib/prisma';
import { splitMetadataValues } from '../src/lib/metadata-normalization';

const BATCH_SIZE = 500;

async function main() {
  let processed = 0;
  while (true) {
    const movies = await prisma.movie.findMany({
      where: {
        OR: [
          { area: { not: null }, areas: { none: {} } },
          { language: { not: null }, languages: { none: {} } },
        ],
      },
      select: { id: true, area: true, language: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
    });
    if (!movies.length) break;
    const areas = movies.flatMap((movie) => splitMetadataValues(movie.area).map((area) => ({ movieId: movie.id, area })));
    const languages = movies.flatMap((movie) => splitMetadataValues(movie.language).map((language) => ({ movieId: movie.id, language })));
    await prisma.$transaction([
      prisma.movieArea.createMany({ data: areas, skipDuplicates: true }),
      prisma.movieLanguage.createMany({ data: languages, skipDuplicates: true }),
    ]);
    processed += movies.length;
    console.log(`Processed ${processed} movies`);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
