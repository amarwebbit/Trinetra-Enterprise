'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Server,
  Users,
  FileText,
  Bell,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  XCircle,
  PlayCircle,
  PauseCircle,
  Shield,
  Zap,
  HardDrive,
  Cpu,
  Network,
  Globe,
  Mail,
  Phone,
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Loader2,
  Eye,
  EyeOff,
  Settings,
  LogOut,
  User,
  Home,
  Search,
  Filter,
  MoreVertical,
  Copy,
  Check,
  AlertOctagon,
  Flame,
  Bug,
  Wifi,
  WifiOff,
  DatabaseZap,
  ServerCog,
  ShieldAlert,
  Gauge,
  Scan,
  ShieldCheck,
  ListChecks,
  Radio,
  RadioReceiver,
  Signal,
  SignalHigh,
  SignalLow,
  SignalZero,
  ArrowUp,
  ArrowDown,
  Minus,
  PieChart,
  LineChart,
  AreaChart,
  BarChart,
  Info,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

// ============================================
// Types
// ============================================
interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  services: {
    database: { status: 'up' | 'down' | 'degraded'; latency: number; connections: number };
    redis: { status: 'up' | 'down' | 'degraded'; latency: number; memory: number };
    nginx: { status: 'up' | 'down'; requests: number; errors: number };
    app: { status: 'up' | 'down'; uptime: number; memory: number; cpu: number };
    minio: { status: 'up' | 'down'; storage: number };
    judge0: { status: 'up' | 'down' | 'degraded'; pending: number };
    openai: { status: 'up' | 'down' | 'degraded'; remaining: number };
  };
  timestamp: string;
}

interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  source: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface PerformanceMetric {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  userCount: number;
}

interface TenantHealth {
  tenantId: string;
  tenantName: string;
  status: 'healthy' | 'degraded' | 'critical';
  activeExams: number;
  activeUsers: number;
  errorCount: number;
  lastError: string | null;
  modules: string[];
}

interface Alert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  message: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

// ============================================
// Components
// ============================================

