import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  
  if (session?.user) {
    const role = (session.user as any).role;
    const redirectMap: Record<string, string> = {
      super_admin: '/super',
      admin: '/admin',
      teacher: '/teacher',
      student: '/student',
    };
    const targetUrl = redirectMap[role] || '/';
    console.log('🏠 Home page → Redirecting to:', targetUrl);
    redirect(targetUrl);
  }
  
  console.log('🏠 Home page → No session, redirecting to login');
  redirect('/login');
}
