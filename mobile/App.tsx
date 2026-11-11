import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StatusBar,
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  BackHandler,
  Linking,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { monitorCall } from './src/services/CallDetector';

const CRM_URL = 'https://glovacrm-frontend.onrender.com';
const BACKEND_URL = 'https://glovacrm-backend.onrender.com';

const MAX_AUTO_RETRIES = 4;
const RETRY_DELAY_MS = 8000;

// ─── Loading / Error Views ────────────────────────────────────────────────────

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

// ─── Toast overlay ────────────────────────────────────────────────────────────

function CallToast({ visible, message, success }: { visible: boolean; message: string; success: boolean }) {
  if (!visible) return null;
  return (
    <View style={[styles.toast, success ? styles.toastSuccess : styles.toastError]}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [showError, setShowError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callInProgressRef = useRef(false);

  const [toast, setToast] = useState({ visible: false, message: '', success: true });

  const showToast = useCallback((message: string, success: boolean) => {
    setToast({ visible: true, message, success });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 4500);
  }, []);

  // ── Permissions ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      ]).catch(() => {});
    }
  }, []);

  // ── Android Back Button ─────────────────────────────────────────────────────
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

  useEffect(() => () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  }, []);

  // ── WebView load handlers ───────────────────────────────────────────────────
  const doReload = useCallback((nextRetry: number) => {
    setRetryCount(nextRetry);
    setLoading(true);
    setShowError(false);
    setWebViewKey(k => k + 1);
  }, []);

  const handleLoadError = useCallback(() => {
    if (retryCount < MAX_AUTO_RETRIES) {
      retryTimerRef.current = setTimeout(() => doReload(retryCount + 1), RETRY_DELAY_MS);
    } else {
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

  // ── Auto Call Detection ─────────────────────────────────────────────────────
  /**
   * This is called when the web app sends postMessage({type:'INITIATE_CALL', phone, leadId})
   * OR when a tel: link is tapped in the WebView.
   */
  const handleInitiateCall = useCallback(async (phone: string, leadId?: string) => {
    if (callInProgressRef.current) return;
    callInProgressRef.current = true;

    const cleanPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
    if (!cleanPhone) {
      callInProgressRef.current = false;
      return;
    }

    try {
      showToast('📞 Dialing... Auto-tracking call duration', true);

      // Start native phone state monitoring
      const callPromise = monitorCall(cleanPhone);

      // Open Android dialer
      await Linking.openURL(`tel:${cleanPhone}`);

      // Wait for call to end (native TelephonyManager detects it)
      const result = await callPromise;
      callInProgressRef.current = false;

      const durationStr = result.duration > 0
        ? `${Math.floor(result.duration / 60)}m ${result.duration % 60}s`
        : '0s';

      const statusEmoji = { COMPLETED: '✅', MISSED: '📵', FAILED: '❌', BUSY: '🔴' }[result.status] || '📞';
      showToast(`${statusEmoji} ${result.status} · ${durationStr} — Saving automatically...`, result.status === 'COMPLETED');

      // 1. Inject event into WebView so CallTimerModal auto-fills and closes
      //    (fires GLOVA_CALL_SYNCED which the modal already listens for)
      const syncScript = `
        (function() {
          window.dispatchEvent(new CustomEvent('GLOVA_CALL_SYNCED', {
            detail: {
              status: '${result.status}',
              duration: ${result.duration},
              phone: '${cleanPhone}',
              leadId: ${leadId ? `'${leadId}'` : 'null'},
              autoLogged: true
            }
          }));
        })();
        true;
      `;
      webViewRef.current?.injectJavaScript(syncScript);

      // 2. Also directly POST to backend via injected JS (uses the web app's own token)
      const backendLogScript = `
        (async function() {
          try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;
            await fetch('${BACKEND_URL}/api/calls/auto-log', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify({
                phone: '${cleanPhone}',
                leadId: ${leadId ? `'${leadId}'` : 'null'},
                status: '${result.status}',
                duration: ${result.duration},
                direction: 'OUTBOUND',
                provider: 'ANDROID_AUTO',
                notes: 'Auto-detected by GlovaCRM Android app'
              })
            });
          } catch(e) {}
        })();
        true;
      `;
      webViewRef.current?.injectJavaScript(backendLogScript);

    } catch (err) {
      callInProgressRef.current = false;
      // Fallback: just open dialer without auto-tracking
      Linking.openURL(`tel:${cleanPhone}`).catch(() => {});
    }
  }, [showToast]);

  // ── Handle postMessage from WebView (INITIATE_CALL event) ──────────────────
  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'INITIATE_CALL' && data.phone) {
        handleInitiateCall(data.phone, data.leadId);
      }
    } catch (_) {}
  }, [handleInitiateCall]);

  // ── Intercept tel: links (fallback for direct <a href="tel:"> clicks) ───────
  const handleShouldStartLoad = useCallback((request: { url: string }) => {
    const { url } = request;
    if (url.startsWith('tel:')) {
      const phone = decodeURIComponent(url.replace('tel:', ''));
      handleInitiateCall(phone);
      return false;
    }
    if (url.startsWith('mailto:')) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    return true;
  }, [handleInitiateCall]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

        <CallToast visible={toast.visible} message={toast.message} success={toast.success} />

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
                if (nativeEvent.statusCode >= 500 || nativeEvent.statusCode === 429) {
                  handleLoadError();
                } else {
                  handleLoad();
                }
              }}
              onNavigationStateChange={(navState: WebViewNavigation) => {
                setCanGoBack(navState.canGoBack);
              }}
              // ★ Receive postMessage from web app (INITIATE_CALL)
              onMessage={handleWebViewMessage}
              // ★ Intercept tel: links directly in WebView
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              allowFileAccess={true}
              allowFileAccessFromFileURLs={true}
              allowUniversalAccessFromFileURLs={true}
              scalesPageToFit={false}
              mixedContentMode="always"
              userAgent="Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36 GlovaCRM/1.0"
              startInLoadingState={false}
              renderLoading={() => <View />}
              setSupportMultipleWindows={false}
            />
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  webview: { flex: 1, backgroundColor: '#0f172a' },
  hidden: { opacity: 0, height: 0, flex: 0 },
  loadingContainer: {
    flex: 1, backgroundColor: '#0f172a',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  logoBox: { flexDirection: 'row', alignItems: 'center' },
  logoText: { fontSize: 42, fontWeight: '800', color: '#ffffff', letterSpacing: 1 },
  logoAccent: { fontSize: 42, fontWeight: '800', color: '#14b8a6', letterSpacing: 1 },
  loadingText: { marginTop: 16, fontSize: 18, fontWeight: '600', color: '#e2e8f0' },
  loadingSubText: { marginTop: 8, fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  wakeupBox: {
    marginTop: 24, backgroundColor: '#1e293b', borderRadius: 10,
    padding: 14, borderWidth: 1, borderColor: '#334155', maxWidth: 320,
  },
  wakeupText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  retryButton: {
    marginTop: 32, backgroundColor: '#14b8a6',
    paddingVertical: 14, paddingHorizontal: 40, borderRadius: 10,
  },
  retryText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  hintText: { marginTop: 20, fontSize: 12, color: '#475569', textAlign: 'center', maxWidth: 280, lineHeight: 18 },
  toast: {
    position: 'absolute', top: 60, left: 16, right: 16, zIndex: 999,
    borderRadius: 10, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 6,
  },
  toastSuccess: { backgroundColor: '#0f4c41', borderWidth: 1, borderColor: '#14b8a6' },
  toastError: { backgroundColor: '#4c0f0f', borderWidth: 1, borderColor: '#f87171' },
  toastText: { color: '#ffffff', fontWeight: '600', fontSize: 14, textAlign: 'center' },
});
