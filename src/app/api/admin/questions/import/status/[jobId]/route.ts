import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { ProgressTracker } from '@/lib/queue/progress-tracker';

const progressTracker = new ProgressTracker();

export async function GET(req: Request, props: { params: Promise<{ jobId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const progress = await progressTracker.get(params.jobId);

  if (!progress) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({
    jobId: params.jobId,
    status: progress.status,
    total: progress.total,
    processed: progress.processed,
    success: progress.success,
    failed: progress.failed,
    percentage: progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0,
    errors: progress.errors.slice(0, 500),
    startedAt: progress.startedAt,
    completedAt: progress.completedAt,
  });
}
