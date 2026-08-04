'use server';

import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';

const userSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["student", "teacher", "admin"]),
  department_id: z.string().uuid().optional().nullable(),
  roll_number: z.string().optional().nullable(),
});

function generatePassword() {
  return crypto.randomBytes(8).toString('hex');
}

export async function createUser(data: z.infer<typeof userSchema>) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  const validatedData = userSchema.parse(data);

  // Check if email exists in this tenant
  const existingUser = await prisma.users.findUnique({
    where: {
      tenant_id_email: {
        tenant_id: tenantId,
        email: validatedData.email
      }
    }
  });

  if (existingUser) {
    throw new Error("User with this email already exists in this tenant");
  }

  const rawPassword = (validatedData.role === 'student' && validatedData.roll_number) 
    ? validatedData.roll_number 
    : generatePassword();
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const user = await prisma.users.create({
    data: {
      tenant_id: tenantId,
      full_name: validatedData.full_name,
      email: validatedData.email,
      role: validatedData.role,
      department_id: validatedData.department_id,
      roll_number: validatedData.roll_number || null,
      password_hash: passwordHash,
      is_active: true
    }
  });

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'USER_CREATED',
      resource_type: 'users',
      resource_id: user.id,
      new_values: { email: user.email, role: user.role }
    }
  });

  revalidatePath('/admin/users');
  return { success: true, userId: user.id, temporaryPassword: rawPassword }; // In real app, we'd email this
}

export async function updateUser(userId: string, data: Partial<z.infer<typeof userSchema>>) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;

  const updateData: any = {};
  if (data.full_name) updateData.full_name = data.full_name;
  if (data.role) updateData.role = data.role;
  if (data.department_id !== undefined) updateData.department_id = data.department_id;
  if (data.roll_number !== undefined) updateData.roll_number = data.roll_number || null;

  const user = await prisma.users.update({
    where: { id: userId, tenant_id: tenantId },
    data: updateData
  });

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'USER_UPDATED',
      resource_type: 'users',
      resource_id: user.id,
    }
  });

  revalidatePath('/admin/users');
  return { success: true };
}

export async function toggleUserStatus(userId: string, activate: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;

  if (userId === session.user.id) {
    throw new Error("You cannot change your own active status");
  }

  const user = await prisma.users.update({
    where: { id: userId, tenant_id: tenantId },
    data: { is_active: activate }
  });

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: activate ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      resource_type: 'users',
      resource_id: user.id,
    }
  });

  revalidatePath('/admin/users');
  return { success: true };
}

export async function resetPassword(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;

  const rawPassword = generatePassword();
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const user = await prisma.users.update({
    where: { id: userId, tenant_id: tenantId },
    data: { password_hash: passwordHash }
  });

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'USER_PASSWORD_RESET',
      resource_type: 'users',
      resource_id: user.id,
    }
  });

  revalidatePath('/admin/users');
  // Return plain password strictly for testing UI; in production this must trigger an email.
  return { success: true, userId: user.id, temporaryPassword: rawPassword };
}

export async function bulkImportUsers(users: z.infer<typeof userSchema>[]) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;

  // Sync execution
  let successCount = 0;
  let errors = [];

  for (const row of users) {
    try {
      const validated = userSchema.parse(row);
      const exists = await prisma.users.findUnique({
        where: { tenant_id_email: { tenant_id: tenantId, email: validated.email } }
      });
      if (!exists) {
        const hash = await bcrypt.hash(generatePassword(), 10);
        await prisma.users.create({
          data: {
            tenant_id: tenantId,
            full_name: validated.full_name,
            email: validated.email,
            role: validated.role,
            department_id: validated.department_id || null,
            password_hash: hash,
            is_active: true
          }
        });
        successCount++;
      } else {
        errors.push(`Email ${validated.email} already exists`);
      }
    } catch (e: any) {
      errors.push(`Row ${row.email}: ${e.message}`);
    }
  }

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'USER_BULK_IMPORT',
      resource_type: 'users',
      metadata: { successCount, errors }
    }
  });

  revalidatePath('/admin/users');
  return { success: true, successCount, errors };
}

// Optionally connect to BullMQ if bulk queue exists
export async function bulkImportUsersQueued(users: z.infer<typeof userSchema>[]) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;

  try {
    // Attempt dynamic import of the queue just in case it doesn't exist to prevent hard crashes
    const { bulkQueue } = await import('@/lib/queue/bulk-queue');
    await bulkQueue.add('import-users', {
      tenantId,
      adminId: session.user.id,
      users
    });
    return { success: true, message: 'Import queued successfully' };
  } catch (e) {
    console.warn("BullMQ not found, falling back to sync process");
    return bulkImportUsers(users); // Fallback
  }
}

export async function getUserPassword(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { password_hash: true },
  });

  return { passwordHash: user?.password_hash };
}
