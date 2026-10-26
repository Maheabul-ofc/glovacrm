import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  AppState,
  AppStateStatus,
  BackHandler,
  Modal,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {
  detectCallDuration,
  requestCallPermissions,
  checkCallPermissions,
} from './src/services/callDetection';

const STORAGE_KEY_SERVER_URL = 'glovacrm_server_url';
// Default to Windows Mobile Hotspot IP
const DEFAULT_WEB_URL = 'http://192.168.137.1:3000';

interface ActiveCallInfo {
  phone: string;
  leadId?: string;
  leadName?: string;
  callId?: string;
  startTime: number;
}

export default function App() {
  const [serverUrl, setServerUrl] = useState<string>(DEFAULT_WEB_URL);
  const [urlInput, setUrlInput] = useState<string>(DEFAULT_WEB_URL);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState<boolean>(false);
  const [canGoBack, setCanGoBack] = useState<boolean>(false);

  // Active call tracking
  const activeCallRef = useRef<ActiveCallInfo | null>(null);
  const [activeCallDisplay, setActiveCallDisplay] = useState<ActiveCallInfo | null>(null);

  // Notification banner after call detection
  const [notificationBanner, setNotificationBanner] = useState<{
    message: string;
    type: 'success' | 'info';
  } | null>(null);

  // Fallback modal if OS call log didn't capture
  const [fallbackModalVisible, setFallbackModalVisible] = useState<boolean>(false);
  const [fallbackMins, setFallbackMins] = useState<string>('1');
  const [fallbackSecs, setFallbackSecs] = useState<string>('00');
  const [fallbackStatus, setFallbackStatus] = useState<'COMPLETED' | 'MISSED' | 'BUSY'>('COMPLETED');

  const webViewRef = useRef<WebView | null>(null);

  // ── 1. Initialize Server URL from Storage ─────────────────────────────────────
  useEffect(() => {
    const loadUrl = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY_SERVER_URL);
        if (saved) {
          setServerUrl(saved);
          setUrlInput(saved);
        } else {
          setServerUrl(DEFAULT_WEB_URL);
          setUrlInput(DEFAULT_WEB_URL);
        }
      } catch (err) {
        console.warn('Failed to load server URL from storage:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadUrl();
  }, []);

  // ── 2. Handle Android Hardware Back Button ────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'android') return;

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

  // ── 3. AppState Listener: Detect Call End & Query Android Call Log ───────────
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && activeCallRef.current) {
        const call = activeCallRef.current;
        console.log('[Android Call Tracker] App resumed to foreground for call:', call);

        // Wait 1.2s to ensure the carrier and Android OS finish writing the call log
        setTimeout(async () => {
          try {
            const hasPerm = await checkCallPermissions();
            if (!hasPerm) {
              await requestCallPermissions();
            }

            const result = await detectCallDuration(call.phone, call.startTime);
            console.log('[Android Call Tracker] Detection result:', result);

            if (result.found && result.duration >= 0) {
              // Successfully found the call duration in Android OS Call Log!
              handleSuccessfulCallSync(call, result.duration, result.status);
            } else {
              // Not found (or user cancelled before dialing) -> Open fallback modal
              setFallbackModalVisible(true);
            }
          } catch (err) {
            console.warn('[Android Call Tracker] Error checking call log:', err);
            setFallbackModalVisible(true);
          }
        }, 1200);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [serverUrl]);

  // ── 4. Save Call Outcome to Backend & Notify WebView ──────────────────────────
  const handleSuccessfulCallSync = async (
    call: ActiveCallInfo,
    duration: number,
    status: string
  ) => {
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const durString = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    // 1. Post to Backend API
    try {
      const apiUrl = `${serverUrl.replace(/\/+$/, '')}/api/calls/log`;
      await axios.post(apiUrl, {
        leadId: call.leadId,
        status: status || 'COMPLETED',
        duration,
        notes: `Auto-recorded via GlovaCRM Android Call Log (${durString})`,
      });
      console.log('[Android Call Tracker] Successfully logged call to backend API');
    } catch (e) {
      console.warn('[Android Call Tracker] Failed to post to backend API directly:', e);
    }

    // 2. Dispatch event into the CRM WebView so the UI updates in real-time
    const script = `
      try {
        window.dispatchEvent(new CustomEvent('GLOVA_CALL_SYNCED', {
          detail: {
            duration: ${duration},
            status: '${status || 'COMPLETED'}',
            leadId: '${call.leadId || ''}'
          }
        }));
      } catch (e) {}
      true;
    `;
    webViewRef.current?.injectJavaScript(script);

    // 3. Show native feedback banner
    showBanner(`✅ Call Recorded: ${durString} talk time logged!`, 'success');

    // Clear active call
    activeCallRef.current = null;
    setActiveCallDisplay(null);
  };

  const showBanner = (message: string, type: 'success' | 'info' = 'success') => {
    setNotificationBanner({ message, type });
    setTimeout(() => {
      setNotificationBanner(null);
    }, 5000);
  };

  // ── 5. Initiate Native SIM Call ───────────────────────────────────────────────
  const triggerNativeCall = async (
    phone: string,
    leadId?: string,
    leadName?: string,
    callId?: string
  ) => {
    if (!phone) return;

    // Request Android Call Log & Phone State permissions
    try {
      await requestCallPermissions();
    } catch (err) {
      console.warn('Permission request error:', err);
    }

    const cleanPhone = phone.trim();
    const callInfo: ActiveCallInfo = {
      phone: cleanPhone,
      leadId,
      leadName: leadName || cleanPhone,
      callId,
      startTime: Date.now(),
    };

    activeCallRef.current = callInfo;
    setActiveCallDisplay(callInfo);

    // Launch Android native phone dialer with SIM
    const telUrl = `tel:${cleanPhone}`;
    Linking.canOpenURL(telUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(telUrl);
        } else {
          showBanner('Unable to open native dialer on this device', 'info');
        }
      })
      .catch((err) => {
        console.warn('Error launching dialer:', err);
      });
  };

  // ── 6. WebView Bridge (Receiving messages from Next.js CRM) ───────────────────
  const handleWebViewMessage = (event: any) => {
    try {
      const rawData = event.nativeEvent.data;
      const data = JSON.parse(rawData);

      if (data.type === 'INITIATE_CALL') {
        console.log('[WebView Bridge] Received INITIATE_CALL:', data);
        triggerNativeCall(data.phone, data.leadId, data.leadName, data.callId);
      }
    } catch (e) {
      console.warn('[WebView Bridge] Error handling message:', e);
    }
  };

  // ── 7. Fallback Modal Submit ──────────────────────────────────────────────────
  const handleFallbackSave = () => {
    if (!activeCallRef.current) {
      setFallbackModalVisible(false);
      return;
    }
    const call = activeCallRef.current;
    const m = parseInt(fallbackMins || '0', 10);
    const s = parseInt(fallbackSecs || '0', 10);
    const totalSecs = m * 60 + s;

    handleSuccessfulCallSync(call, totalSecs, fallbackStatus);
    setFallbackModalVisible(false);
  };

  // ── 8. Test & Save Server URL ─────────────────────────────────────────────────
  const handleSaveUrl = async () => {
    let clean = urlInput.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `http://${clean}`;
    }

    setTestingConnection(true);
    try {
      // Test health endpoint
      const healthUrl = `${clean}/api/health`;
      await axios.get(healthUrl, { timeout: 5000 });
      await AsyncStorage.setItem(STORAGE_KEY_SERVER_URL, clean);
      setServerUrl(clean);
      setConnectionError(false);
      setSettingsModalVisible(false);
      showBanner(`Connected to ${clean}`, 'success');
    } catch {
      // Still allow saving even if health failed (e.g., Next.js dev server ready)
      await AsyncStorage.setItem(STORAGE_KEY_SERVER_URL, clean);
      setServerUrl(clean);
      setSettingsModalVisible(false);
      setConnectionError(false);
      showBanner(`Server URL updated. Loading...`, 'info');
    } finally {
      setTestingConnection(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0d9488" />
        <Text style={styles.loadingText}>Initializing GlovaCRM...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Top Floating Mini-Header / Status Bar */}
      <View style={styles.miniHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.statusDot} />
          <Text style={styles.headerTitle}>GlovaCRM</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => webViewRef.current?.reload()}
          >
            <Text style={styles.headerButtonText}>🔄 Reload</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              setUrlInput(serverUrl);
              setSettingsModalVisible(true);
            }}
          >
            <Text style={styles.headerButtonText}>⚙️ Server</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Call Tracker Notification Pill */}
      {activeCallDisplay && (
        <View style={styles.activeCallPill}>
          <Text style={styles.activeCallPillText}>
            📞 Call with {activeCallDisplay.leadName || activeCallDisplay.phone} (Tracking Duration...)
          </Text>
        </View>
      )}

      {/* Auto-Sync Notification Banner */}
      {notificationBanner && (
        <View
          style={[
            styles.banner,
            notificationBanner.type === 'success' ? styles.bannerSuccess : styles.bannerInfo,
          ]}
        >
          <Text style={styles.bannerText}>{notificationBanner.message}</Text>
        </View>
      )}

      {/* Main CRM Web Application */}
      {!connectionError ? (
        <WebView
          ref={webViewRef}
          source={{ uri: serverUrl }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webViewLoader}>
              <ActivityIndicator size="large" color="#0d9488" />
              <Text style={styles.loadingText}>Loading GlovaCRM...</Text>
            </View>
          )}
          onNavigationStateChange={(navState: any) => {
            setCanGoBack(navState.canGoBack);
          }}
          onMessage={handleWebViewMessage}
          onShouldStartLoadWithRequest={(request: any) => {
            // Intercept tel: links anywhere in the CRM
            if (request.url.startsWith('tel:')) {
              const phone = request.url.replace('tel:', '');
              triggerNativeCall(phone);
              return false;
            }
            return true;
          }}
          onError={() => {
            setConnectionError(true);
          }}
        />
      ) : (
        /* Connection Error / Offline Screen */
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📡</Text>
          <Text style={styles.errorTitle}>Cannot Connect to GlovaCRM</Text>
          <Text style={styles.errorSubtitle}>
            Attempted to reach: {serverUrl}
          </Text>
          <Text style={styles.errorHint}>
            Make sure your PC and phone are on the same Wi-Fi/Hotspot network and the dev server is running.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setConnectionError(false);
              webViewRef.current?.reload();
            }}
          >
            <Text style={styles.primaryBtnText}>Retry Connection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              setUrlInput(serverUrl);
              setSettingsModalVisible(true);
            }}
          >
            <Text style={styles.secondaryBtnText}>Configure Server URL</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Settings Modal (Configure Server URL) */}
      <Modal
        visible={settingsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚙️ GlovaCRM Server Settings</Text>
            <Text style={styles.modalSubtitle}>
              Configure your backend/web application address:
            </Text>

            <TextInput
              style={styles.urlInput}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="e.g. http://192.168.137.1:3000"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={styles.presetContainer}>
              <TouchableOpacity
                style={styles.presetBadge}
                onPress={() => setUrlInput('http://192.168.137.1:3000')}
              >
                <Text style={styles.presetText}>Hotspot (192.168.137.1)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetBadge}
                onPress={() => setUrlInput('http://192.168.200.1:3000')}
              >
                <Text style={styles.presetText}>Wi-Fi (192.168.200.1)</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSaveUrl}
              disabled={testingConnection}
            >
              {testingConnection ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Save & Connect</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fallback Call Confirmation Modal (If not found in OS call log) */}
      <Modal
        visible={fallbackModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFallbackModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📞 Call Outcome</Text>
            <Text style={styles.modalSubtitle}>
              Call with {activeCallDisplay?.leadName || activeCallDisplay?.phone || 'Lead'}
            </Text>

            {/* Outcome Selection */}
            <View style={styles.outcomeRow}>
              {(['COMPLETED', 'MISSED', 'BUSY'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.outcomePill,
                    fallbackStatus === s && styles.outcomePillActive,
                  ]}
                  onPress={() => setFallbackStatus(s)}
                >
                  <Text
                    style={[
                      styles.outcomePillText,
                      fallbackStatus === s && styles.outcomePillTextActive,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {fallbackStatus === 'COMPLETED' && (
              <View style={styles.durationInputRow}>
                <View style={styles.durationInputBox}>
                  <Text style={styles.durationLabel}>Minutes</Text>
                  <TextInput
                    style={styles.durationInput}
                    keyboardType="numeric"
                    value={fallbackMins}
                    onChangeText={setFallbackMins}
                  />
                </View>
                <Text style={styles.durationColon}>:</Text>
                <View style={styles.durationInputBox}>
                  <Text style={styles.durationLabel}>Seconds</Text>
                  <TextInput
                    style={styles.durationInput}
                    keyboardType="numeric"
                    value={fallbackSecs}
                    onChangeText={setFallbackSecs}
                  />
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.primaryBtn} onPress={handleFallbackSave}>
              <Text style={styles.primaryBtnText}>Confirm & Save Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  miniHeader: {
    height: 48,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  headerButtonText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  webView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webViewLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 12,
  },
  activeCallPill: {
    backgroundColor: '#0284c7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  activeCallPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  banner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bannerSuccess: {
    backgroundColor: '#059669',
  },
  bannerInfo: {
    backgroundColor: '#0284c7',
  },
  bannerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 44,
    marginBottom: 16,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    color: '#38bdf8',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorHint: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 16,
  },
  urlInput: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  presetContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  presetBadge: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  presetText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  outcomeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  outcomePill: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  outcomePillActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  outcomePillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  outcomePillTextActive: {
    color: '#ffffff',
  },
  durationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  durationInputBox: {
    alignItems: 'center',
  },
  durationLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 4,
  },
  durationInput: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    width: 60,
    height: 40,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  durationColon: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginHorizontal: 10,
    marginTop: 14,
  },
});
