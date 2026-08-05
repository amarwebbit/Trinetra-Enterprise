import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth handlers
  http.post('/api/auth/login', async ({ request }: { request: Request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'student',
        },
        token: 'mock-jwt-token',
      });
    }
    return new HttpResponse(null, { status: 401 });
  }),

  // Exam handlers
  http.get('/api/exams', () => {
    return HttpResponse.json({
      exams: [
        { id: '1', title: 'Test Exam 1', status: 'active' },
        { id: '2', title: 'Test Exam 2', status: 'published' },
      ],
    });
  }),

  // User handlers
  http.get('/api/user/profile', () => {
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'student',
    });
  }),
];
