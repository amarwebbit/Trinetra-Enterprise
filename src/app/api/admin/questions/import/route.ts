import { NextResponse } from 'next/server';
import { getValidatedTenantId } from '@/lib/auth/get-tenant-id';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/options';
import { bulkQueue } from '@/lib/queue/bulk-queue';
import { withRateLimit } from '@/lib/rate-limit-wrapper';
import { bulkLimiter } from '@/lib/redis/rate-limit';
import { ProgressTracker } from '@/lib/queue/progress-tracker';
import { validateQuestionRows } from '@/lib/validators/question-import';

const progressTracker = new ProgressTracker();

async function handler(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId, errorResponse } = await getValidatedTenantId(session);
    if (errorResponse) return errorResponse;
    
    const body = await req.json();
    const { questions, bankId, idempotencyKey } = body;

    if (!bankId) {
      return NextResponse.json({ error: 'Bank ID is required' }, { status: 400 });
    }
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'No valid questions provided' }, { status: 400 });
    }

    const { valid, errors } = validateQuestionRows(questions);
    
    // Prevent duplicate submissions using idempotency key if provided
    const jobId = idempotencyKey ? `import-questions-${tenantId}-${idempotencyKey}` : undefined;

    // Queue the job with progress tracking
    const job = await bulkQueue.add(
      'bulk-operations',
      {
        type: 'questions',
        rows: valid,
        errors: errors,
        bankId,
        tenantId,
        userId: session.user.id,
        email: session.user.email,
        idempotencyKey,
      },
      { jobId }
    );

    // Initialize progress tracking
    await progressTracker.start(job.id as string, valid.length);

    return NextResponse.json(
      { 
        jobId: job.id,
        statusUrl: `/api/admin/questions/import/status/${job.id}`,
        message: `Import queued with ${valid.length} questions. ${errors.length} errors detected.`,
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('Error in bulk question import queue route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export const POST = async (req: Request) => {
  return withRateLimit(req, bulkLimiter, handler, async (request) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error('Unauthorized for rate limiting');
    return session.user.id;
  });
};
