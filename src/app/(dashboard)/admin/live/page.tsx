'use client';

import { useState, useEffect } from 'react';
import { LiveMonitoringUI } from '@/app/(dashboard)/teacher/live/LiveMonitoringUI';
import { toast } from 'sonner';

export default function AdminLiveMonitoringPage() {
  const [students, setStudents] = useState([]);
  const [availableExams, setAvailableExams] = useState([]);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [studentsRes, examsRes, teachersRes, deptsRes] = await Promise.all([
        fetch('/api/admin/live/students'),
        fetch('/api/admin/live/exams'),
        fetch('/api/admin/live/teachers'),
        fetch('/api/admin/live/departments'),
      ]);

      const studentsData = await studentsRes.json();
      const examsData = await examsRes.json();
      const teachersData = await teachersRes.json();
      const deptsData = await deptsRes.json();

      if (studentsData.success) setStudents(studentsData.students);
      if (examsData.success) setAvailableExams(examsData.exams);
      if (teachersData.success) setAvailableTeachers(teachersData.teachers);
      if (deptsData.success) setAvailableDepartments(deptsData.departments);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      toast.error('Failed to load live monitoring data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading live monitoring...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Live Monitoring</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor all active exams across the institution in real-time</p>
      </div>
      <LiveMonitoringUI
        userRole="admin"
        initialStudents={students}
        availableExams={availableExams}
        availableTeachers={availableTeachers}
        availableDepartments={availableDepartments}
      />
    </div>
  );
}
