'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [waitingMsg, setWaitingMsg] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setTestStatus('Checking /api/health...');
    try {
      const res = await fetch('/api/health');
      const text = await res.text();
      const statusMsg = `Backend status (${res.status}): ${text}`;
      setTestStatus(statusMsg);
    } catch (e: any) {
      const errText = `Failed: ${e.message}`;
      setTestStatus(errText);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // prevent double submit
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setWaitingMsg(null);

    // Show "waking up" message after 5 seconds if still loading
    const waitTimer = setTimeout(() => {
      setWaitingMsg('⏳ Server is waking up — this can take 20–30 seconds on first load. Please wait...');
    }, 5000);

    const MAX_LOGIN_RETRIES = 3;
    const RETRY_DELAYS = [3000, 6000, 10000];
    let lastError: any = null;

    for (let attempt = 0; attempt <= MAX_LOGIN_RETRIES; attempt++) {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: email.trim(), password }),
          signal: AbortSignal.timeout(65000), // 65s client timeout
        });

        // If 429/503 and retries remain, wait and retry automatically
        if ((response.status === 429 || response.status === 503) && attempt < MAX_LOGIN_RETRIES) {
          const delay = RETRY_DELAYS[attempt] || 5000;
          setWaitingMsg(`⏳ Server is waking up — retrying automatically in ${Math.round(delay / 1000)}s...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        clearTimeout(waitTimer);
        setWaitingMsg(null);

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const errorDetail = data?.error || `Server returned error HTTP ${response.status}`;
          throw new Error(errorDetail);
        }

        if (!data?.accessToken) {
          throw new Error('No access token received from server.');
        }

        // Save token
        localStorage.setItem('accessToken', data.accessToken);
        setSuccessMsg('Login successful! Redirecting to workspace...');

        // Redirect cleanly without popup
        const destination = data.user?.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard';
        setTimeout(() => {
          window.location.href = destination;
        }, 300);
        return; // success — exit
      } catch (err: any) {
        lastError = err;
        // On timeout/network error with retries left, retry
        if (attempt < MAX_LOGIN_RETRIES && (err.name === 'TimeoutError' || err.name === 'AbortError' || err.message?.includes('fetch'))) {
          const delay = RETRY_DELAYS[attempt] || 5000;
          setWaitingMsg(`⏳ Connection issue — retrying automatically in ${Math.round(delay / 1000)}s...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
    }

    // All retries exhausted
    clearTimeout(waitTimer);
    setWaitingMsg(null);
    console.error('Login error after retries:', lastError);
    let msg = lastError?.message || 'Login failed. Please check credentials or backend.';
    if (msg.includes('429') || msg.includes('busy')) {
      msg = 'Server is still waking up. Please wait 30 seconds and try again.';
    } else if (lastError?.name === 'TimeoutError' || msg.includes('timeout') || msg.includes('abort')) {
      msg = 'Server is taking too long to respond. Please wait a moment and try again.';
    }
    setErrorMsg(msg);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div>
          <Link href="/" className="block text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              GlovaCRM
            </h2>
          </Link>
          <p className="mt-2 text-center text-sm text-gray-500">
            Sign in to access your workspace
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded-lg text-sm font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-sm font-semibold flex items-center gap-2">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        {waitingMsg && (
          <div className="p-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-lg text-sm font-medium">
            {waitingMsg}
          </div>
        )}

        {testStatus && (
          <div className="p-2 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-mono">
            {testStatus}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              placeholder="admin@glovacrm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60 text-sm shadow-md cursor-pointer mt-2"
          >
            {isLoading ? 'Signing in... (please wait)' : 'Sign in'}
          </button>

          <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-100 mt-4">
            <button
              type="button"
              onClick={handleTestConnection}
              className="text-teal-600 hover:underline font-medium p-1 cursor-pointer"
            >
              🔍 Test Server Connection
            </button>
            <Link href="/register" className="text-teal-600 font-medium hover:text-teal-700">
              Start a Free Trial
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
