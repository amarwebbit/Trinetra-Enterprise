import { sendGlobalNotification } from '@/app/actions/notification-actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super_admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const result = await sendGlobalNotification(body);
    
    return Response.json(result);
  } catch (error: any) {
    console.error('API Send Error:', error);
    return Response.json({ error: error.message || 'Failed to send notification' }, { status: 500 });
  }
}
