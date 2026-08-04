import { Resend } from 'resend';
import { ImportError } from '@/lib/queue/progress-tracker';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock');

export async function sendImportCompletionEmail(
  email: string,
  data: {
    type: 'students' | 'questions';
    total: number;
    success: number;
    failed: number;
    errors: ImportError[];
    fileUrl?: string;
  }
): Promise<void> {
  const subject = `✅ Import ${data.type === 'students' ? 'Students' : 'Questions'} Completed`;
  
  let errorHtml = '';
  if (data.errors.length > 0) {
    errorHtml = `
      <h3>⚠️ Errors (${data.failed})</h3>
      <ul>
        ${data.errors.slice(0, 20).map(e => `
          <li>Row ${e.row}: ${e.field} - ${e.message} (Value: "${e.value}")</li>
        `).join('')}
        ${data.failed > 20 ? `<li>... and ${data.failed - 20} more errors</li>` : ''}
      </ul>
    `;
  }
  
  try {
    await resend.emails.send({
      from: 'ExaminAI <notifications@examin.ai>', // If this domain is not verified, it might throw in production, but we keep it per spec
      to: email,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563EB;">📊 Import Summary</h2>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
            <p><strong>Total:</strong> ${data.total}</p>
            <p style="color: green;"><strong>✅ Success:</strong> ${data.success}</p>
            <p style="color: red;"><strong>❌ Failed:</strong> ${data.failed}</p>
            <p><strong>⏱️ Completed:</strong> ${new Date().toLocaleString()}</p>
          </div>
          ${errorHtml}
          ${data.fileUrl ? `<p>📄 <a href="${data.fileUrl}">Download error report</a></p>` : ''}
          <p style="margin-top: 20px; color: #64748b; font-size: 12px;">
            This is an automated message from ExaminAI.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send import completion email', error);
  }
}
