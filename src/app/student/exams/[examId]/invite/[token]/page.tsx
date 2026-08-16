'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle, Clock, ShieldCheck, Timer, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { signIn } from 'next-auth/react';

export default function StudentInvitePage() {
  const { examId, token } = useParams() as { examId: string; token: string };
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [examDetails, setExamDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAttempt, setHasAttempt] = useState(false);

  // Form fields matching Image 3
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [branch, setBranch] = useState('CSE');
  const [section, setSection] = useState('3A');
  const [isSeededUser, setIsSeededUser] = useState(false);

  // Live Countdown state
  const [secondsUntilStart, setSecondsUntilStart] = useState<number>(0);

  useEffect(() => {
    const fetchExamDetails = async () => {
      try {
        const response = await fetch(`/api/student/exams/invite/${examId}/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to load exam details');
          setIsLoading(false);
          return;
        }

        setExamDetails(data.data);
        setHasAttempt(!!data.data.existingAttempt);

        if (data.data.studentEmail) {
          setEmail(data.data.studentEmail);
        }
        if (data.data.studentName) {
          setFullName(data.data.studentName);
        }

        if (data.data.start_time) {
          const startMs = new Date(data.data.start_time).getTime();
          const nowMs = Date.now();
          const diffSec = Math.max(0, Math.floor((startMs - nowMs) / 1000));
          setSecondsUntilStart(diffSec);
        }
      } catch (e) {
        setError('Network error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExamDetails();
  }, [examId, token]);

  // Live ticking countdown timer
  useEffect(() => {
    if (secondsUntilStart <= 0) return;

    const timer = setInterval(() => {
      setSecondsUntilStart((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsUntilStart]);

  // Lookup seeded student details when Roll Number or Email changes
  const checkSeededStudent = useCallback(async (identifier: string) => {
    if (!identifier || identifier.length < 3 || !examDetails?.tenant_id) return;
    try {
      const res = await fetch(`/api/student/exams/lookup-student?tenantId=${examDetails.tenant_id}&identifier=${encodeURIComponent(identifier)}`);
      const data = await res.json();
      if (data.found && data.student) {
        setFullName(data.student.fullName || '');
        if (data.student.email) setEmail(data.student.email);
        if (data.student.rollNumber) setRollNumber(data.student.rollNumber);
        if (data.student.branch) setBranch(data.student.branch);
        if (data.student.section) setSection(data.student.section);
        setIsSeededUser(true);
        toast.success(`Seeded student record found for ${data.student.fullName}`);
      }
    } catch {
      // Ignore lookup errors
    }
  }, [examDetails?.tenant_id]);

  const handleJoinExam = async () => {
    if (!fullName.trim() || !rollNumber.trim() || !email.trim()) {
      toast.error('Please fill in all mandatory fields');
      return;
    }

    setIsJoining(true);
    try {
      const response = await fetch('/api/student/exams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          token,
          rollNumber: rollNumber.trim(),
          studentName: fullName.trim(),
          email: email.trim(),
          branch,
          section,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to join exam');
        setIsJoining(false);
        return;
      }

      if (data.alreadySubmitted && data.redirectUrl) {
        // Sign in first to ensure they have NextAuth portal session
        await signIn('credentials', {
          redirect: false,
          email: rollNumber.trim(),
          password: rollNumber.trim(),
        });
        toast.info('You have already submitted this exam. Redirecting...');
        router.push(data.redirectUrl);
        return;
      }

      // Establish a fully authenticated NextAuth session for the student
      await signIn('credentials', {
        redirect: false,
        email: rollNumber.trim(),
        password: rollNumber.trim(),
      });

      // Redirect to exam — attempt already created by join API
      toast.success('Verified! Starting your exam...');
      router.push(`/student/exams/${data.attemptId}/take`);
    } catch (e) {
      toast.error('Network error. Please try again.');
      setIsJoining(false);
    }
  };


  const formatCountdown = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) return `${pad(hours)}h:${pad(minutes)}m:${pad(seconds)}s`;
    return `${pad(minutes)}m:${pad(seconds)}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-[#1c3b70]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-slate-100 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-red-200 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Invite Link Error</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => router.push('/student/dashboard')}
            className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors text-sm"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isExamLiveLocked = secondsUntilStart > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f2f5f9] font-sans">
      {/* Registration Card (Matching Image 3) */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1f305e] tracking-tight">Exam Registration</h1>
          <p className="text-xs text-slate-500 mt-1">
            Fill the required fields to begin your exam. All fields are mandatory.
          </p>
        </div>

        {isSeededUser && (
          <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Seeded Student Record Verified</span>
          </div>
        )}

        {isExamLiveLocked && (
          <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-amber-600 animate-pulse" />
              <span className="text-xs font-bold text-amber-900">Starts in</span>
            </div>
            <span className="text-sm font-mono font-black text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300">
              {formatCountdown(secondsUntilStart)}
            </span>
          </div>
        )}

        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1c3b70] transition-all"
              required
            />
          </div>

          {/* University Roll Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">University Roll Number</label>
            <input
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              onBlur={(e) => checkSeededStudent(e.target.value)}
              placeholder="University Roll Number"
              className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1c3b70] transition-all"
              required
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => checkSeededStudent(e.target.value)}
              placeholder="Email Address"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1c3b70] transition-all"
              required
            />
          </div>

          {/* Branch / Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Branch / Department</label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#1c3b70] transition-all"
              required
            >
              <option value="CSE">CSE</option>
              <option value="IT">IT</option>
              <option value="ECE">ECE</option>
              <option value="ME">ME</option>
              <option value="CE">CE</option>
              <option value="EEE">EEE</option>
              <option value="AIDS">AIDS</option>
              <option value="AIML">AIML</option>
              <option value="General">General</option>
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#1c3b70] transition-all"
              required
            >
              <option value="1A">1A</option>
              <option value="1B">1B</option>
              <option value="2A">2A</option>
              <option value="2B">2B</option>
              <option value="3A">3A</option>
              <option value="3B">3B</option>
              <option value="4A">4A</option>
              <option value="4B">4B</option>
              <option value="Section A">Section A</option>
              <option value="Section B">Section B</option>
            </select>
          </div>

          {/* Action Button */}
          <div className="pt-3">
            <button
              onClick={handleJoinExam}
              disabled={isJoining || isExamLiveLocked}
              className="w-full py-3 bg-[#1b3e74] hover:bg-[#14305c] active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying Registration...
                </>
              ) : isExamLiveLocked ? (
                `Exam Starts in ${formatCountdown(secondsUntilStart)}`
              ) : (
                'Continue to Instructions'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
