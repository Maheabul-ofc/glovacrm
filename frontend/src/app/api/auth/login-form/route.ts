import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const email = (formData.get('email') as string || '').trim();
    const password = (formData.get('password') as string || '');

    if (!email || !password) {
      return new NextResponse(
        `<html><body><script>alert("Please enter both email and password."); window.history.back();</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Call backend API
    const backendBaseUrl = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    const res = await fetch(`${backendBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.accessToken) {
      const err = data?.error || `Server error (${res.status})`;
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:30px;text-align:center;">
          <h2 style="color:#b91c1c;">Login Failed</h2>
          <p style="color:#374151;">${err}</p>
          <button onclick="window.history.back()" style="padding:10px 20px;background:#0d9488;color:#fff;border:none;border-radius:8px;cursor:pointer;">Go Back</button>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Success! Return HTML that sets localStorage and redirects
    const targetUrl = data.user?.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard';
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Logging in...</title>
</head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;">
  <div style="text-align:center;">
    <h2 style="color:#0f766e;">Login Successful! ✅</h2>
    <p style="color:#64748b;">Redirecting to your dashboard...</p>
  </div>
  <script>
    try {
      localStorage.setItem('accessToken', ${JSON.stringify(data.accessToken)});
      document.cookie = "accessToken=" + ${JSON.stringify(data.accessToken)} + "; path=/; max-age=604800";
    } catch(e) {}
    window.location.replace("${targetUrl}");
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Set-Cookie': `accessToken=${data.accessToken}; Path=/; HttpOnly=false; Max-Age=604800; SameSite=Lax`,
      },
    });
  } catch (err: any) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:30px;text-align:center;">
        <h2 style="color:#b91c1c;">Connection Error</h2>
        <p style="color:#374151;">Could not reach backend API: ${err.message}</p>
        <button onclick="window.history.back()" style="padding:10px 20px;background:#0d9488;color:#fff;border:none;border-radius:8px;">Go Back</button>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
