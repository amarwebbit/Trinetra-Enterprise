import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import UsersUI from './UsersUI';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage(
  props: {
    searchParams: Promise<{ 
      page?: string; 
      role?: string; 
      department?: string; 
      status?: string;
      search?: string;
    }>
  }
) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  if (!tenantId) {
    throw new Error("No tenant ID found in session.");
  }

  const page = parseInt(searchParams.page || '1');
  const pageSize = 20;

  // Build where clause
  const where: Prisma.usersWhereInput = { tenant_id: tenantId };

  if (searchParams.role && searchParams.role !== 'all') {
    where.role = searchParams.role;
  }
  if (searchParams.department && searchParams.department !== 'all') {
    where.department_id = searchParams.department;
  }
  if (searchParams.status === 'active') {
    where.is_active = true;
  }
  if (searchParams.status === 'inactive') {
    where.is_active = false;
  }
  if (searchParams.search) {
    where.OR = [
      { full_name: { contains: searchParams.search, mode: 'insensitive' } },
      { email: { contains: searchParams.search, mode: 'insensitive' } },
      { roll_number: { contains: searchParams.search, mode: 'insensitive' } },
    ];
  }

  // Fetch data in parallel
  const [dbUsers, total, dbDepartments] = await Promise.all([
    prisma.users.findMany({
      where,
      include: { departments_users_department_idTodepartments: true },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.users.count({ where }),
    prisma.departments.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: { name: 'asc' }
    }),
  ]);

  // Safely map the returned data for the client UI (including roll_number)
  const mappedUsers = dbUsers.map(u => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    roll_number: u.roll_number,
    is_active: u.is_active,
    department: u.departments_users_department_idTodepartments ? {
      id: u.departments_users_department_idTodepartments.id,
      name: u.departments_users_department_idTodepartments.name
    } : null,
    created_at: u.created_at?.toISOString() || new Date().toISOString()
  }));

  const mappedDepartments = dbDepartments.map(d => ({
    id: d.id,
    name: d.name
  }));

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          User Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage teachers, students, and their permissions.
        </p>
      </div>

      <UsersUI 
        users={mappedUsers}
        total={total}
        page={page}
        pageSize={pageSize}
        departments={mappedDepartments}
        filters={searchParams}
      />
    </main>
  );
}
