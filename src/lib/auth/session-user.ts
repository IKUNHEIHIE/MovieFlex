import { auth } from './auth';

interface SessionUser {
  id?: number;
  username?: string;
  email?: string;
  role?: string;
}

export async function getSessionUser(): Promise<SessionUser | undefined> {
  const session = await auth();
  return session?.user as SessionUser | undefined;
}

export async function getValidSessionUserId(): Promise<number | undefined> {
  const user = await getSessionUser();
  return typeof user?.id === 'number' && user.id > 0 ? user.id : undefined;
}
