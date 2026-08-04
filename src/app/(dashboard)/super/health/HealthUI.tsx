'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, HardDrive, Server, Cloud, Cpu, MemoryStick, Activity, Clock, RefreshCw, AlertTriangle } from 'lucide-react';

interface HealthUIProps {
  db: {
    status: 'online' | 'offline';
    latencyMs: number;
    metrics: { version: string; size_mb: number; connections: number };
  };
  redis: {
    status: 'online' | 'offline';
    latencyMs: number;
  };
  storage: {
    status: 'online' | 'offline';
    latencyMs: number;
  };
  server: {
    cpu: { loadAvg: number; cores: number };
    memory: { total: number; free: number; used: number; percentage: number };
    uptime: number;
    platform: string;
    hostname: string;
  };
  alerts: any[];
}

export default function HealthUI({ db, redis, storage, server, alerts }: HealthUIProps) {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      handleRefresh();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    router.refresh();
    
    // Simulate slight delay for UI feedback
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 500);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const StatusCard = ({ title, icon: Icon, status, latency }: { title: string; icon: any; status: string; latency?: number }) => (
    <Card className={`border ${status === 'online' ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10'}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-lg ${status === 'online' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'}`}>
            <Icon className="w-6 h-6" />
          </div>
          <Badge variant={status === 'online' ? 'default' : 'destructive'} className={status === 'online' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}>
            {status === 'online' ? 'Online' : 'Offline'}
          </Badge>
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">{title}</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            {latency !== undefined ? `${latency}ms latency` : 'Running normally'}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">System Health</h1>
            <p className="text-sm text-slate-500 mt-1">
              Real-time monitoring and infrastructure status.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500 font-medium">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 font-medium text-slate-700 dark:text-slate-300 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Services Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard title="Database" icon={Database} status={db.status} latency={db.latencyMs} />
        <StatusCard title="Redis Cache" icon={Server} status={redis.status} latency={redis.latencyMs} />
        <StatusCard title="Storage (MinIO)" icon={HardDrive} status={storage.status} latency={storage.latencyMs} />
        <StatusCard title="Worker / API" icon={Cloud} status="online" />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">Memory Usage</CardTitle>
            <MemoryStick className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {server.memory.percentage.toFixed(1)}%
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full ${server.memory.percentage > 85 ? 'bg-red-500' : server.memory.percentage > 70 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                style={{ width: `${server.memory.percentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {formatBytes(server.memory.used)} / {formatBytes(server.memory.total)}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">CPU Load (1m)</CardTitle>
            <Cpu className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {server.cpu.loadAvg.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {server.cpu.cores} Cores • {server.platform} ({server.hostname})
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">DB Size & Conns</CardTitle>
            <Database className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-baseline mb-1">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {db.metrics.size_mb} <span className="text-lg font-medium text-slate-500">MB</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {db.metrics.connections} active connections
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">System Uptime</CardTitle>
            <Clock className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {formatUptime(server.uptime)}
            </div>
            <p className="text-xs text-slate-500 font-medium truncate" title={db.metrics.version}>
              PostgreSQL {db.metrics.version.split(' ')[1] || 'Unknown'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts Table */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <CardTitle className="text-lg font-bold">Recent System Alerts</CardTitle>
          </div>
          <CardDescription>Critical tenant and system-level audit logs</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Time</th>
                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Tenant</th>
                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Action</th>
                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No recent critical alerts. System is stable.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                      {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {alert.tenants?.name || 'System'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`text-[10px] uppercase font-mono ${
                        alert.action.includes('SUSPENDED') || alert.action.includes('DELETED') 
                          ? 'border-red-200 text-red-600 bg-red-50 dark:border-red-900 dark:text-red-400 dark:bg-red-900/20' 
                          : 'border-blue-200 text-blue-600 bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:bg-blue-900/20'
                      }`}>
                        {alert.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                      {alert.users?.full_name || 'System Auto'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
