import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db/client';
import bcrypt from 'bcrypt';
import { UserRole } from '@/types/user';

// ============================================
// CRITICAL: Validate environment variables on startup
// ============================================
function validateEnvVariables() {
  // Auto-fallback NEXTAUTH_SECRET to JWT_SECRET if present
  if (!process.env.NEXTAUTH_SECRET && process.env.JWT_SECRET) {
    process.env.NEXTAUTH_SECRET = process.env.JWT_SECRET;
  }
  if (!process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  }

  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || process.env.npm_lifecycle_event === 'build';

  const required = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ];
  
  const missing: string[] = [];
  
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    const errorMsg = `\n❌ Missing required environment variables: ${missing.join(', ')}\n` +
      `Please set these in your .env file or environment configuration.\n` +
      `\nExample .env file:\n` +
      `NEXTAUTH_SECRET=your-super-secret-key-at-least-32-characters-long\n` +
      `NEXTAUTH_URL=http://localhost:3000\n`;

    if (isBuildPhase) {
      console.warn(`⚠️ [Build Warning] ${errorMsg}`);
      return;
    }

    throw new Error(errorMsg);
  }
  
  // Validate secret strength
  const secret = process.env.NEXTAUTH_SECRET!;
  if (secret.length < 32) {
    const errorMsg = `\n❌ NEXTAUTH_SECRET must be at least 32 characters long for security.\n` +
      `Current length: ${secret.length} characters.\n` +
      `Generate a secure secret using: openssl rand -base64 32\n`;
    if (process.env.NODE_ENV === 'production' && !isBuildPhase) {
      throw new Error(errorMsg);
    } else {
      console.warn(`⚠️ Warning: ${errorMsg}`);
    }
  }
  
  // Check for default/weak values in production
  if (process.env.NODE_ENV === 'production' && !isBuildPhase) {
    const weakSecrets = ['secret', 'password', '123456', 'change-me', 'your-super-secret-key'];
    if (weakSecrets.some(w => secret.toLowerCase().includes(w))) {
      throw new Error(
        `\n❌ NEXTAUTH_SECRET appears to be using a weak/default value in production!\n` +
        `Please generate a strong, random secret.\n`
      );
    }
  }
  
  console.log('✅ NextAuth environment variables validated successfully');
}

// Run validation on module load
validateEnvVariables();

const useSecure = process.env.NODE_ENV === 'production' && !!process.env.NEXTAUTH_URL?.startsWith('https');

// ============================================
// NextAuth Configuration
// ============================================
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email or Roll Number', type: 'text', placeholder: 'your@email.com or Roll Number' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email or roll number and password are required');
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

        if (!user) {
          return null;
        }

        if (!user.is_active) {
          throw new Error('Account is deactivated. Please contact support.');
        }

        if (user.role !== 'super_admin' && !user.tenants?.is_active) {
          throw new Error('Tenant organization is currently suspended.');
        }

        // ============================================
        // Password Validation:
        // 1. Check standard bcrypt password hash comparison
        // 2. Fallback to case-insensitive roll number comparison for initial first-time logins
        // ============================================
        let isPasswordValid = await bcrypt.compare(inputPassword, user.password_hash);

        if (!isPasswordValid && user.roll_number) {
          const cleanRoll = user.roll_number.trim().toLowerCase();
          const cleanPass = inputPassword.trim().toLowerCase();
          
          if (cleanRoll === cleanPass) {
            isPasswordValid = true;
          } else {
            // Also attempt comparison with lowercased password string
            isPasswordValid = await bcrypt.compare(cleanPass, user.password_hash);
          }
        }

        if (!isPasswordValid) {
          return null;
        }

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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
        token.tenantSlug = (user as any).tenantSlug;
      }
      if (trigger === 'update' && session?.user) {
        token.role = session.user.role;
        token.name = session.user.name;
        token.tenantId = session.user.tenantId;
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
  useSecureCookies: useSecure,
  cookies: {
    sessionToken: {
      name: useSecure ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecure,
      },
    },
  },
};
