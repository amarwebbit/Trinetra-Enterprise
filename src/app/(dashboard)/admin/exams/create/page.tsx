import { redirect } from 'next/navigation';

export default function AdminCreateExamPage() {
  // Admin cannot create exams, redirect to admin dashboard
  redirect('/admin');
}
