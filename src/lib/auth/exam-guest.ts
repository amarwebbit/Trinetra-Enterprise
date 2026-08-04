import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

export const EXAM_GUEST_COOKIE = 'exam_guest_access';
export type ExamGuest = { studentId: string; tenantId: string; examId: string; attemptId: string; scope: 'exam_guest' };
export function createExamGuestToken(payload: Omit<ExamGuest, 'scope'>) { return jwt.sign({ ...payload, scope: 'exam_guest' }, process.env.NEXTAUTH_SECRET || 'secret', { expiresIn: '8h' }); }
export async function getExamGuest(): Promise<ExamGuest | null> {
  const token = (await cookies()).get(EXAM_GUEST_COOKIE)?.value;
  if (!token) return null;
  try { const guest = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'secret') as ExamGuest; return guest.scope === 'exam_guest' ? guest : null; } catch { return null; }
}

export async function getExamActor() {
  const session = await getServerSession(authOptions);
  if (session && ['student', 'admin', 'super_admin'].includes(session.user.role)) return { studentId: session.user.id, tenantId: session.user.tenantId || (session.user as any).tenant_id, guest: null as ExamGuest | null };
  const guest = await getExamGuest();
  return guest ? { studentId: guest.studentId, tenantId: guest.tenantId, guest } : null;
}
