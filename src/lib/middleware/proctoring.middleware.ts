import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db/client';

/**
 * Middleware to enforce exam security for all exam routes
 */
export async function examSecurityMiddleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Only apply to exam-related API routes
  if (!path.includes('/api/student/exams/')) {
    return NextResponse.next();
  }

  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if the request is for an exam route that needs validation
  const examId = request.nextUrl.searchParams.get('examId') || 
                 path.split('/api/student/exams/')[1]?.split('/')[0];

  if (!examId) {
    return NextResponse.next();
  }

  // Validate student has access to this exam via tenant_id
  const exam = await prisma.exams.findFirst({
    where: {
      id: examId,
      tenant_id: (token.tenantId || token.tenant_id) as string,
      is_active: true,
    },
    select: {
      is_active: true,
      start_time: true,
      end_time: true,
    },
  });

  if (!exam) {
    return NextResponse.json(
      { error: 'Exam is not available or unauthorized' },
      { status: 403 }
    );
  }

  const now = new Date();
  if (now < exam.start_time || now > exam.end_time) {
    return NextResponse.json(
      { error: 'Exam is not currently available' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}
