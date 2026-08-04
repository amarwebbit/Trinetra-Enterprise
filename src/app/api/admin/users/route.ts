import { NextResponse } from 'next/server';
import { getValidatedTenantId } from '@/lib/auth/get-tenant-id';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const { tenantId, errorResponse } = await getValidatedTenantId(session);
    if (errorResponse) return errorResponse;

    const where: any = {
      tenant_id: tenantId
    };

    if (role && role !== 'all') {
      where.role = role;
    }

    if (status && status !== 'all') {
      where.is_active = status === 'active';
    }

    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.users.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100,
      include: {
        departments_users_department_idTodepartments: true
      }
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId, errorResponse } = await getValidatedTenantId(session);
    if (errorResponse) return errorResponse;
    const body = await req.json();
    const { name, email, role, departmentId } = body;

    const passwordHash = await bcrypt.hash('ExaminAI@123', 10);

    const user = await prisma.users.create({
      data: {
        tenant_id: tenantId,
        email,
        full_name: name,
        role: role || 'student',
        password_hash: passwordHash,
        department_id: departmentId || null,
        is_active: true,
        email_verified: true
      }
    });

    await prisma.audit_logs.create({
      data: {
        tenant_id: tenantId,
        user_id: session.user.id,
        action: `Created user account: ${name} (${role})`,
        resource_type: 'user_management',
        resource_id: user.id
      }
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, role, is_active } = body;

    const updatedUser = await prisma.users.update({
      where: { id },
      data: {
        full_name: name,
        role,
        is_active
      }
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
