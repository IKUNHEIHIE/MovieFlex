import type { Prisma, PrismaClient } from '@prisma/client';
import { splitMetadataValues } from './metadata-normalization';

type MovieMetadataClient = Pick<PrismaClient, 'movieArea' | 'movieLanguage'>;

export async function replaceMovieMetadataRelations(
  prisma: MovieMetadataClient,
  movieId: number,
  area: string | null | undefined,
  language: string | null | undefined,
) {
  await prisma.movieArea.deleteMany({ where: { movieId } });
  await prisma.movieLanguage.deleteMany({ where: { movieId } });

  const areas = splitMetadataValues(area);
  const languages = splitMetadataValues(language);

  if (areas.length) await prisma.movieArea.createMany({ data: areas.map((area) => ({ movieId, area })) });
  if (languages.length) await prisma.movieLanguage.createMany({ data: languages.map((language) => ({ movieId, language })) });
}
