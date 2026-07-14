import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';

type AppUser = { id?: number; role?: string; username?: string };

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) return null;

        return {
          id: String(user.id),
          name: user.username,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = Number(user.id);
        token.role = (user as { role?: string }).role;
        token.username = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const appUser = session.user as unknown as AppUser;
        appUser.id = Number(token.id);
        appUser.role = typeof token.role === 'string' ? token.role : undefined;
        appUser.username = typeof token.username === 'string' ? token.username : undefined;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // 服务端验证 callbackUrl，仅允许站内相对路径
      if (url.startsWith('/')) {
        // 防止协议相对 URL（//evil.com）
        if (url.startsWith('//')) {
          return baseUrl;
        }
        return `${baseUrl}${url}`;
      }
      // 允许 baseUrl 开头的 URL
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // 拒绝所有其他 URL
      return baseUrl;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
});
