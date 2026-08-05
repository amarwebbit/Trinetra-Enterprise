'use client';

import { InlineMessage } from './InlineMessage';

interface ErrorMessageProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  variant?: 'inline' | 'page';
}

export function ErrorMessage({
  title = 'Something went wrong',
  message,
  details,
  onRetry,
  variant = 'inline',
}: ErrorMessageProps) {
  if (variant === 'page') {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full">
          <InlineMessage
            type="error"
            title={title}
            message={message}
            details={details}
            dismissible={false}
          />
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <InlineMessage
      type="error"
      title={title}
      message={message}
      details={details}
      onDismiss={onRetry}
    />
  );
}
