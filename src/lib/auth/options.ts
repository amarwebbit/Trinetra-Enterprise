import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db/client';
import bcrypt from 'bcrypt';
import { UserRole } from '@/types/user';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email or Roll Number', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const inputIdentifier = credentials.email.trim();
        const inputPassword = credentials.password.trim();

        // 1. Search for user by Email OR Roll Number
        const user = await prisma.users.findFirst({
          where: {
            OR: [
              { email: { equals: inputIdentifier, mode: 'insensitive' } },
              { roll_number: { equals: inputIdentifier, mode: 'insensitive' } },
            ],
          },
          include: {
            tenants: {
              select: {
                id: true,
                name: true,
                slug: true,
                is_active: true,
              },
            },
          },
        });

        if (!user) return null;
        if (!user.is_active) throw new Error('Account is deactivated');
        if (user.role !== 'super_admin' && !user.tenants?.is_active) {
          throw new Error('Tenant is suspended');
        }

        // 2. Validate Password via bcrypt hash OR Roll Number match
        let passwordMatch = await bcrypt.compare(inputPassword, user.password_hash);
        
        if (!passwordMatch && user.roll_number) {
          const cleanRoll = user.roll_number.trim().toLowerCase();
          const cleanPass = inputPassword.toLowerCase();
          if (cleanRoll === cleanPass) {
            passwordMatch = true;
          }
        }

        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.full_name || user.email,
          role: user.role as UserRole,
          tenantId: user.tenant_id,
          tenantSlug: user.tenants?.slug,
          accessToken: 'none',
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
        token.tenantSlug = (user as any).tenantSlug;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).tenantId = token.tenantId as string;
        (session.user as any).tenantSlug = token.tenantSlug as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'secret',
};
