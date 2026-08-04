import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';
import bcrypt from 'bcryptjs';

// Password validation function
function validatePassword(password: string): { valid: boolean; message: string } {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password);

  if (password.length < minLength) {
    return { valid: false, message: `Password must be at least ${minLength} characters long` };
  }
  if (!hasUpperCase) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!hasLowerCase) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!hasNumber) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!hasSpecialChar) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*)' };
  }

  return { valid: true, message: 'Password is valid' };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const tenantId = session.user.tenantId || (session.user as any).tenant_id;

    const { currentPassword, newPassword, confirmPassword } = await request.json();

    // Validate input presence
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New passwords do not match' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Check if new password was used before (prevent reuse of last 3 passwords)
    const userMetadata = (user.metadata as any) || {};
    const previousPasswords: string[] = userMetadata.previous_passwords || [];

    // Check against active password hash
    const isSameAsCurrent = await bcrypt.compare(newPassword, user.password_hash);
    if (isSameAsCurrent) {
      return NextResponse.json(
        { error: 'You have used this password before. Please choose a new one.' },
        { status: 400 }
      );
    }

    // Check against historical password hashes
    for (const oldHash of previousPasswords) {
      const isReused = await bcrypt.compare(newPassword, oldHash);
      if (isReused) {
        return NextResponse.json(
          { error: 'You have used this password before. Please choose a new one.' },
          { status: 400 }
        );
      }
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Keep last 2 previous password hashes + current password hash (total 3 historical hashes)
    const updatedPreviousPasswords = [
      ...previousPasswords.slice(-2),
      user.password_hash,
    ];

    // Update user
    await prisma.users.update({
      where: { id: userId },
      data: {
        password_hash: newPasswordHash,
        updated_at: new Date(),
        metadata: {
          ...userMetadata,
          must_change_password: false,
          temporary_password: false,
          password_changed_at: new Date().toISOString(),
          last_password_change: new Date().toISOString(),
          previous_passwords: updatedPreviousPasswords,
        },
      },
    });

    // Log password change in audit_logs
    if (tenantId) {
      await prisma.audit_logs.create({
        data: {
          tenant_id: tenantId,
          user_id: userId,
          action: 'password_changed',
          resource_type: 'user',
          resource_id: userId,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          new_values: {
            timestamp: new Date().toISOString(),
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });

  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
