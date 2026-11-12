import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  BackHandler,
  Linking,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { AndroidWebViewProps, ShouldStartLoadRequest, WebViewMessageEvent } from 'react-native-webview/lib/WebViewTypes';
import {
  checkAfterAppResume,
  hasCallDetectorPermissions,
  logCallToBackend,
  monitorCall,
  stopCallMonitoring,
} from './src/services/CallDetector';

const FRONTEND_URL = 'https://glovacrm-frontend.onrender.com';
const BACKEND_URL = 'https://glovacrm-backend.onrender.com';

const INJECT_ANDROID_FLAG_JS = `
  window.__GLOVA_ANDROID_APP__ = true;
  true;
`;

interface PendingAckEntry {
  payload: Record<string, any>;
  attempts: number;
}

export default function App() {
  const webViewRef = useRef<WebView | null>(null);
  const canGoBackRef = useRef(false);
  const latestTokenRef = useRef<string | null>(null);
  const pendingAcksRef = useRef<Map<string, PendingAckEntry>>(new Map());
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [webLoading, setWebLoading] = useState(true);
  const [webError, setWebError] = useState<string | null>(null);
  const [webViewKey, setWebViewKey] = useState(0);

  const deliverPayloadToWebView = useCallback((payload: Record<string, any>) => {
    if (!webViewRef.current) return;
    const serialized = JSON.stringify(payload);
    const script = `
      (function() {
        try {
          window.__GLOVA_ANDROID_APP__ = true;
          window.dispatchEvent(new CustomEvent('GLOVA_CALL_SYNCED', { detail: ${serialized} }));
        } catch (e) {}
      })();
      true;
    `;
    webViewRef.current.injectJavaScript(script);
  }, []);

  const stopRetryLoopIfIdle = useCallback(() => {
    if (pendingAcksRef.current.size === 0 && retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const flushPendingSyncDeliveries = useCallback(() => {
    if (pendingAcksRef.current.size === 0) {
      stopRetryLoopIfIdle();
      return;
    }

    pendingAcksRef.current.forEach((entry, key) => {
      if (entry.attempts >= 12) {
        pendingAcksRef.current.delete(key);
        return;
      }
      entry.attempts += 1;
      deliverPayloadToWebView(entry.payload);
    });

    stopRetryLoopIfIdle();
  }, [deliverPayloadToWebView, stopRetryLoopIfIdle]);

  const enqueueSyncDelivery = useCallback(
    (payload: Record<string, any>) => {
      const key = String(payload.callKey || `sync-${Date.now()}`);
      pendingAcksRef.current.set(key, { payload, attempts: 1 });
      deliverPayloadToWebView(payload);

      if (!retryTimerRef.current) {
        retryTimerRef.current = setInterval(() => {
          flushPendingSyncDeliveries();
        }, 1500);
      }
    },
    [deliverPayloadToWebView, flushPendingSyncDeliveries]
  );

  const ensureCallPermissions = useCallback(async (promptSettingsOnDeny = true): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;

    const current = await hasCallDetectorPermissions();
    if (current.granted) {
      return true;
    }

    try {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
      ]);
    } catch (err) {
      console.warn('[App] Permission request error:', err);
    }

    const updated = await hasCallDetectorPermissions();
    if (!updated.granted && promptSettingsOnDeny) {
      Alert.alert(
        'Phone & Call Log Permissions Required',
        'GlovaCRM automatically verifies call status and talk duration from your device call log. Please allow Phone and Call Log permissions in App Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
        ]
      );
    }

    return updated.granted;
  }, []);

  const startTrackedCall = useCallback(
    async (params: {
      phone: string;
      leadId?: string;
      callKey?: string;
      accessToken?: string | null;
    }) => {
      const rawPhone = (params.phone || '').trim();
      const callKey = params.callKey || `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const leadId = params.leadId;

      if (params.accessToken) {
        latestTokenRef.current = params.accessToken;
      }

      if (!rawPhone) {
        enqueueSyncDelivery({
          callKey,
          callId: null,
          leadId: leadId || null,
          status: 'CANCELLED',
          duration: 0,
          phone: '',
          detectedFrom: 'NONE',
          autoSaved: false,
          cancelled: true,
        });
        return;
      }

      const granted = await ensureCallPermissions(true);
      if (!granted) {
        enqueueSyncDelivery({
          callKey,
          callId: null,
          leadId: leadId || null,
          status: 'CANCELLED',
          duration: 0,
          phone: rawPhone,
          detectedFrom: 'NONE',
          autoSaved: false,
          cancelled: true,
          permissionDenied: true,
        });
        return;
      }

      // Attach native CallLog + Telephony listeners BEFORE opening the dialer
      monitorCall(rawPhone, callKey)
        .then(async (result) => {
          if (result.status === 'CANCELLED') {
            enqueueSyncDelivery({
              callKey,
              callId: null,
              leadId: leadId || null,
              status: 'CANCELLED',
              duration: 0,
              phone: result.phone || rawPhone,
              detectedFrom: 'NONE',
              autoSaved: false,
              cancelled: true,
            });
            return;
          }

          const verifiedDuration = result.duration > 0 ? Math.round(result.duration) : 0;
          const verifiedStatus: 'COMPLETED' | 'MISSED' | 'BUSY' | 'FAILED' =
            verifiedDuration > 0
              ? 'COMPLETED'
              : result.status === 'BUSY'
                ? 'BUSY'
                : result.status === 'FAILED'
                  ? 'FAILED'
                  : 'MISSED';

          const saved = await logCallToBackend({
            apiBaseUrl: BACKEND_URL,
            accessToken: params.accessToken || latestTokenRef.current,
            phone: result.phone || rawPhone,
            leadId,
            status: verifiedStatus,
            duration: verifiedDuration,
            callKey,
            detectedFrom: result.detectedFrom,
          });

          enqueueSyncDelivery({
            callKey,
            callId: saved.callId,
            leadId: saved.leadId || leadId || null,
            status: verifiedStatus,
            duration: verifiedDuration,
            phone: result.phone || rawPhone,
            detectedFrom: result.detectedFrom,
            autoSaved: saved.ok && Boolean(saved.callId),
            cancelled: false,
          });
        })
        .catch((err) => {
          console.warn('[App] monitorCall failed:', err);
          enqueueSyncDelivery({
            callKey,
            callId: null,
            leadId: leadId || null,
            status: 'CANCELLED',
            duration: 0,
            phone: rawPhone,
            detectedFrom: 'NONE',
            autoSaved: false,
            cancelled: true,
          });
        });

      const dialablePhone = rawPhone.replace(/[^\d+*#,;]/g, '') || rawPhone;
      try {
        await Linking.openURL(`tel:${dialablePhone}`);
      } catch (err) {
        console.error('[App] Failed to open native dialer:', err);
        stopCallMonitoring();
        enqueueSyncDelivery({
          callKey,
          callId: null,
          leadId: leadId || null,
          status: 'CANCELLED',
          duration: 0,
          phone: rawPhone,
          detectedFrom: 'NONE',
          autoSaved: false,
          cancelled: true,
        });
        Alert.alert('Dialer Unavailable', 'Unable to open your phone dialer for this number.');
      }
    },
    [enqueueSyncDelivery, ensureCallPermissions]
  );

  // Warm up Render backend & request permissions on launch
  useEffect(() => {
    fetch(`${BACKEND_URL}/health`).catch(() => {});

    const keepAliveTimer = setInterval(() => {
      fetch(`${BACKEND_URL}/health`).catch(() => {});
    }, 10 * 60 * 1000);

    const permTimer = setTimeout(() => {
      ensureCallPermissions(false).catch(() => {});
    }, 800);

    return () => {
      clearInterval(keepAliveTimer);
      clearTimeout(permTimer);
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      stopCallMonitoring();
    };
  }, [ensureCallPermissions]);

  // Verify call state and flush pending call sync events whenever returning to the app
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        flushPendingSyncDeliveries();
        checkAfterAppResume().catch(() => {});
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [flushPendingSyncDeliveries]);

  // Android hardware back button navigates inside WebView before exiting
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (canGoBackRef.current && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, []);

  const handleWebViewMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'INITIATE_CALL') {
          startTrackedCall({
            phone: msg.phone,
            leadId: msg.leadId,
            callKey: msg.callKey,
            accessToken: msg.accessToken || null,
          });
          return;
        }

        if (msg.type === 'CALL_SYNC_ACK' && msg.callKey) {
          pendingAcksRef.current.delete(String(msg.callKey));
          stopRetryLoopIfIdle();
          return;
        }

        if (msg.type === 'CANCEL_CALL_MONITOR') {
          stopCallMonitoring();
          return;
        }

        if (msg.type === 'AUTH_TOKEN' && msg.accessToken) {
          latestTokenRef.current = msg.accessToken;
        }
      } catch (err) {
        console.warn('[App] Invalid message from WebView:', err);
      }
    },
    [startTrackedCall, stopRetryLoopIfIdle]
  );

  const handleShouldStartLoad = useCallback(
    (request: ShouldStartLoadRequest): boolean => {
      const url = request.url || '';

      if (url.startsWith('tel:')) {
        const telNumber = decodeURIComponent(url.replace(/^tel:/i, ''));
        startTrackedCall({ phone: telNumber });
        return false;
      }

      if (
        url.startsWith('whatsapp:') ||
        url.startsWith('https://wa.me') ||
        url.startsWith('https://api.whatsapp.com') ||
        url.startsWith('mailto:') ||
        url.startsWith('sms:')
      ) {
        Linking.openURL(url).catch(() => {});
        return false;
      }

      return true;
    },
    [startTrackedCall]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      {webError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to connect to GlovaCRM</Text>
          <Text style={styles.errorSubtitle}>{webError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setWebError(null);
              setWebLoading(true);
              setWebViewKey((k) => k + 1);
            }}
          >
            <Text style={styles.retryButtonText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          key={webViewKey}
          ref={webViewRef}
          source={{ uri: FRONTEND_URL }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          injectedJavaScriptBeforeContentLoaded={INJECT_ANDROID_FLAG_JS}
          injectedJavaScript={INJECT_ANDROID_FLAG_JS}
          onMessage={handleWebViewMessage}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onNavigationStateChange={(navState) => {
            canGoBackRef.current = Boolean(navState.canGoBack);
          }}
          onLoadStart={() => {
            setWebError(null);
          }}
          onLoadEnd={() => {
            setWebLoading(false);
            flushPendingSyncDeliveries();
          }}
          onError={(syntheticEvent) => {
            const { description } = syntheticEvent.nativeEvent;
            setWebLoading(false);
            setWebError(description || 'Please check your internet connection and try again.');
          }}
          {...({
            thirdPartyCookiesEnabled: true,
            mixedContentMode: 'compatibility',
            setSupportMultipleWindows: false,
            onRenderProcessGone: () => {
              setWebViewKey((k) => k + 1);
            },
          } as AndroidWebViewProps)}
        />
      )}

      {webLoading && !webError && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={styles.loadingText}>Loading GlovaCRM...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f766e',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});
