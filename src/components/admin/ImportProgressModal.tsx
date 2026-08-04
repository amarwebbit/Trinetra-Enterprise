'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function ImportProgressModal({ jobId, isOpen, onClose, type = 'users' }: {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
  type?: 'users' | 'questions';
}) {
  const [progress, setProgress] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!isOpen || !jobId) return;
    
    let interval: NodeJS.Timeout;
    
    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/admin/${type}/import/status/${jobId}`);
        const data = await response.json();
        
        if (response.ok) {
          setProgress(data);
          
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(interval);
            setTimeout(() => onClose(), 3000); // Auto-close after 3 seconds
          }
        } else {
          setError(data.error || 'Failed to fetch progress');
          clearInterval(interval);
        }
      } catch (err: any) {
        setError('Network error: Failed to fetch progress');
        clearInterval(interval);
      }
    };
    
    interval = setInterval(fetchProgress, 2000); // 2 second polling
    fetchProgress(); // initial fetch
    
    return () => clearInterval(interval);
  }, [jobId, isOpen, type, onClose]);
  
  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Import Error</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!progress) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Starting Import</DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Initializing progress tracking...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {progress.status === 'completed' ? '✅ Import Complete' :
             progress.status === 'failed' ? '❌ Import Failed' :
             '⏳ Importing...'}
          </DialogTitle>
          <DialogDescription>
            {progress.status === 'processing' 
              ? `Processing ${type === 'users' ? 'students' : 'questions'} in background. You can safely close this modal.`
              : `Import operation has finished.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-3 mb-6 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                progress.status === 'failed' ? 'bg-red-500' : 
                progress.status === 'completed' ? 'bg-green-500' : 'bg-blue-600'
              }`}
              style={{ width: `${progress.percentage || 0}%` }}
            />
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center mb-6">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div className="text-2xl font-bold text-gray-700">{progress.total}</div>
              <div className="text-xs text-gray-500 uppercase font-medium tracking-wide">Total</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <div className="text-2xl font-bold text-green-600">{progress.success}</div>
              <div className="text-xs text-green-600 uppercase font-medium tracking-wide">Success</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
              <div className="text-2xl font-bold text-red-600">{progress.failed}</div>
              <div className="text-xs text-red-600 uppercase font-medium tracking-wide">Failed</div>
            </div>
          </div>
          
          {/* Errors */}
          {progress.errors && progress.errors.length > 0 && (
            <div className="mt-4 border border-red-100 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-2 border-b border-red-100">
                <p className="font-bold text-red-700 text-sm">Errors Detected ({progress.failed})</p>
              </div>
              <div className="max-h-48 overflow-y-auto p-4 bg-white text-xs space-y-2">
                {progress.errors.slice(0, 50).map((err: any, i: number) => (
                  <div key={i} className="text-red-600 pb-2 border-b border-red-50 last:border-0 last:pb-0">
                    <span className="font-semibold inline-block w-16">Row {err.row}:</span> 
                    {err.message} <span className="text-gray-400">({err.field})</span>
                  </div>
                ))}
                {progress.errors.length > 50 && (
                  <div className="text-gray-500 font-medium pt-2 text-center">
                    ... and {progress.errors.length - 50} more errors
                  </div>
                )}
              </div>
            </div>
          )}
          
          {progress.status === 'processing' && (
            <p className="text-sm text-gray-500 mt-4 text-center font-medium">
              Processed {progress.processed} of {progress.total}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