// Status Indicator
function StatusIndicator({ status }: { status: 'up' | 'down' | 'degraded' | 'healthy' | 'critical' }) {
  const colors = {
    up: 'bg-green-500',
    down: 'bg-red-500',
    degraded: 'bg-yellow-500',
    healthy: 'bg-green-500',
    critical: 'bg-red-500',
  };

  const labels = {
    up: 'Operational',
    down: 'Down',
    degraded: 'Degraded',
    healthy: 'Healthy',
    critical: 'Critical',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${colors[status]} animate-pulse`} />
      <span className="text-xs font-medium text-gray-600">{labels[status] || status}</span>
    </div>
  );
}

// Service Card
function ServiceCard({ 
  name, 
  icon: Icon, 
  status, 
  metrics, 
  onClick 
}: { 
  name: string; 
  icon: any; 
  status: 'up' | 'down' | 'degraded'; 
  metrics: Record<string, any>;
  onClick?: () => void;
}) {
  const statusColors = {
    up: 'border-green-200 bg-green-50/50',
    down: 'border-red-200 bg-red-50/50',
    degraded: 'border-yellow-200 bg-yellow-50/50',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onClick}
      className={`p-4 rounded-xl border ${statusColors[status]} cursor-pointer transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${status === 'up' ? 'bg-green-100' : status === 'degraded' ? 'bg-yellow-100' : 'bg-red-100'}`}>
            <Icon className={`h-5 w-5 ${status === 'up' ? 'text-green-600' : status === 'degraded' ? 'text-yellow-600' : 'text-red-600'}`} />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-800">{name}</h4>
            <StatusIndicator status={status} />
          </div>
        </div>
        {metrics && Object.keys(metrics).length > 0 && (
          <div className="text-right text-xs text-gray-500">
            {Object.entries(metrics).map(([key, value]) => (
              <div key={key}>{key}: {value}</div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Error Log Item
function ErrorLogItem({ log, onResolve }: { log: ErrorLog; onResolve: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  const levelColors = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const levelIcons = {
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const Icon = levelIcons[log.level];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg p-3 ${levelColors[log.level]} ${log.resolved ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
            log.level === 'error' ? 'text-red-500' : 
            log.level === 'warning' ? 'text-yellow-500' : 
            'text-blue-500'
          }`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate">{log.message}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200/50 text-gray-600 truncate">
                {log.source}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>{format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</span>
              {log.resolved && (
                <>
                  <span>•</span>
                  <span className="text-green-600">✓ Resolved</span>
                </>
              )}
            </div>
            {log.stack && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                {expanded ? 'Hide details' : 'Show details'}
                <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}
            {expanded && log.stack && (
              <pre className="mt-2 p-2 bg-gray-900 text-gray-300 rounded-lg text-xs font-mono overflow-x-auto max-h-40">
                {log.stack}
              </pre>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!log.resolved && (
            <button
              onClick={() => onResolve(log.id)}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Resolve
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Alert Banner
function AlertBanner({ alert, onAcknowledge }: { alert: Alert; onAcknowledge: (id: string) => void }) {
  const severityColors = {
    critical: 'bg-red-100 border-red-400 text-red-800',
    high: 'bg-orange-100 border-orange-400 text-orange-800',
    medium: 'bg-yellow-100 border-yellow-400 text-yellow-800',
    low: 'bg-blue-100 border-blue-400 text-blue-800',
  };

  const severityIcons = {
    critical: Flame,
    high: AlertOctagon,
    medium: AlertTriangle,
    low: AlertCircle,
  };

  const Icon = severityIcons[alert.severity];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`p-4 rounded-lg border-l-4 ${severityColors[alert.severity]} ${alert.acknowledged ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{alert.type}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200/50 text-gray-600">
              {alert.source}
            </span>
          </div>
          <p className="text-sm mt-0.5">{alert.message}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span>{format(new Date(alert.timestamp), 'MMM d, HH:mm:ss')}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!alert.acknowledged && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Acknowledge
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Stat Card
function StatCard({ 
  label, 
  value, 
  change, 
  icon: Icon, 
  color 
}: { 
  label: string; 
  value: string | number; 
  change?: { value: number; direction: 'up' | 'down' | 'neutral' }; 
  icon: any; 
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 text-xs mt-1 ${
              change.direction === 'up' ? 'text-green-600' : 
              change.direction === 'down' ? 'text-red-600' : 
              'text-gray-500'
            }`}>
              {change.direction === 'up' && <ArrowUp className="h-3 w-3" />}
              {change.direction === 'down' && <ArrowDown className="h-3 w-3" />}
              {change.value}%
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Main Dashboard Component
// ============================================
export default function SuperAdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Data states
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [tenantHealth, setTenantHealth] = useState<TenantHealth[]>([]);
  const [filteredErrors, setFilteredErrors] = useState<ErrorLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  // Fetch data
  const fetchDashboardData = async () => {
    try {
      const [healthRes, errorsRes, alertsRes, metricsRes, tenantsRes] = await Promise.all([
        fetch('/api/super-admin/health'),
        fetch('/api/super-admin/errors?limit=50'),
        fetch('/api/super-admin/alerts'),
        fetch('/api/super-admin/metrics'),
        fetch('/api/super-admin/tenants'),
      ]);

      const health = await healthRes.json();
      const errors = await errorsRes.json();
      const alerts = await alertsRes.json();
      const metrics = await metricsRes.json();
      const tenants = await tenantsRes.json();

      if (health.success) setSystemHealth(health.data);
      if (errors.success) setErrorLogs(errors.data);
      if (alerts.success) setAlerts(alerts.data);
      if (metrics.success) setPerformanceMetrics(metrics.data);
      if (tenants.success) setTenantHealth(tenants.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-refresh
  useEffect(() => {
    fetchDashboardData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchDashboardData();
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // Filter errors
  useEffect(() => {
    if (filter === 'all') {
      setFilteredErrors(errorLogs);
    } else {
      setFilteredErrors(errorLogs.filter(e => e.level === filter));
    }
  }, [errorLogs, filter]);

  // Resolve error
  const handleResolveError = async (id: string) => {
    try {
      const response = await fetch(`/api/super-admin/errors/${id}/resolve`, {
        method: 'POST',
      });
      if (response.ok) {
        setErrorLogs(prev => 
          prev.map(e => e.id === id ? { ...e, resolved: true, resolvedAt: new Date().toISOString() } : e)
        );
      }
    } catch (error) {
      console.error('Failed to resolve error:', error);
    }
  };

  // Acknowledge alert
  const handleAcknowledgeAlert = async (id: string) => {
    try {
      const response = await fetch(`/api/super-admin/alerts/${id}/acknowledge`, {
        method: 'POST',
      });
      if (response.ok) {
        setAlerts(prev => 
          prev.map(a => a.id === id ? { ...a, acknowledged: true, acknowledgedAt: new Date().toISOString() } : a)
        );
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  // Refresh manually
  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Super Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Real-time system monitoring and error management</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-colors ${
                  autoRefresh ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}
                title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
              >
                <Radio className="h-4 w-4" />
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${systemHealth?.status === 'healthy' ? 'bg-green-400' : systemHealth?.status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${systemHealth?.status === 'healthy' ? 'bg-green-500' : systemHealth?.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
              </span>
              <span className="capitalize">{systemHealth?.status || 'unknown'}</span>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="System Status"
            value={systemHealth?.status || 'Unknown'}
            icon={systemHealth?.status === 'healthy' ? CheckCircle : systemHealth?.status === 'degraded' ? AlertTriangle : XCircle}
            color={systemHealth?.status === 'healthy' ? 'bg-green-500' : systemHealth?.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}
          />
          <StatCard
            label="Active Alerts"
            value={alerts.filter(a => !a.acknowledged).length}
            icon={AlertTriangle}
            color="bg-orange-500"
          />
          <StatCard
            label="Unresolved Errors"
            value={errorLogs.filter(e => !e.resolved).length}
            icon={Bug}
            color="bg-red-500"
          />
          <StatCard
            label="Active Tenants"
            value={tenantHealth.filter(t => t.status === 'healthy').length}
            icon={Users}
            color="bg-blue-500"
          />
        </div>

        {/* Services Status */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <ServiceCard
            name="Database"
            icon={Database}
            status={systemHealth?.services.database.status || 'down'}
            metrics={{
              'Connections': systemHealth?.services.database.connections || 0,
              'Latency': `${systemHealth?.services.database.latency || 0}ms`,
            }}
          />
          <ServiceCard
            name="Redis"
            icon={DatabaseZap}
            status={systemHealth?.services.redis.status || 'down'}
            metrics={{
              'Memory': `${systemHealth?.services.redis.memory || 0}MB`,
              'Latency': `${systemHealth?.services.redis.latency || 0}ms`,
            }}
          />
          <ServiceCard
            name="App Server"
            icon={Server}
            status={systemHealth?.services.app.status || 'down'}
            metrics={{
              'Uptime': `${Math.floor((systemHealth?.services.app.uptime || 0) / 3600)}h`,
              'Memory': `${systemHealth?.services.app.memory || 0}%`,
            }}
          />
          <ServiceCard
            name="Nginx"
            icon={Globe}
            status={systemHealth?.services.nginx.status || 'down'}
            metrics={{
              'Requests': systemHealth?.services.nginx.requests || 0,
              'Errors': systemHealth?.services.nginx.errors || 0,
            }}
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-4">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'errors', label: 'Errors', icon: Bug },
              { id: 'alerts', label: 'Alerts', icon: Bell },
              { id: 'tenants', label: 'Tenants', icon: Users },
              { id: 'performance', label: 'Performance', icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  selectedTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.id === 'errors' && errorLogs.filter(e => !e.resolved).length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {errorLogs.filter(e => !e.resolved).length}
                  </span>
                )}
                {tab.id === 'alerts' && alerts.filter(a => !a.acknowledged).length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                    {alerts.filter(a => !a.acknowledged).length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {/* Alerts Tab */}
          {(selectedTab === 'overview' || selectedTab === 'alerts') && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700">Active Alerts</h3>
              <AnimatePresence>
                {alerts.filter(a => !a.acknowledged).length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No active alerts</p>
                    <p className="text-sm">All systems are operational</p>
                  </div>
                ) : (
                  alerts.filter(a => !a.acknowledged).map((alert) => (
                    <AlertBanner
                      key={alert.id}
                      alert={alert}
                      onAcknowledge={handleAcknowledgeAlert}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Errors Tab */}
          {(selectedTab === 'overview' || selectedTab === 'errors') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">Error Logs</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="error">Errors</option>
                    <option value="warning">Warnings</option>
                    <option value="info">Info</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {filteredErrors.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No errors found</p>
                    <p className="text-sm">All systems are running smoothly</p>
                  </div>
                ) : (
                  filteredErrors.map((log) => (
                    <ErrorLogItem
                      key={log.id}
                      log={log}
                      onResolve={handleResolveError}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tenants Tab */}
          {(selectedTab === 'overview' || selectedTab === 'tenants') && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Tenant Health</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tenantHealth.map((tenant) => (
                  <motion.div
                    key={tenant.tenantId}
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 rounded-xl border ${
                      tenant.status === 'healthy' 
                        ? 'border-green-200 bg-green-50/50' 
                        : tenant.status === 'degraded' 
                        ? 'border-yellow-200 bg-yellow-50/50' 
                        : 'border-red-200 bg-red-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-800">{tenant.tenantName}</h4>
                      <StatusIndicator status={tenant.status} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Active Exams</span>
                        <p className="font-bold">{tenant.activeExams}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Active Users</span>
                        <p className="font-bold">{tenant.activeUsers}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Modules</span>
                        <p className="text-xs text-gray-600 truncate">{tenant.modules.join(', ')}</p>
                      </div>
                      {tenant.lastError && (
                        <div className="col-span-2 mt-1">
                          <span className="text-xs text-red-500">⚠️ {tenant.lastError}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {(selectedTab === 'overview' || selectedTab === 'performance') && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Performance Metrics</h3>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500">Endpoint</th>
                        <th className="text-left py-2 px-3 text-gray-500">Method</th>
                        <th className="text-left py-2 px-3 text-gray-500">Response Time</th>
                        <th className="text-left py-2 px-3 text-gray-500">Status</th>
                        <th className="text-left py-2 px-3 text-gray-500">Users</th>
                        <th className="text-left py-2 px-3 text-gray-500">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceMetrics.slice(0, 20).map((metric) => (
                        <tr key={metric.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 font-mono text-xs">{metric.endpoint}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              metric.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                              metric.method === 'POST' ? 'bg-green-100 text-green-700' :
                              metric.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                              metric.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {metric.method}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`font-mono ${
                              metric.responseTime < 200 ? 'text-green-600' :
                              metric.responseTime < 500 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {metric.responseTime}ms
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`${
                              metric.statusCode < 400 ? 'text-green-600' :
                              metric.statusCode < 500 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {metric.statusCode}
                            </span>
                          </td>
                          <td className="py-2 px-3">{metric.userCount}</td>
                          <td className="py-2 px-3 text-xs text-gray-400">
                            {formatDistanceToNow(new Date(metric.timestamp), { addSuffix: true })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
