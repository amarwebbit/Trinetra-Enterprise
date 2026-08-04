import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import SettingsUI from './SettingsUI';

export const dynamic = 'force-dynamic';

export default async function TeacherSettingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }

  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { metadata: true }
  });

  const metadata = (user?.metadata as any) || {};

  return (
    <main className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Teacher Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure default values for new questions and exams.
        </p>
      </div>

      <SettingsUI metadata={metadata} />
    </main>
  );
}
