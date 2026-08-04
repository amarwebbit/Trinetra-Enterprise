export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student';

export interface UserSession {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  tenantId: string;
}
