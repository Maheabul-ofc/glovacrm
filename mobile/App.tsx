import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StatusBar,
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  BackHandler,
  Animated,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const CRM_URL = 'https://glovacrm-frontend.onrender.com';

// Max silent auto-retries before showing error screen
const MAX_AUTO_RETRIES = 4;
// Delay between auto-retries (ms)
const RETRY_DELAY_MS = 8000;

function LoadingView({ retryCount }: { retryCount: number }) {
  const isWakingUp = retryCount > 0;
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.logoBox}>
        <Text style={styles.logoText}>Glova</Text>
        <Text style={styles.logoAccent}>CRM</Text>
      </View>
      <ActivityIndicator size="large" color="#14b8a6" style={{ marginTop: 32 }} />
      <Text style={styles.loadingText}>
        {isWakingUp ? 'Waking up server...' : 'Loading your CRM...'}
      </Text>
      <Text style={styles.loadingSubText}>
        {isWakingUp
          ? `Server is starting up, please wait...\n(attempt ${retryCount + 1} of ${MAX_AUTO_RETRIES + 1})`
          : 'Connecting to GlovaCRM server'}
      </Text>
      {isWakingUp && (
        <View style={styles.wakeupBox}>
          <Text style={styles.wakeupText}>
            ⚡ This takes 20–30 seconds on first open each day. Please be patient.
          </Text>
        </View>
      )}
    </View>
  );
}

function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.logoBox}>
        <Text style={styles.logoText}>Glova</Text>
        <Text style={styles.logoAccent}>CRM</Text>
      </View>
      <Text style={{ fontSize: 48, marginTop: 24 }}>😕</Text>
      <Text style={[styles.loadingText, { marginTop: 16, color: '#f87171' }]}>
        Server Unavailable
      </Text>
      <Text style={styles.loadingSubText}>
        The GlovaCRM server could not be reached.{'\n'}
        Please check your internet and try again.
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>🔄  Try Again</Text>
      </TouchableOpacity>
      <Text style={styles.hintText}>
        Tip: The server may need 30 seconds to wake up on first use each day.
      </Text>
    </View>
  );
}

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [showError, setShowError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // Android back button: go back in WebView history if possible
  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [canGoBack]);

  const doReload = useCallback((nextRetry: number) => {
    setRetryCount(nextRetry);
    setLoading(true);
    setShowError(false);
    setWebViewKey(k => k + 1);
  }, []);

  const handleLoadError = useCallback(() => {
    // Auto-retry silently up to MAX_AUTO_RETRIES times
    if (retryCount < MAX_AUTO_RETRIES) {
      retryTimerRef.current = setTimeout(() => {
        doReload(retryCount + 1);
      }, RETRY_DELAY_MS);
    } else {
      // All retries exhausted — show error screen
      setLoading(false);
      setShowError(true);
    }
  }, [retryCount, doReload]);

  const handleLoad = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    setLoading(false);
    setShowError(false);
    setRetryCount(0);
  }, []);

  const handleManualRetry = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    doReload(0);
  }, [doReload]);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {showError ? (
          <ErrorView onRetry={handleManualRetry} />
        ) : (
          <>
            {loading && <LoadingView retryCount={retryCount} />}
            <WebView
              key={webViewKey}
              ref={webViewRef}
              source={{ uri: CRM_URL }}
              style={[styles.webview, loading && styles.hidden]}
              onLoad={handleLoad}
              onError={handleLoadError}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                // 429 = rate limit, 503 = sleeping — treat as retriable, not fatal
                if (nativeEvent.statusCode >= 500 || nativeEvent.statusCode === 429) {
                  handleLoadError();
                } else {
                  // For other HTTP errors (4xx), still show the page
                  handleLoad();
                }
              }}
              onNavigationStateChange={handleNavigationStateChange}
              // Enable JS and DOM storage (required for React app + auth tokens)
              javaScriptEnabled={true}
              domStorageEnabled={true}
              // Allow cookies & local storage for sessions
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              // File access
              allowFileAccess={true}
              allowFileAccessFromFileURLs={true}
              allowUniversalAccessFromFileURLs={true}
              // Zoom
              scalesPageToFit={false}
              // Allow mixed content
              mixedContentMode="always"
              // Mobile browser user agent
              userAgent="Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36 GlovaCRM/1.0"
              startInLoadingState={false}
              renderLoading={() => <View />}
              setSupportMultipleWindows={false}
              onShouldStartLoadWithRequest={() => true}
            />
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  hidden: {
    opacity: 0,
    height: 0,
    flex: 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  logoBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  logoAccent: {
    fontSize: 42,
    fontWeight: '800',
    color: '#14b8a6',
    letterSpacing: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  wakeupBox: {
    marginTop: 24,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    maxWidth: 320,
  },
  wakeupText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 32,
    backgroundColor: '#14b8a6',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  hintText: {
    marginTop: 20,
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
});
