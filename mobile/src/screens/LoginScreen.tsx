import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  login,
  getServerUrl,
  setServerUrl,
  checkBackendHealth,
  DEFAULT_BASE_URL,
} from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('owner@glovacrm.com');
  const [password, setPassword] = useState('password123');
  const [serverUrl, setServerUrlState] = useState(DEFAULT_BASE_URL);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    getServerUrl().then((url) => setServerUrlState(url));
  }, []);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setStatusMsg({ type: 'info', text: 'Checking connection to server...' });
    try {
      const result = await checkBackendHealth();
      if (result.ok) {
        setStatusMsg({ type: 'success', text: `✅ ${result.message}` });
      } else {
        setStatusMsg({ type: 'error', text: `⚠️ ${result.message}` });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `Failed: ${e.message}` });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter your email and password.' });
      return;
    }

    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Authenticating with GlovaCRM server...' });

    try {
      if (serverUrl.trim()) {
        await setServerUrl(serverUrl.trim());
      }

      const { user } = await login(email.trim(), password);

      setStatusMsg({ type: 'success', text: `Welcome back, ${user.firstName || 'User'}!` });

      // Immediate redirect to CRM workspace
      setTimeout(() => {
        onLoginSuccess(user);
      }, 200);
    } catch (err: any) {
      console.error('Login error:', err);
      let msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Unable to connect to server. If the server is sleeping, please retry in 15 seconds.';

      if (err.code === 'ECONNABORTED' || msg.includes('timeout')) {
        msg = 'Connection timed out. The cloud server may be waking up. Please tap "Sign In" again.';
      }

      setStatusMsg({ type: 'error', text: msg });
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const fillQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setStatusMsg(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🏢</Text>
          </View>
          <Text style={styles.appName}>GlovaCRM</Text>
          <Text style={styles.tagline}>
            Enterprise Sales & Customer Relationship Management
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In to Your Workspace</Text>
          <Text style={styles.cardSubtitle}>
            Access your leads, pipeline, calls & reports
          </Text>

          {/* Status / Alert Banner */}
          {statusMsg && (
            <View
              style={[
                styles.banner,
                statusMsg.type === 'error' && styles.bannerError,
                statusMsg.type === 'success' && styles.bannerSuccess,
                statusMsg.type === 'info' && styles.bannerInfo,
              ]}
            >
              <Text
                style={[
                  styles.bannerText,
                  statusMsg.type === 'error' && styles.bannerTextError,
                  statusMsg.type === 'success' && styles.bannerTextSuccess,
                  statusMsg.type === 'info' && styles.bannerTextInfo,
                ]}
              >
                {statusMsg.text}
              </Text>
            </View>
          )}

          <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="owner@glovacrm.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              setStatusMsg(null);
            }}
          />

          <Text style={styles.inputLabel}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              setStatusMsg(null);
            }}
          />

          {/* Expandable Server Config */}
          <TouchableOpacity
            style={styles.toggleServerBtn}
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <Text style={styles.toggleServerText}>
              ⚙️ {showServerConfig ? 'Hide Server URL' : 'Configure Server URL'}
            </Text>
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.serverConfigBox}>
              <Text style={styles.inputLabel}>CRM API ENDPOINT</Text>
              <TextInput
                style={styles.input}
                placeholder={DEFAULT_BASE_URL}
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                value={serverUrl}
                onChangeText={setServerUrlState}
              />
              <TouchableOpacity
                style={styles.testBtn}
                disabled={testingConnection}
                onPress={handleTestConnection}
              >
                {testingConnection ? (
                  <ActivityIndicator size="small" color="#0d9488" />
                ) : (
                  <Text style={styles.testBtnText}>🔌 Test Connection</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Main Login Button */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In to GlovaCRM</Text>
            )}
          </TouchableOpacity>

          {/* Quick Demo Access Chips */}
          <View style={styles.quickAccessSection}>
            <Text style={styles.quickAccessLabel}>QUICK DEMO ACCOUNTS</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => fillQuickLogin('owner@glovacrm.com', 'password123')}
              >
                <Text style={styles.chipText}>👑 Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => fillQuickLogin('caller@glovacrm.com', 'password123')}
              >
                <Text style={styles.chipText}>📞 Sales Agent</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => fillQuickLogin('admin@glovacrm.com', 'password123')}
              >
                <Text style={styles.chipText}>⚡ Super Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          🔒 GlovaCRM Cloud • Connected to Live Production Database
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 32,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 18,
  },
  banner: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  bannerError: {
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  bannerSuccess: {
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  bannerInfo: {
    backgroundColor: '#082f49',
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bannerTextError: {
    color: '#fca5a5',
  },
  bannerTextSuccess: {
    color: '#6ee7b7',
  },
  bannerTextInfo: {
    color: '#7dd3fc',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 8,
  },
  toggleServerBtn: {
    marginVertical: 8,
    alignSelf: 'flex-start',
  },
  toggleServerText: {
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: '600',
  },
  serverConfigBox: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  testBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#0d9488',
  },
  testBtnText: {
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: '700',
  },
  loginBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  quickAccessSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  quickAccessLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 11,
    marginTop: 24,
  },
});
