import { NextResponse } from 'next/server';
import { getValidatedTenantId } from '@/lib/auth/get-tenant-id';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';
import bcrypt from 'bcryptjs';

async function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  
  const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  return lines.slice(1).map(line => {
    const values = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(val => val.trim().replace(/^["']|["']$/g, ''));
    const obj: any = {};
    
    rawHeaders.forEach((header, idx) => {
      const rawVal = values[idx] || '';
      obj[header] = rawVal;
      
      const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (['fullname', 'name', 'studentname'].includes(cleanHeader)) {
        obj.fullName = rawVal;
        obj.full_name = rawVal;
        obj.name = rawVal;
      }
      if (['email', 'emailaddress'].includes(cleanHeader)) {
        obj.email = rawVal;
      }
      if (['rollnumber', 'rollno', 'roll', 'registrationnumber', 'registrationno'].includes(cleanHeader)) {
        obj.rollNumber = rawVal;
        obj.roll_number = rawVal;
      }
      if (['role', 'userrole'].includes(cleanHeader)) {
        obj.role = rawVal.toLowerCase();
      }
      if (['branch', 'department', 'dept'].includes(cleanHeader)) {
        obj.branch = rawVal;
        obj.department = rawVal;
      }
      if (['passingyear', 'year'].includes(cleanHeader)) {
        obj.passingYear = rawVal;
      }
    });

    if (!obj.email && obj.Email) obj.email = obj.Email;
    if (!obj.fullName && obj.Name) obj.fullName = obj.Name;
    if (!obj.rollNumber && obj['Roll Number']) obj.rollNumber = obj['Roll Number'];
    if (!obj.fullName && obj.email) obj.fullName = obj.email.split('@')[0];
    
    return obj;
  });
}

function validateStudentRows(rows: any[]) {
  const valid: any[] = [];
  const errors: any[] = [];
  const timestamp = Date.now();
  
  rows.forEach((row, index) => {
    const email = row.email || row.Email;
    const fullName = row.fullName || row.full_name || row.Name || row['Full Name'] || (email ? email.split('@')[0] : '');
    const role = row.role?.toLowerCase() || 'student';
    const isTeacher = role === 'teacher' || role === 'admin';
    
    const rollNumber = isTeacher 
      ? null 
      : (row.rollNumber || row.roll_number || row['Roll Number'] || row['Roll No'] || row.RollNumber || `STUDENT_${timestamp}_${index + 1}`);

    if (!email) {
      errors.push({ row: index + 1, field: 'email', message: 'Email is required', value: '' });
      return;
    }
    
    valid.push({
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      rollNumber: rollNumber ? rollNumber.trim() : null,
      role: role,
      branch: row.branch || row.Branch || row.department || 'CSE',
      passingYear: row.passingYear || row['Passing Year'] || '2026',
    });
  });
  
  return { valid, errors };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId, errorResponse } = await getValidatedTenantId(session);
    if (errorResponse) return errorResponse;
    
    const contentType = req.headers.get('content-type') || '';
    let rawRows: any[] = [];
    
    if (contentType.includes('application/json')) {
      const body = await req.json();
      rawRows = body.users || body.rows || [];
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (file) {
        const text = await file.text();
        rawRows = await parseCSV(text);
      }
    }

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return NextResponse.json({ error: 'No valid user records found in CSV file' }, { status: 400 });
    }

    const { valid, errors } = validateStudentRows(rawRows);

    if (valid.length === 0) {
      return NextResponse.json({ 
        error: 'All rows failed validation. Please check headers: Name, Email, Roll Number', 
        imported: 0, 
        errors 
      }, { status: 400 });
    }

    // Direct synchronous batch insertion into PostgreSQL database
    const dataToInsert = await Promise.all(valid.map(async (row) => ({
      tenant_id: tenantId,
      email: row.email,
      password_hash: await bcrypt.hash(row.rollNumber || 'password123', 10),
      full_name: row.fullName,
      role: row.role || 'student',
      roll_number: row.rollNumber,
      is_active: true,
      email_verified: true,
      metadata: {
        branch: row.branch,
        passingYear: row.passingYear,
        imported_at: new Date().toISOString(),
      }
    })));

    const result = await prisma.users.createMany({
      data: dataToInsert,
      skipDuplicates: true,
    });

    // Record audit log entry
    await prisma.audit_logs.create({
      data: {
        tenant_id: tenantId,
        user_id: session.user.id,
        action: 'bulk_student_import',
        resource_type: 'user_management',
        metadata: {
          importedCount: result.count,
          totalRows: valid.length,
          errorsCount: errors.length,
          status: 'completed',
          recordsProcessed: result.count
        }
      }
    });

    return NextResponse.json({
      success: true,
      imported: result.count,
      total: valid.length,
      errorsCount: errors.length,
      message: `Successfully imported ${result.count} students!`,
    });

  } catch (error: any) {
    console.error('Error in bulk CSV import route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
