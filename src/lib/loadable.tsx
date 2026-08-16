import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const Loading = () => (
  <div className="space-y-4 p-8 w-full max-w-4xl mx-auto">
    <Skeleton variant="card" height={120} className="w-full" />
    <Skeleton variant="text" height={18} count={3} className="w-full" />
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
