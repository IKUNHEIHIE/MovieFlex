import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=%2Fuser%2Fprofile');
  return children;
}
