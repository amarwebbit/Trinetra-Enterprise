import { NextRequest, NextResponse } from 'next/server';

interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface MetricBatch {
  metrics: Metric[];
  timestamp: number;
  source: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload: MetricBatch = await request.json();

    if (!payload.metrics || !Array.isArray(payload.metrics)) {
      return NextResponse.json(
        { error: 'Invalid metrics payload' },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metrics] Received ${payload.metrics.length} metrics from ${payload.source}`);
    }

    return NextResponse.json({
      success: true,
      received: payload.metrics.length,
    });

  } catch (error) {
    console.error('Metrics endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to process metrics' },
      { status: 500 }
    );
  }
}
