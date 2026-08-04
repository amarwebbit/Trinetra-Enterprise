'use client';

import React, { useState, useCallback, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Plus, Upload, MoreHorizontal, UserCheck, 
  UserX, Key, Edit, FileUp, FilterX
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

// Zod & Forms
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toggleUserStatus, resetPassword, createUser, updateUser, bulkImportUsersQueued, getUserPassword } from '@/app/actions/user-actions';

const userSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  role: z.enum(["student", "teacher", "admin"]),
  department_id: z.string().uuid().optional().nullable().or(z.literal('')),
  roll_number: z.string().optional().nullable(),
});

type UserData = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_active: boolean | null;
  roll_number?: string | null;
  department: { id: string; name: string } | null;
};

type Department = { id: string; name: string };

type UsersUIProps = {
  users: UserData[];
  total: number;
  page: number;
  pageSize: number;
  departments: Department[];
  filters: Record<string, string | undefined>;
};

export default function UsersUI({ users, total, page, pageSize, departments, filters }: UsersUIProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error('Please select a CSV file first');
      return;
    }
    setIsUploadingBulk(true);
    const formData = new FormData();
    formData.append('file', bulkFile);
    try {
      const res = await fetch('/api/admin/users/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Import failed');
      toast.success(`✅ ${data.imported || data.total || 0} students imported successfully!`);
      setIsBulkModalOpen(false);
      setBulkFile(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || 'Import failed. Please check CSV format.');
    } finally {
      setIsUploadingBulk(false);
    }
  };

  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Form setup
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: 'student', department_id: '' }
  });

  // URL State Updates
  const updateQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'all') {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      if (name !== 'page') {
        params.set('page', '1'); // Reset to page 1 on new filter
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router]
  );

  const clearFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  // Actions
  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await toggleUserStatus(userId, !currentStatus);
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm("Are you sure you want to reset this user's password?")) return;
    try {
      const res = await resetPassword(userId);
      if (res.success) {
        setTempPasswords(prev => ({ ...prev, [res.userId || userId]: res.temporaryPassword }));
        setVisiblePasswords(prev => ({ ...prev, [res.userId || userId]: true }));
      }
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    }
  };

  const onSubmit = async (data: z.infer<typeof userSchema>) => {
    // Sanitize empty department string to null
    const payload = { 
      ...data, 
      department_id: data.department_id === '' ? null : data.department_id 
    };

    try {
      if (editingUser) {
        const res = await updateUser(editingUser.id, payload);
        if (res.success) {
          setEditingUser(null);
        }
      } else {
        const res = await createUser(payload);
        if (res.success) {
          setTempPasswords(prev => ({ ...prev, [res.userId]: res.temporaryPassword }));
          setVisiblePasswords(prev => ({ ...prev, [res.userId]: true }));
          setIsAddModalOpen(false);
          reset();
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save user");
    }
  };

  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    setValue('full_name', user.full_name || '');
    setValue('email', user.email);
    setValue('role', user.role as any);
    setValue('department_id', user.department?.id || '');
    setValue('roll_number', user.roll_number || '');
  };

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Top Bar: Search & Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search name or email..." 
            className="pl-8 rounded-none border-muted"
            defaultValue={filters.search || ''}
            onChange={(e) => {
              // Debounce would be ideal here in prod
              const val = e.target.value;
              setTimeout(() => updateQueryString('search', val), 500);
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-none" onClick={() => setIsBulkModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Bulk Import
          </Button>
          <Button onClick={() => { reset(); setEditingUser(null); setIsAddModalOpen(true); }} className="rounded-none">
            <Plus className="h-4 w-4 mr-2" /> Add User
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-3 border border-muted">
        <select 
          className="text-sm bg-background border-muted border px-2 py-1.5 focus:outline-none"
          value={filters.role || 'all'}
          onChange={(e) => updateQueryString('role', e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>

        <select 
          className="text-sm bg-background border-muted border px-2 py-1.5 focus:outline-none"
          value={filters.department || 'all'}
          onChange={(e) => updateQueryString('department', e.target.value)}
        >
          <option value="all">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select 
          className="text-sm bg-background border-muted border px-2 py-1.5 focus:outline-none"
          value={filters.status || 'all'}
          onChange={(e) => updateQueryString('status', e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        
        {(filters.role || filters.department || filters.status || filters.search) && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-8 ml-auto">
            <FilterX className="h-3 w-3 mr-1" /> Clear Filters
          </Button>
        )}
      </div>

      {/* Data Table */}
      <Card className="rounded-none border-muted">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className={!user.is_active ? 'opacity-60 bg-muted/20' : ''}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.full_name || 'N/A'}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                        {(tempPasswords[user.id] || user.roll_number || user.role === 'student') && (
                          <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                            <span className="text-muted-foreground font-medium">Temp Pass:</span>
                            <span className="font-mono bg-muted/60 px-1.5 py-0.5 border border-muted text-foreground font-semibold">
                              {visiblePasswords[user.id] 
                                ? (tempPasswords[user.id] || user.roll_number || 'password123') 
                                : '••••••••'}
                            </span>
                            <button
                              onClick={() => setVisiblePasswords(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                              className="text-primary hover:underline font-bold ml-1"
                            >
                              {visiblePasswords[user.id] ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.department?.name || '—'}
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <span className="flex items-center text-xs text-green-500 font-medium">
                          <CheckCircle className="h-3 w-3 mr-1" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center text-xs text-red-500 font-medium">
                          <XCircle className="h-3 w-3 mr-1" /> Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-none">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditModal(user)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                            <Key className="mr-2 h-4 w-4" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleToggleStatus(user.id, !!user.is_active)}
                            className={user.is_active ? "text-red-500" : "text-green-500"}
                          >
                            {user.is_active ? (
                              <><UserX className="mr-2 h-4 w-4" /> Deactivate User</>
                            ) : (
                              <><UserCheck className="mr-2 h-4 w-4" /> Activate User</>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {total > pageSize && (
        <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
          <div>
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} entries
          </div>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-none h-8"
              disabled={page <= 1}
              onClick={() => updateQueryString('page', String(page - 1))}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-none h-8"
              disabled={page * pageSize >= total}
              onClick={() => updateQueryString('page', String(page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {(isAddModalOpen || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-md border border-muted bg-card rounded-none shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">{editingUser ? 'Edit User' : 'Add New User'}</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Full Name</label>
                  <Input {...register('full_name')} className="rounded-none" placeholder="Jane Doe" />
                  {errors.full_name && <p className="text-red-500 text-xs">{errors.full_name.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Email</label>
                  <Input {...register('email')} className="rounded-none" placeholder="jane@example.com" disabled={!!editingUser} />
                  {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                  {editingUser && <p className="text-[10px] text-muted-foreground">Email cannot be changed after creation.</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Role</label>
                  <select {...register('role')} className="w-full bg-background border border-muted p-2 text-sm focus:outline-none">
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                  {errors.role && <p className="text-red-500 text-xs">{errors.role.message}</p>}
                </div>

                {watch('role') === 'student' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Roll Number</label>
                    <Input {...register('roll_number')} className="rounded-none" placeholder="e.g. CS2024001" />
                    {errors.roll_number && <p className="text-red-500 text-xs">{errors.roll_number.message}</p>}
                    {!editingUser && (
                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-none text-sm text-blue-700">
                        ℹ️ Password will be automatically set to the student's roll number.
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Department (Optional)</label>
                  <select {...register('department_id')} className="w-full bg-background border border-muted p-2 text-sm focus:outline-none">
                    <option value="">No Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-muted">
                  <Button type="button" variant="outline" className="rounded-none" onClick={() => { setIsAddModalOpen(false); setEditingUser(null); }}>Cancel</Button>
                  <Button type="submit" className="rounded-none">Save User</Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Active Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border border-muted bg-card rounded-none shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6">
              <div className="flex items-center justify-between border-b border-muted pb-3 mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FileUp className="h-5 w-5 text-blue-600" /> Bulk Import Users
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => window.open('/sample-students.csv')}
                >
                  📄 Download Sample CSV
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                Upload a CSV file with columns: <code className="bg-muted px-1 py-0.5 rounded font-mono">Name, Email, Roll Number, Branch, Passing Year</code>. Default passwords will be set to student Roll Numbers.
              </p>

              <div className="border-2 border-dashed border-muted p-6 bg-muted/10 text-center relative hover:bg-muted/20 transition-colors">
                <input 
                  type="file" 
                  accept=".csv"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                />
                <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <span className="text-sm font-medium text-foreground block">
                  {bulkFile ? bulkFile.name : 'Click to select CSV file'}
                </span>
                {bulkFile && (
                  <span className="text-xs text-green-600 font-semibold block mt-1">
                    {(bulkFile.size / 1024).toFixed(1)} KB file selected
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-muted">
                <Button variant="outline" className="rounded-none text-xs" onClick={() => setIsBulkModalOpen(false)}>Cancel</Button>
                <Button 
                  className="rounded-none text-xs bg-blue-600 hover:bg-blue-700 text-white" 
                  onClick={handleBulkUpload}
                  disabled={!bulkFile || isUploadingBulk}
                >
                  {isUploadingBulk ? 'Processing Import...' : 'Upload & Process'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}

// Minimal missing icon fallback
function CheckCircle({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}
function XCircle({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
}
