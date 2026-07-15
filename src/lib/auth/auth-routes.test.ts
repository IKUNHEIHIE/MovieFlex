import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const loginPage = readFileSync(join(root, 'src/app/login/page.tsx'), 'utf8');
const registerRoute = readFileSync(join(root, 'src/app/api/auth/register/route.ts'), 'utf8');
const userLayout = readFileSync(join(root, 'src/app/user/layout.tsx'), 'utf8');
const authLib = readFileSync(join(root, 'src/lib/auth/auth.ts'), 'utf8');
const callbackUrl = readFileSync(join(root, 'src/lib/auth/callback-url.ts'), 'utf8');

describe('authentication and user route closure', () => {
  describe('login page callback URL validation', () => {
    it('keeps page exports compatible with the Next.js page contract', () => {
      expect(loginPage).not.toContain('export function safeCallbackUrl');
    });

    it('validates callback URL to prevent open redirects', () => {
      expect(callbackUrl).toContain("value?.startsWith('/')");
      expect(callbackUrl).toContain("!value.startsWith('//')");
      expect(callbackUrl).toContain("? value : '/'");
    });

    it('uses safeCallbackUrl for post-login navigation', () => {
      expect(loginPage).toContain('safeCallbackUrl(');
      expect(loginPage).toContain('window.location.assign');
    });
  });

  describe('registration route', () => {
    it('always creates USER role accounts', () => {
      expect(registerRoute).toContain("role: 'USER'");
    });

    it('validates required fields', () => {
      expect(registerRoute).toContain('!username || !email || !password');
      expect(registerRoute).toContain("'请填写所有必填字段'");
    });

    it('enforces minimum password length', () => {
      expect(registerRoute).toContain('password.length < 6');
      expect(registerRoute).toContain("'密码至少6位'");
    });

    it('checks for duplicate users', () => {
      expect(registerRoute).toContain('prisma.user.findFirst');
      expect(registerRoute).toContain("'用户名或邮箱已被占用'");
    });

    it('hashes passwords before storage', () => {
      expect(registerRoute).toContain('bcrypt.hash');
    });
  });

  describe('user layout protection', () => {
    it('redirects unauthenticated users to login', () => {
      expect(userLayout).toContain("if (!session?.user)");
      expect(userLayout).toContain("redirect('/login?callbackUrl=%2Fuser%2Fprofile')");
    });

    it('imports auth function', () => {
      expect(userLayout).toContain("import { auth } from '@/lib/auth/auth'");
    });

    it('returns children for authenticated users', () => {
      expect(userLayout).toContain('return children');
    });
  });

  describe('auth library configuration', () => {
    it('configures NextAuth with credentials provider', () => {
      expect(authLib).toContain("import NextAuth from 'next-auth'");
      expect(authLib).toContain("import Credentials from 'next-auth/providers/credentials'");
    });

    it('validates user credentials', () => {
      expect(authLib).toContain('bcrypt.compare');
      expect(authLib).toContain('prisma.user.findUnique');
    });

    it('includes JWT and session callbacks', () => {
      expect(authLib).toContain('async jwt');
      expect(authLib).toContain('async session');
    });

    it('configures custom sign-in page', () => {
      expect(authLib).toContain("signIn: '/login'");
    });

    it('uses JWT session strategy', () => {
      expect(authLib).toContain("session: { strategy: 'jwt' }");
    });
  });
});
