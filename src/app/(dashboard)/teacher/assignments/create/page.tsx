import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default async function CreateAssignmentPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  const teacherId = session.user.id;

  async function createAssignment(formData: FormData) {
    'use server';
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const branch = formData.get('branch') as string;
    const passingYearStr = formData.get('passing_year') as string;
    const content = formData.get('content') as string;
    
    // Auto-detect content type based on simple rules or just set it manually
    // We'll set a basic dropdown for content_type or infer from content
    const contentType = content.startsWith('http') 
      ? (content.endsWith('.pdf') ? 'pdf' : 'link') 
      : 'text';

    let passingYear = parseInt(passingYearStr);
    if (isNaN(passingYear) || passingYearStr === 'All') {
      passingYear = 0; // 0 represents "All Years"
    }

    await prisma.assignments.create({
      data: {
        title,
        description,
        branch,
        passing_year: passingYear,
        content,
        content_type: contentType,
        is_published: true, // Auto publish for simplicity
        teacher_id: teacherId,
        tenant_id: tenantId,
      }
    });

    redirect('/teacher/dashboard');
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="bg-card border border-border p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-6 text-foreground">Upload Assignment</h1>
        
        <form action={createAssignment} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Assignment Title</label>
            <input 
              name="title" 
              required 
              placeholder="e.g., Database Systems Practice Set 1" 
              className="w-full p-2 border border-border rounded bg-background"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Description</label>
            <textarea 
              name="description" 
              placeholder="Instructions or details..." 
              className="w-full p-2 border border-border rounded bg-background min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Target Branch</label>
              <select name="branch" className="w-full p-2 border border-border rounded bg-background">
                <option value="CSE">CSE</option>
                <option value="AIML">AIML</option>
                <option value="ECE">ECE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
                <option value="All">All Branches</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold">Passing Year</label>
              <select name="passing_year" className="w-full p-2 border border-border rounded bg-background">
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
                <option value="All">All Years</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Content (URL or Text)</label>
            <input 
              name="content" 
              required 
              placeholder="https://example.com/assignment.pdf OR write text here" 
              className="w-full p-2 border border-border rounded bg-background"
            />
            <p className="text-xs text-muted-foreground">
              If you paste a link ending in .pdf, it will be marked as a PDF. Otherwise it will be a Link or Text.
            </p>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit"
              className="bg-primary text-primary-foreground px-6 py-2 rounded font-bold hover:bg-primary/90 transition-colors"
            >
              Upload Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
