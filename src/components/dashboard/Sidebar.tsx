import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils/helpers';
import { useWhiteLabel } from '@/components/providers/WhiteLabelProvider';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CreditCard, 
  BookOpen, 
  Award, 
  Eye, 
  BarChart3, 
  Palette, 
  History,
  Database,
  Clock,
  Mail,
  UploadCloud
} from 'lucide-react';

interface SidebarItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function SidebarItem({ href, icon: Icon, label, primaryColor }: SidebarItemProps & { primaryColor?: string }) {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = pathname === href || (href !== '/student' && href !== '/teacher' && href !== '/admin' && href !== '/super' && pathname.startsWith(`${href}/`));
  const activeBg = primaryColor || '#2563EB';

  return (
    <Link
      href={href}
      className={cn(
        'relative flex items-center space-x-3 px-4 py-3 text-sm font-semibold transition-colors duration-200 border-l-4 rounded-none group',
        isActive
          ? 'text-white font-bold shadow-sm border-l-primary'
          : 'border-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
      )}
      suppressHydrationWarning
    >
      {isActive && mounted && (
        <motion.div
          layoutId="active-sidebar-pill"
          className="absolute inset-0 -z-10"
          style={{ backgroundColor: activeBg, borderLeft: `4px solid ${activeBg}` }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
      <Icon className={cn("h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105", isActive ? "text-white" : "text-slate-500 dark:text-slate-400")} />
      <span suppressHydrationWarning>{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const { sidebarOpen } = useStore();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const config = useWhiteLabel();
  const userRole = session?.user?.role;

  // Determine portal scope based on current route path
  const isAdminPortal = pathname.startsWith('/admin');
  const isSuperPortal = pathname.startsWith('/super');
  const isTeacherPortal = pathname.startsWith('/teacher');
  const isStudentPortal = pathname.startsWith('/student');

  // Tenant branding (skip for Super Admin portal)
  const isSuperAdmin = isSuperPortal || userRole === 'super_admin';
  const logoUrl = !isSuperAdmin ? config?.logoUrl : null;
  const nameImageUrl = !isSuperAdmin ? (config as any)?.nameImageUrl : null; // styled name image
  const tenantName = !isSuperAdmin ? (config?.tenantName || session?.user?.tenantName || 'TrinetraEdu-AI') : 'TrinetraEdu-AI';
  const primaryColor = !isSuperAdmin ? (config?.primaryColor || '#2563EB') : undefined;
  const removeBranding = !isSuperAdmin ? (config?.removeBranding || false) : false;

  const portalLabel = isAdminPortal
    ? 'Admin Console'
    : isSuperPortal
    ? 'Super Console'
    : isTeacherPortal
    ? 'Faculty Console'
    : isStudentPortal
    ? 'Student Portal'
    : 'v2.0.0';

  return (
    <aside
      className={cn(
        'fixed top-0 bottom-0 left-0 z-40 flex flex-col w-64 border-r border-border bg-background transition-transform duration-300 rounded-none',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Brand logo container — SINGLE source of tenant branding */}
      <div className="flex h-auto min-h-[64px] items-center justify-between px-4 py-3 border-b border-border">
        <Link href="/" className="flex items-center space-x-3 w-full min-w-0">
          {/* Logo image (round/square icon) */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={tenantName}
              className="h-10 w-10 object-contain rounded-sm shrink-0"
            />
          ) : (
            <div
              className="h-10 w-10 flex items-center justify-center text-white font-bold text-base rounded-sm shrink-0"
              style={{ backgroundColor: primaryColor || '#2563EB' }}
            >
              {tenantName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Name image (styled institute name) OR plain text name — full width, no truncation */}
          <div className="min-w-0 flex-1">
            {nameImageUrl ? (
              <img
                src={nameImageUrl}
                alt={tenantName}
                className="max-h-8 w-full object-contain object-left"
              />
            ) : (
              <h2
                className="font-bold text-sm leading-tight break-words whitespace-normal"
                style={{ color: primaryColor || 'currentColor' }}
              >
                {tenantName}
              </h2>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {portalLabel}
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 space-y-1 py-4 overflow-y-auto">
        {status === 'loading' ? (
          <div className="space-y-2 px-4 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded-none" />
            ))}
          </div>
        ) : isStudentPortal || userRole === 'student' ? (
          <>
            <SidebarItem href="/student" icon={LayoutDashboard} label="Student Overview" primaryColor={primaryColor} />
            <SidebarItem href="/student/exams" icon={Award} label="Available Exams" primaryColor={primaryColor} />
            <SidebarItem href="/student/results" icon={BarChart3} label="My Performance & Results" primaryColor={primaryColor} />
          </>
        ) : isTeacherPortal || userRole === 'teacher' ? (
          <>
            <SidebarItem href="/teacher" icon={LayoutDashboard} label="Faculty Dashboard" primaryColor={primaryColor} />
            <SidebarItem href="/teacher/questions" icon={Database} label="Question Bank" primaryColor={primaryColor} />
            <SidebarItem href="/teacher/exams" icon={Award} label="Exam Builder" primaryColor={primaryColor} />
            <SidebarItem href="/teacher/live" icon={Eye} label="Live Proctoring" primaryColor={primaryColor} />
            <SidebarItem href="/teacher/results" icon={BarChart3} label="Class Analytics" primaryColor={primaryColor} />
          </>
        ) : isAdminPortal || userRole === 'admin' ? (
          <>
            <SidebarItem href="/admin" icon={LayoutDashboard} label="Dashboard Home" primaryColor={primaryColor} />
            <SidebarItem href="/admin/users" icon={Users} label="User Management" primaryColor={primaryColor} />
            <SidebarItem href="/admin/exams" icon={Award} label="Exam Oversight" primaryColor={primaryColor} />
            <SidebarItem href="/admin/live" icon={Eye} label="Live Monitoring" primaryColor={primaryColor} />
            <SidebarItem href="/admin/results" icon={BarChart3} label="Results & Analytics" primaryColor={primaryColor} />
            <SidebarItem href="/admin/notifications" icon={Mail} label="Notification Suite" primaryColor={primaryColor} />
            <SidebarItem href="/admin/bulk" icon={UploadCloud} label="Bulk Operations" primaryColor={primaryColor} />
            <SidebarItem href="/admin/branding" icon={Palette} label="Branding & Settings" primaryColor={primaryColor} />
            <SidebarItem href="/admin/audit-logs" icon={History} label="Audit Logs" primaryColor={primaryColor} />
          </>
        ) : isSuperPortal || userRole === 'super_admin' ? (
          <>
            <SidebarItem href="/super" icon={LayoutDashboard} label="Dashboard Overview" />
            <SidebarItem href="/super/tenants" icon={Users} label="Tenant Directory" />
            <SidebarItem href="/super/audit-logs" icon={FileText} label="System Audit Logs" />
            <SidebarItem href="/super/billing" icon={CreditCard} label="Platform Billing Config" />
          </>
        ) : (
          <div className="px-6 py-4 text-xs text-muted-foreground">
            No dashboard matches your role.
          </div>
        )}
      </nav>

      {/* Footer: user info only */}
      <div className="p-4 border-t border-border bg-muted/20">
        <div className="flex items-center space-x-3">
          <div
            className="h-8 w-8 text-white flex items-center justify-center font-bold rounded-none shrink-0 text-xs shadow-sm"
            style={{ backgroundColor: primaryColor || '#2563EB' }}
          >
            {session?.user?.name ? session.user.name.substring(0, 2).toUpperCase() : 'JD'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{session?.user?.name || 'User Profile'}</p>
            <p className="text-xs text-muted-foreground capitalize truncate">{userRole?.replace('_', ' ') || 'Unknown Role'}</p>
          </div>
        </div>
        {!removeBranding && (
          <div className="mt-3 pt-2 border-t border-border/50 text-center">
            <p className="text-[10px] text-muted-foreground">
              Powered by <span className="font-bold" style={{ color: primaryColor || '#2563EB' }}>TrinetraEdu-AI</span>
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
