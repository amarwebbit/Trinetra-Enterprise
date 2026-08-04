import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const data = await resend.emails.send({
      from: 'System Admin <noreply@examin.ai>',
      to,
      subject,
      html,
    });
    
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
    return { success: false, error };
  }
}
