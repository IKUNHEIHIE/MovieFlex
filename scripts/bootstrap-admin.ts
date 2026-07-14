#!/usr/bin/env npx tsx
/**
 * MovieFlex deployment-time admin bootstrap.
 *
 * Usage:
 *   npx tsx scripts/bootstrap-admin.ts <username> <email> <password>
 *
 * Notes:
 * - Public registration always creates USER accounts.
 * - This script is deployment-only and creates/updates a single ADMIN.
 * - If the user already exists, they are promoted to ADMIN and their password is updated.
 *
 * Required env: DATABASE_URL
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function usageAndExit() {
  console.error('Usage: npx tsx scripts/bootstrap-admin.ts <username> <email> <password>');
  process.exit(2);
}

async function main() {
  const [, username, email, password] = process.argv;
  if (!username || !email || !password) usageAndExit();
  if (password.length < 6) {
    console.error('Error: password must be at least 6 characters.');
    process.exit(2);
  }

  const hashed = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'ADMIN', password: hashed },
    });
    console.log(`Admin ${email} updated successfully.`);
    return;
  }

  await prisma.user.create({
    data: { username, email, password: hashed, role: 'ADMIN' },
  });
  console.log(`Admin ${email} created successfully.`);
}

main()
  .catch((error) => {
    console.error('Bootstrap failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
