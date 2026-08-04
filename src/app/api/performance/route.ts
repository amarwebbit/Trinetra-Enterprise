import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Log performance metrics
    console.log('[Performance]', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to log performance' }, { status: 500 });
  }
}
