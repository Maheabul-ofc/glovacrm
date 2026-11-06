import { NextRequest, NextResponse } from 'next/server';

// Max time to wait for backend (Render free tier cold starts take ~25-30s)
const BACKEND_TIMEOUT_MS = 60000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = path.join('/');
  const searchParams = req.nextUrl.search;
  const backendBaseUrl = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
  const targetUrl = `${backendBaseUrl}/api/${targetPath}${searchParams}`;

  try {
    const headers = new Headers(req.headers);
    headers.delete('host');
    headers.delete('connection');
    headers.delete('content-length');

    const body = ['GET', 'HEAD'].includes(req.method)
      ? undefined
      : await req.arrayBuffer();

    const response = await fetchWithTimeout(
      targetUrl,
      {
        method: req.method,
        headers,
        body,
        // @ts-ignore
        duplex: 'half',
      },
      BACKEND_TIMEOUT_MS
    );

    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json';

    // If backend returned 429, pass it through with a friendly message
    if (response.status === 429) {
      return NextResponse.json(
        { error: 'Server is busy — please wait 30 seconds and try again.' },
        { status: 429 }
      );
    }

    return new NextResponse(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (err: any) {
    console.error(`[API Proxy Error] ${req.method} ${targetUrl} failed:`, err.message);

    // Timeout / abort
    if (err.name === 'AbortError' || err.message?.includes('abort')) {
      return NextResponse.json(
        { error: 'Backend is waking up — please wait 30 seconds and try again.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Cannot reach backend server. Please try again in a moment.' },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;