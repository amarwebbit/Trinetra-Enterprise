import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { UserRole } from './user';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      tenantId: string;
      accessToken: string;
      full_name?: string | null;
      mustChangePassword?: boolean;
      temporaryPassword?: boolean;
      tenantName?: string | null;
      tenantLogo?: string | null;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: UserRole;
    tenantId: string;
    accessToken: string;
    full_name?: string | null;
    must_change_password?: boolean;
    temporary_password?: boolean;
    tenantName?: string | null;
    tenantLogo?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole;
    tenantId: string;
    accessToken: string;
    tenantName?: string | null;
    tenantLogo?: string | null;
  }
}
