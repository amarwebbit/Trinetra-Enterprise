'use client';

import { useSession } from 'next-auth/react';
import { User, Mail, Shield, Building } from 'lucide-react';
import { ChangePassword } from '@/components/profile/ChangePassword';

export default function ProfilePage() {
  const { data: session } = useSession();

  const userName = session?.user?.name || (session?.user as any)?.full_name || 'User Profile';
  const userEmail = session?.user?.email || 'N/A';
  const userRole = session?.user?.role || 'User';
  const tenantName = (session?.user as any)?.tenantName || 'TrinetraEdu-AI';

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>

      {/* Profile Info */}
      <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center border border-primary/20 shrink-0">
            <span className="text-2xl font-bold">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="space-y-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">{userName}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{userEmail}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1 bg-muted px-2.5 py-0.5 rounded-full capitalize font-medium text-foreground">
                <Shield className="h-3 w-3 shrink-0" />
                {userRole.replace('_', ' ')}
              </span>
              <span className="flex items-center gap-1 bg-muted px-2.5 py-0.5 rounded-full font-medium text-foreground">
                <Building className="h-3 w-3 shrink-0" />
                {tenantName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Optional Password Change */}
      <ChangePassword />
    </div>
  );
}
