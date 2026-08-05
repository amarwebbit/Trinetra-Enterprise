'use client';

import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

type MessageType = 'success' | 'error' | 'warning' | 'info';

interface InlineMessageProps {
  type: MessageType;
  title?: string;
  message: string;
  details?: string;
  onDismiss?: () => void;
  className?: string;
  dismissible?: boolean;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'text-green-500',
    detail: 'text-green-600',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'text-red-500',
    detail: 'text-red-600',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: 'text-yellow-500',
    detail: 'text-yellow-600',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-500',
    detail: 'text-blue-600',
  },
};

export function InlineMessage({
  type,
  title,
  message,
  details,
  onDismiss,
  className = '',
  dismissible = true,
}: InlineMessageProps) {
  const Icon = iconMap[type];
  const colors = colorMap[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl p-4 border ${colors.bg} ${colors.border} ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${colors.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`text-sm font-medium ${colors.text}`}>{title}</h4>
          )}
          <p className={`text-sm ${colors.text} ${title ? 'mt-0.5' : ''}`}>{message}</p>
          {details && (
            <div className={`mt-2 text-xs ${colors.detail} bg-white/50 rounded-lg p-2 font-mono overflow-x-auto`}>
              {details}
            </div>
          )}
        </div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 ${colors.text} opacity-50 hover:opacity-100 transition-opacity`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
