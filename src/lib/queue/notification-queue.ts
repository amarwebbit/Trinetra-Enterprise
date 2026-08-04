import { Queue, Worker, Job } from 'bullmq';
import { redis } from '@/lib/redis/client';
import { prisma } from '@/lib/db/client';
import { sendEmail } from '@/lib/email/send-email';

const QUEUE_NAME = 'scheduled-notifications';

export const notificationQueue = new Queue(QUEUE_NAME, {
  connection: redis,
});

export const notificationWorker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    const { recipients, subject, message, channel } = job.data;
    console.log(`Processing scheduled notification job ${job.id}`);
    
    if (channel === 'email' || channel === 'both') {
      for (const recipient of recipients) {
        if (recipient.email) {
          await sendEmail({
            to: recipient.email,
            subject,
            html: message,
          });
        }
      }
    }
    
    // Update the notification status in the DB
    await prisma.notifications.updateMany({
      where: {
        title: subject,
        content: message,
        is_sent: false,
      },
      data: {
        is_sent: true,
        sent_at: new Date(),
      }
    });
    
    return { processed: recipients.length };
  },
  { connection: redis }
);

notificationWorker.on('completed', job => {
  console.log(`Job ${job.id} has completed!`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});
