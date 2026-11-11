'use client';

import { useEffect } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://glovacrm-backend.onrender.com';
const PING_INTERVAL_MS = 10 * 60 * 1000; // ping every 10 minutes

/**
 * KeepAlive - Pings the backend every 10 minutes so Render free tier
 * never goes to sleep. This prevents the "Server is busy" / 429 error
 * on login after periods of inactivity.
 */
export default function KeepAlive() {
  useEffect(() => {
    const ping = async () => {
      try {
        await fetch(`${BACKEND_URL}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(10000),
        });
      } catch (_) {
        // Silent — this is just a keep-alive, ignore errors
      }
    };

    // Ping immediately on mount (wakes up server when user opens the app)
    ping();

    // Then ping every 10 minutes
    const interval = setInterval(ping, PING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null; // No UI — invisible component
}
