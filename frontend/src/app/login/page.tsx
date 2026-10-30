'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // Catch any client-side JavaScript error on mobile and show it
  useEffect(() => {
    window.onerror = (msg, url, line) => {
      window.alert(`Script Error on phone: ${msg} at line ${line}`);
    };
  }, []);

  const handleTestConnection = async () => {
    setTestStatus('Checking /api/health...');
    try {
      const res = await fetch('/api/health');
      const text = await res.text();
      const statusMsg = `Backend status (${res.status}): ${text}`;
      setTestStatus(statusMsg);
      window.alert(`Connection Result: ${statusMsg}`);
    } catch (e: any) {
      const errText = `Failed: ${e.message}`;
      setTestStatus(errText);
      window.alert(`Connection Error: ${errText}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

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
      window.alert('Login Successful! Redirecting...');

      // Redirect cleanly
      if (data.user?.role === 'SUPER_ADMIN') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.message || 'Login failed. Please check credentials or backend.';
      setErrorMsg(msg);
      window.alert(`Sign-in Error:\n${msg}`);
    } finally {
      setIsLoading(false);
    }
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
          <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded-lg text-sm font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        {testStatus && (
          <div className="p-2 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-mono">
            {testStatus}
          </div>
        )}

        <form className="space-y-4" action="/api/auth/login-form" method="POST" onSubmit={handleSubmit}>
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
            {isLoading ? 'Signing in...' : 'Sign in'}
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
