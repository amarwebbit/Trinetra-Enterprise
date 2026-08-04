'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDateForHydration } from '@/lib/utils/date';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, Activity, Building, Download, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

export default function AuditLogsUI({
  logs,
  total,
  page,
  pageSize,
  stats,
  filterOptions
}: {
  logs: any[];
  total: number;
  page: number;
  pageSize: number;
  stats: any;
  filterOptions: any;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1'); // Reset to page 1 on filter
    startTransition(() => {
      router.push(`/super/audit-logs?${params.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get('search') as string;
    handleFilterChange('search', search);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams(searchParams.toString());
      window.location.href = `/api/super/audit-logs/export?${params.toString()}`;
    } catch (error) {
      toast.error('Failed to export logs');
    }
  };

  const formatJson = (json: any) => {
    if (!json) return 'N/A';
    try {
      return JSON.stringify(json, null, 2);
    } catch {
      return 'Invalid JSON';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">System Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor platform events across all tenants.
          </p>
        </div>
        <Button onClick={handleExport} className="flex items-center gap-2" variant="outline">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" /> Total Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-700 dark:text-blue-300">
              {stats.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Today's Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-green-700 dark:text-green-300">
              {stats.today.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4" /> Unique Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-purple-700 dark:text-purple-300">
              {stats.actions.length}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4" /> Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-orange-700 dark:text-orange-300">
              {stats.tenantCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  name="search" 
                  placeholder="Search logs..." 
                  className="pl-9"
                  defaultValue={searchParams.get('search') || ''}
                />
              </div>
              <Button type="submit" variant="secondary">Search</Button>
            </form>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select defaultValue={searchParams.get('tenant') || 'all'} onValueChange={(v) => handleFilterChange('tenant', v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Tenants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  {filterOptions.tenants.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select defaultValue={searchParams.get('action') || 'all'} onValueChange={(v) => handleFilterChange('action', v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {filterOptions.actions.map((a: string) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Timestamp</th>
                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Tenant</th>
                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">User</th>
                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Action</th>
                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Resource</th>
                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No logs found matching your criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors ${expandedLog === log.id ? 'bg-slate-50 dark:bg-slate-900' : ''}`}
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs">
                        {formatDateForHydration(log.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {log.tenants?.name || 'System'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {log.users?.full_name || 'System'}
                          </span>
                          <span className="text-xs text-slate-500">{log.users?.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="font-mono text-[10px] uppercase bg-slate-100 dark:bg-slate-800">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                        {log.resource_type}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {log.ip_address || 'N/A'}
                      </td>
                    </tr>
                    {expandedLog === log.id && (
                      <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Old Values</h4>
                              <pre className="bg-slate-100 dark:bg-slate-950 p-3 rounded-lg text-xs font-mono overflow-auto max-h-48 border border-slate-200 dark:border-slate-800">
                                {formatJson(log.old_values)}
                              </pre>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">New Values</h4>
                              <pre className="bg-slate-100 dark:bg-slate-950 p-3 rounded-lg text-xs font-mono overflow-auto max-h-48 border border-slate-200 dark:border-slate-800">
                                {formatJson(log.new_values)}
                              </pre>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 text-xs">
                            <div>
                              <span className="font-bold text-slate-500">User Agent:</span> {log.user_agent || 'N/A'}
                            </div>
                            <div>
                              <span className="font-bold text-slate-500">Resource ID:</span> <span className="font-mono">{log.resource_id || 'N/A'}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} entries
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 1 || isPending}
                onClick={() => handleFilterChange('page', String(page - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <div className="flex items-center px-3 text-sm font-medium">
                Page {page} of {totalPages}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page >= totalPages || isPending}
                onClick={() => handleFilterChange('page', String(page + 1))}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
