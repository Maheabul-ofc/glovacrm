import { NextRequest, NextResponse } from 'next/server';

// Max time to wait for backend (Render free tier cold starts take ~25-30s)
const BACKEND_TIMEOUT_MS = 60000;

// Retry config for transient errors (429 / 503 / timeout)
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2000, 5000, 10000]; // exponential-ish backoff

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');

  // Read body once — we may need to retry with it
  const body = ['GET', 'HEAD'].includes(req.method)
    ? undefined
    : await req.arrayBuffer();

  let lastError: any = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(
        targetUrl,
        {
          method: req.method,
          headers,
          body: body ? body.slice(0) : undefined, // clone ArrayBuffer for retry
          // @ts-ignore
          duplex: 'half',
        },
        BACKEND_TIMEOUT_MS
      );

      // If 429 or 503 and we have retries left, wait and retry
      if ((response.status === 429 || response.status === 503) && attempt < MAX_RETRIES) {
        const delayMs = RETRY_DELAYS_MS[attempt] || 5000;
        console.log(`[API Proxy] ${response.status} on attempt ${attempt + 1}, retrying in ${delayMs}ms...`);
        await sleep(delayMs);
        continue;
      }

      // If still 429 after all retries, return friendly message
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Server is busy — please wait 30 seconds and try again.' },
          { status: 429 }
        );
      }

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
      lastError = err;

      // Timeout / abort — retry if attempts remain
      if ((err.name === 'AbortError' || err.message?.includes('abort')) && attempt < MAX_RETRIES) {
        const delayMs = RETRY_DELAYS_MS[attempt] || 5000;
        console.log(`[API Proxy] Timeout on attempt ${attempt + 1}, retrying in ${delayMs}ms...`);
        await sleep(delayMs);
        continue;
      }

      // Connection refused / network error — retry
      if (attempt < MAX_RETRIES && (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || err.message?.includes('fetch failed'))) {
        const delayMs = RETRY_DELAYS_MS[attempt] || 5000;
        console.log(`[API Proxy] Connection error on attempt ${attempt + 1}, retrying in ${delayMs}ms...`);
        await sleep(delayMs);
        continue;
      }
    }
  }

  // All retries exhausted
  console.error(`[API Proxy Error] ${req.method} ${targetUrl} failed after ${MAX_RETRIES + 1} attempts:`, lastError?.message);

  if (lastError?.name === 'AbortError' || lastError?.message?.includes('abort')) {
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

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
