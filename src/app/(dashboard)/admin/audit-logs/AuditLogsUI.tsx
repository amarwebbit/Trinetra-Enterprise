'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Download, ChevronDown, ChevronRight, Filter, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { exportAuditLogs } from '@/app/actions/audit-actions';
import { getDateRangeFromPreset } from '@/lib/utils/date-helpers';

type LogUser = { id: string; full_name: string | null; email: string };

type AuditLog = {
  id: string;
  created_at: Date | null;
  users: LogUser | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  ip_address: string | null;
  old_values: any;
  new_values: any;
  metadata: any;
};

type AuditLogsUIProps = {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  actions: string[];
  users: LogUser[];
  filters: any;
};

export default function AuditLogsUI({
  logs,
  total,
  page,
  pageSize,
  actions,
  users,
  filters
}: AuditLogsUIProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const totalPages = Math.ceil(total / pageSize) || 1;

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    if (key !== 'page') {
      params.set('page', '1');
    }
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleDatePreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    
    if (preset && preset !== 'custom') {
      const { startDate, endDate } = getDateRangeFromPreset(preset);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
    } else if (!preset) {
      params.delete('startDate');
      params.delete('endDate');
    }
    
    params.set('page', '1');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters('search', searchTerm);
  };

  const handleExport = async () => {
    try {
      toast.info("Generating CSV...");
      const csvString = await exportAuditLogs(filters);
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV exported successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to export logs");
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRowId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Filters Toolbar */}
      <Card className="rounded-none border-muted">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
          
          <form onSubmit={handleSearch} className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search actions or resources..." 
              className="pl-9 rounded-none border-muted focus-visible:ring-1 focus-visible:ring-primary w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
            <select 
              className="bg-background border border-muted p-2 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary min-w-[140px]"
              value={filters.action || ''}
              onChange={(e) => updateFilters('action', e.target.value)}
            >
              <option value="">All Actions</option>
              {actions.map(a => (
                <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
              ))}
            </select>

            <select 
              className="bg-background border border-muted p-2 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary min-w-[140px]"
              value={filters.user || ''}
              onChange={(e) => updateFilters('user', e.target.value)}
            >
              <option value="">All Users</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>

            <select 
              className="bg-background border border-muted p-2 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary min-w-[140px]"
              onChange={handleDatePreset}
              defaultValue=""
            >
              <option value="">Any Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="this_month">This Month</option>
            </select>

            <Button variant="outline" className="rounded-none whitespace-nowrap" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-none border-muted">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Filter className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    No audit logs found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/10 transition-colors"
                      onClick={() => toggleRow(log.id)}
                    >
                      <TableCell>
                        {expandedRowId === log.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {log.created_at?.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.users?.full_name || log.users?.email || 'System'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] rounded-none uppercase bg-muted/20">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-semibold">{log.resource_type}</span>
                        {log.resource_id && <span className="text-muted-foreground block text-xs truncate max-w-[200px]">{log.resource_id}</span>}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {log.ip_address || '-'}
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Details Row */}
                    {expandedRowId === log.id && (
                      <TableRow className="bg-muted/5 hover:bg-muted/5">
                        <TableCell colSpan={6} className="p-0 border-b">
                          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 shadow-inner">
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Old Values</h4>
                              <pre className="bg-background border border-muted p-3 text-xs font-mono overflow-auto max-h-[250px] whitespace-pre-wrap">
                                {log.old_values ? JSON.stringify(log.old_values, null, 2) : 'null'}
                              </pre>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">New Values</h4>
                              <pre className="bg-background border border-muted p-3 text-xs font-mono overflow-auto max-h-[250px] whitespace-pre-wrap">
                                {log.new_values ? JSON.stringify(log.new_values, null, 2) : 'null'}
                              </pre>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Metadata & Context</h4>
                              <pre className="bg-background border border-muted p-3 text-xs font-mono overflow-auto max-h-[250px] whitespace-pre-wrap">
                                {log.metadata ? JSON.stringify(log.metadata, null, 2) : 'null'}
                              </pre>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} results
          </div>
          <div className="flex items-center gap-2">
            <select 
              className="bg-background border border-muted p-1 text-sm focus:outline-none rounded-none mr-4"
              value={pageSize}
              onChange={(e) => updateFilters('pageSize', e.target.value)}
            >
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
            </select>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-none h-8 w-8 p-0"
              onClick={() => updateFilters('page', String(page - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">Page {page} of {totalPages}</span>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-none h-8 w-8 p-0"
              onClick={() => updateFilters('page', String(page + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
