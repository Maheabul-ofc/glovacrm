import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import {
  getStoredUser,
  logout,
  getServerUrl,
  setServerUrl,
} from '../services/api';
import {
  checkCallPermissions,
  requestCallPermissions,
} from '../services/callDetection';

interface SettingsScreenProps {
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout }) => {
  const [user, setUser] = useState<any>(null);
  const [serverUrl, setServerUrlState] = useState('');
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [isEditingUrl, setIsEditingUrl] = useState(false);

  useEffect(() => {
    getStoredUser().then(setUser);
    getServerUrl().then(setServerUrlState);
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      const ok = await checkCallPermissions();
      setHasPermissions(ok);
    } else {
      setHasPermissions(false);
    }
  };

  const handleRequestPermissions = async () => {
    const granted = await requestCallPermissions();
    setHasPermissions(granted);
    if (granted) {
      Alert.alert('Permissions Granted! 🎉', 'Automatic call duration tracking is now active.');
    } else {
      Alert.alert('Permission Denied', 'Android requires Call Log permission to automatically detect call duration.');
    }
  };

  const handleSaveUrl = async () => {
    if (!serverUrl.trim()) return;
    try {
      const clean = await setServerUrl(serverUrl.trim());
      setServerUrlState(clean);
      setIsEditingUrl(false);
      Alert.alert('Updated', `API URL set to: ${clean}`);
    } catch {
      Alert.alert('Error', 'Failed to save server URL.');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          onLogout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Telecaller Profile */}
      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.firstName?.[0] || 'T').toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>
              {user?.firstName || 'Telecaller'} {user?.lastName || ''}
            </Text>
            <Text style={styles.userEmail}>{user?.email || 'telecaller@crm.com'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role || 'TELECALLER'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Android Permissions Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Android System Permissions</Text>
        <Text style={styles.cardSubtitle}>
          Required to automatically detect call duration without manual typing.
        </Text>

        <View style={styles.permissionItem}>
          <View>
            <Text style={styles.permName}>Call Log Access (READ_CALL_LOG)</Text>
            <Text style={styles.permDesc}>Reads call start & end time directly from Android</Text>
          </View>
          <Text style={styles.statusIndicator}>
            {hasPermissions ? '✅ Active' : '❌ Not Granted'}
          </Text>
        </View>

        {!hasPermissions && Platform.OS === 'android' && (
          <TouchableOpacity
            style={styles.grantBtn}
            onPress={handleRequestPermissions}
          >
            <Text style={styles.grantBtnText}>Grant Android Permissions</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Server URL Config */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>CRM Backend Server</Text>
          <TouchableOpacity onPress={() => setIsEditingUrl(!isEditingUrl)}>
            <Text style={styles.editText}>{isEditingUrl ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {isEditingUrl ? (
          <View style={styles.editUrlBox}>
            <TextInput
              style={styles.urlInput}
              value={serverUrl}
              onChangeText={setServerUrlState}
              autoCapitalize="none"
              placeholder="http://192.168.137.1:5000/api"
            />
            <TouchableOpacity style={styles.saveUrlBtn} onPress={handleSaveUrl}>
              <Text style={styles.saveUrlText}>Save URL</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.currentUrl}>{serverUrl}</Text>
        )}
      </View>

      {/* How it works info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💡 How Automatic Duration Works</Text>
        <Text style={styles.infoText}>
          1. Tap "Call" on any lead in the app or the Web CRM.{"\n"}
          2. The native Android phone dialer initiates the call.{"\n"}
          3. When the call ends and you return to GlovaCRM, our Android service inspects the Android OS Call Log.{"\n"}
          4. The exact duration (e.g. 134 seconds) is pulled automatically and synced to your CRM database!
        </Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0d9488',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 14,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  permName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  permDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusIndicator: {
    fontSize: 12,
    fontWeight: '700',
  },
  grantBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  grantBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editText: {
    color: '#0d9488',
    fontSize: 13,
    fontWeight: '600',
  },
  currentUrl: {
    fontSize: 13,
    color: '#475569',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  editUrlBox: {
    marginTop: 10,
  },
  urlInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  saveUrlBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveUrlText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  infoCard: {
    backgroundColor: '#f0fdfa',
    borderColor: '#ccfbf1',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f766e',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#115e59',
    lineHeight: 18,
  },
  logoutBtn: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#b91c1c',
    fontSize: 15,
    fontWeight: '700',
  },
});
