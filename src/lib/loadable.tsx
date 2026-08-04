import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const Loading = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
  </div>
);

// Lazy load heavy components with named export resolving
export const LazyGATECalculator = dynamic(
  () => import('@/components/student/GATECalculator').then(mod => mod.GATECalculator),
  {
    loading: Loading,
    ssr: false,
  }
);

export const LazyQuestionPreview = dynamic(
  () => import('@/components/teacher/QuestionPreview').then(mod => mod.QuestionPreview),
  {
    loading: Loading,
  }
);
