'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye,
  User,
  Clock,
  AlertCircle,
  Monitor,
  Camera,
  Users,
  Filter,
  Search,
  ChevronDown,
  Calendar,
  BookOpen,
  GraduationCap
} from 'lucide-react';

interface LiveStudent {
  id: string;
  studentName: string;
  studentEmail: string;
  examTitle: string;
  examId: string;
  teacherName?: string;
  department?: string;
  startTime: string;
  status: 'in_progress' | 'submitted' | 'flagged' | 'auto_submitted';
  questionsAnswered: number;
  totalQuestions: number;
  score?: number;
  violations: number;
  lastActivity: string;
  proctoringEvents: Array<{
    type: string;
    severity: string;
    timestamp: string;
  }>;
}

interface LiveMonitoringUIProps {
  examId?: string; // Optional - if not provided, show all
  userRole: 'teacher' | 'admin';
  initialStudents: LiveStudent[];
  availableExams?: Array<{ id: string; title: string }>;
  availableTeachers?: Array<{ id: string; name: string }>;
  availableDepartments?: Array<{ id: string; name: string }>;
}

export const LiveMonitoringUI: React.FC<LiveMonitoringUIProps> = ({
  examId: propExamId,
  userRole,
  initialStudents,
  availableExams = [],
  availableTeachers = [],
  availableDepartments = [],
}) => {
  const router = useRouter();
  const [students, setStudents] = useState<LiveStudent[]>(initialStudents);
  const [selectedStudent, setSelectedStudent] = useState<LiveStudent | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>(propExamId);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'submitted' | 'flagged'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedExamId) params.append('examId', selectedExamId);
        if (selectedTeacher !== 'all') params.append('teacherId', selectedTeacher);
        if (selectedDepartment !== 'all') params.append('departmentId', selectedDepartment);
        
        const endpoint = userRole === 'admin' 
          ? '/api/admin/live/students' 
          : `/api/teacher/live/${selectedExamId || 'all'}/students`;
        
        const response = await fetch(`${endpoint}?${params.toString()}`);
        const data = await response.json();
        
        if (data.success) {
          setStudents(data.students);
          setLastUpdate(new Date());
          
          // Check for new submissions
          const newSubmissions = data.students.filter(
            (s: LiveStudent) => 
              s.status === 'submitted' && 
              !students.some(existing => existing.id === s.id && existing.status === 'submitted')
          );
          if (newSubmissions.length > 0) {
            toast.success(`${newSubmissions.length} new submission(s) received!`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch live data:', error);
      }
    };

    const interval = setInterval(fetchLiveData, 5000);
    return () => clearInterval(interval);
  }, [selectedExamId, selectedTeacher, selectedDepartment, userRole, students]);

  // Handle force submit
  const handleForceSubmit = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to force submit ${studentName}'s exam?`)) return;

    try {
      const response = await fetch('/api/teacher/live/force-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          attemptId: studentId,
          examId: selectedExamId || students.find(s => s.id === studentId)?.examId
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`${studentName}'s exam submitted successfully`);
        setStudents(prev => 
          prev.map(s => 
            s.id === studentId 
              ? { ...s, status: 'submitted' as const }
              : s
          )
        );
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to force submit');
      }
    } catch (error) {
      console.error('Force submit error:', error);
      toast.error('Failed to force submit');
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'text-yellow-500';
      case 'submitted': return 'text-green-500';
      case 'flagged': return 'text-red-500';
      case 'auto_submitted': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'submitted': return <CheckCircle className="h-4 w-4" />;
      case 'flagged': return <AlertTriangle className="h-4 w-4" />;
      case 'auto_submitted': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  // Filter students
  const filteredStudents = students
    .filter(s => filter === 'all' || s.status === filter)
    .filter(s => 
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.examTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Calculate stats
  const totalStudents = students.length;
  const inProgress = students.filter(s => s.status === 'in_progress').length;
  const submitted = students.filter(s => s.status === 'submitted').length;
  const flagged = students.filter(s => s.status === 'flagged').length;

  return (
    <div className="space-y-6">
      {/* Filters for Admin */}
      {userRole === 'admin' && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <h3 className="font-medium">Filters</h3>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam
                </label>
                <select
                  value={selectedExamId || ''}
                  onChange={(e) => setSelectedExamId(e.target.value || undefined)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Exams</option>
                  {availableExams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teacher
                </label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Teachers</option>
                  {availableTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Departments</option>
                  {availableDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Dashboard */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4`}>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total Students</span>
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold mt-2">{totalStudents}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">In Progress</span>
            <Clock className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold mt-2 text-yellow-500">{inProgress}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Submitted</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold mt-2 text-green-500">{submitted}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Flagged</span>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold mt-2 text-red-500">{flagged}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search students, exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Live
              <span className="text-xs">Updated: {lastUpdate.toLocaleTimeString()}</span>
            </div>
            <button
              onClick={() => {
                setIsRefreshing(true);
                router.refresh();
                setTimeout(() => setIsRefreshing(false), 1000);
              }}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                {userRole === 'admin' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam / Teacher
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Violations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={userRole === 'admin' ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-12 w-12 text-gray-300" />
                      <p>No students currently taking exams</p>
                      <p className="text-sm text-gray-400">Students will appear here when they start the exam</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    className={`hover:bg-gray-50 transition-colors ${
                      student.status === 'flagged' ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{student.studentName}</div>
                          <div className="text-sm text-gray-500">{student.studentEmail}</div>
                        </div>
                      </div>
                    </td>
                    
                    {userRole === 'admin' && (
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{student.examTitle}</div>
                          <div className="text-sm text-gray-500">
                            {student.teacherName || 'Unknown Teacher'}
                            {student.department && ` • ${student.department}`}
                          </div>
                        </div>
                      </td>
                    )}
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={getStatusColor(student.status)}>
                          {getStatusIcon(student.status)}
                        </span>
                        <span className="capitalize">{student.status.replace('_', ' ')}</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-32">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-600 transition-all"
                              style={{ 
                                width: `${(student.questionsAnswered / Math.max(1, student.totalQuestions)) * 100}%` 
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {student.questionsAnswered}/{student.totalQuestions}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          student.violations === 0 ? 'bg-green-100 text-green-700' :
                          student.violations < 3 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {student.violations} violations
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(student.lastActivity).toLocaleTimeString()}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {student.status === 'in_progress' && (
                          <button
                            onClick={() => handleForceSubmit(student.id, student.studentName)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Force Submit"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{selectedStudent.studentName}</h3>
                <p className="text-sm text-gray-500">{selectedStudent.studentEmail}</p>
                {selectedStudent.examTitle && (
                  <p className="text-sm text-blue-600 mt-1">{selectedStudent.examTitle}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Status</div>
                <div className="font-medium capitalize">{selectedStudent.status.replace('_', ' ')}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Progress</div>
                <div className="font-medium">{selectedStudent.questionsAnswered}/{selectedStudent.totalQuestions}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Violations</div>
                <div className="font-medium text-red-500">{selectedStudent.violations}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Started</div>
                <div className="font-medium">{new Date(selectedStudent.startTime).toLocaleTimeString()}</div>
              </div>
            </div>
            
            {selectedStudent.proctoringEvents && selectedStudent.proctoringEvents.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Recent Proctoring Events</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedStudent.proctoringEvents.slice(0, 10).map((event, index) => (
                    <div key={index} className="flex items-center justify-between text-sm border-b pb-2">
                      <span className="capitalize">{event.type.replace('_', ' ')}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        event.severity === 'high' ? 'bg-red-100 text-red-700' :
                        event.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {event.severity}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
