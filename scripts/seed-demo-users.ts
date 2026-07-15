import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import prisma from '../src/lib/prisma';

const USER_COUNT = 100;
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(items: T[], count: number) => [...items].sort(() => Math.random() - 0.5).slice(0, Math.min(count, items.length));

async function main() {
  const movies = await prisma.movie.findMany({ select: { id: true }, take: 5000 });
  if (movies.length < 50) throw new Error('影片库少于 50 部，无法生成可信的演示行为数据。');
  const credentials: string[] = ['username,email,password,favorites,history'];
  for (let index = 1; index <= USER_COUNT; index += 1) {
    const suffix = String(index).padStart(3, '0'); const username = `demo_${suffix}`; const email = `demo_${suffix}@demo.movieflex.local`; const password = randomBytes(9).toString('base64url');
    const favoriteMovies = pick(movies, randomInt(4, 15)); const historyMovies = pick(movies, randomInt(8, 40));
    let user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      user = await prisma.user.create({ data: { username, email, password: await bcrypt.hash(password, 12), role: 'USER' } });
      credentials.push(`${username},${email},${password},${favoriteMovies.length},${historyMovies.length}`);
    }
    await prisma.userFavorite.createMany({ data: favoriteMovies.map((movie) => ({ userId: user.id, movieId: movie.id })), skipDuplicates: true });
    for (const movie of historyMovies) await prisma.watchHistory.upsert({ where: { uk_user_movie_ep: { userId: user.id, movieId: movie.id, episode: '正片' } }, create: { userId: user.id, movieId: movie.id, episode: '正片', watchDuration: randomInt(60, 7200), totalDuration: 7200, progress: randomInt(5, 100), lastWatchedAt: new Date(Date.now() - randomInt(0, 30) * 86_400_000) }, update: {} });
  }
  writeFileSync('demo-users.csv', `${credentials.join('\n')}\n`, 'utf8');
  console.log('Demo users are ready. New-account credentials were saved to demo-users.csv.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
