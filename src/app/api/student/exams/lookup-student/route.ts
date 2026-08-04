import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');
    const identifier = searchParams.get('identifier')?.trim();

    if (!tenantId || !identifier || identifier.length < 2) {
      return NextResponse.json({ found: false });
    }

    const student = await prisma.users.findFirst({
      where: {
        tenant_id: tenantId,
        role: 'student',
        OR: [
          { roll_number: { equals: identifier, mode: 'insensitive' } },
          { email: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });

    if (!student) {
      return NextResponse.json({ found: false });
    }

    const meta = (student.metadata as any) || {};

    return NextResponse.json({
      found: true,
      student: {
        fullName: student.full_name,
        email: student.email,
        rollNumber: student.roll_number || '',
        branch: meta.branch || meta.department || 'CSE',
        section: meta.section || '3A',
      }
    });
  } catch (error) {
    console.error('Lookup student error:', error);
    return NextResponse.json({ found: false });
  }
}
