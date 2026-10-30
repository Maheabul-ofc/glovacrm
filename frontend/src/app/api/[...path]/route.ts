import { NextRequest, NextResponse } from 'next/server';

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

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      // @ts-ignore
      duplex: 'half',
    });

    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json';

    return new NextResponse(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (err: any) {
    console.error(`[API Proxy Error] ${req.method} ${targetUrl} failed:`, err.message);
    return NextResponse.json(
      {
        error: `Cannot connect to Backend API (127.0.0.1:5000): ${err.message}. Please check if backend is running.`,
      },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
