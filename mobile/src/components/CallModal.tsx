import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  AppState,
  AppStateStatus,
  ScrollView,
  Alert,
} from 'react-native';
import { logCall } from '../services/api';
import { detectCallDuration } from '../services/callDetection';

interface CallModalProps {
  visible: boolean;
  lead: {
    id: string;
    firstName: string;
    lastName?: string;
    phone: string;
    companyName?: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  visible,
  lead,
  onClose,
  onSuccess,
}) => {
  const [phase, setPhase] = useState<'dialing' | 'analyzing' | 'confirm'>('dialing');
  const [duration, setDuration] = useState<number>(0);
  const [manualMinutes, setManualMinutes] = useState<string>('0');
  const [manualSeconds, setManualSeconds] = useState<string>('0');
  const [status, setStatus] = useState<'COMPLETED' | 'MISSED' | 'FAILED'>('COMPLETED');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [autoDetected, setAutoDetected] = useState<boolean>(false);

  const dialStartTime = useRef<number>(0);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (visible && lead?.phone) {
      // Reset state
      setPhase('dialing');
      setDuration(0);
      setManualMinutes('0');
      setManualSeconds('0');
      setStatus('COMPLETED');
      setNotes('');
      setAutoDetected(false);
      dialStartTime.current = Date.now();

      // Launch native dialer
      Linking.openURL(`tel:${lead.phone}`).catch(() => {
        Alert.alert('Error', 'Unable to open phone dialer.');
      });
    }
  }, [visible, lead]);

  // Listen for AppState changes: when returning from Phone app to CRM
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        visible &&
        lead?.phone
      ) {
        // App is back in foreground! Read Android Call Log
        setPhase('analyzing');
        
        // Wait 1 second to allow Android OS CallLog ContentProvider to flush
        setTimeout(async () => {
          const result = await detectCallDuration(lead.phone, dialStartTime.current);

          if (result.found) {
            setDuration(result.duration);
            setStatus(result.status);
            setManualMinutes(Math.floor(result.duration / 60).toString());
            setManualSeconds((result.duration % 60).toString());
            setAutoDetected(true);
          } else {
            // Fallback: estimate time from when dial was pressed
            const elapsedSeconds = Math.max(
              0,
              Math.floor((Date.now() - dialStartTime.current) / 1000) - 5
            );
            setDuration(elapsedSeconds);
            setManualMinutes(Math.floor(elapsedSeconds / 60).toString());
            setManualSeconds((elapsedSeconds % 60).toString());
            setAutoDetected(false);
          }
          setPhase('confirm');
        }, 1200);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [visible, lead]);

  const handleSave = async () => {
    if (!lead) return;
    setIsSaving(true);

    const finalDuration =
      parseInt(manualMinutes || '0', 10) * 60 +
      parseInt(manualSeconds || '0', 10);

    try {
      await logCall({
        leadId: lead.id,
        status,
        duration: finalDuration,
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        'Call Logged! ✅',
        `Logged as ${status.toLowerCase()} (${Math.floor(finalDuration / 60)}m ${
          finalDuration % 60
        }s).`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', 'Failed to save call to CRM. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDisplayTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  if (!visible || !lead) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerSubtitle}>CALLING LEAD</Text>
            <Text style={styles.headerTitle}>
              {lead.firstName} {lead.lastName || ''}
            </Text>
            <Text style={styles.headerPhone}>{lead.phone}</Text>
          </View>

          <ScrollView style={styles.content}>
            {phase === 'dialing' && (
              <View style={styles.dialingContainer}>
                <View style={styles.pulseCircle}>
                  <Text style={styles.phoneIcon}>📞</Text>
                </View>
                <Text style={styles.dialingText}>Call in progress...</Text>
                <Text style={styles.dialingSubtext}>
                  Complete your call in the native dialer. When you return here, duration will be automatically recorded!
                </Text>
                <TouchableOpacity
                  style={styles.manualReturnBtn}
                  onPress={() => setPhase('confirm')}
                >
                  <Text style={styles.manualReturnText}>I've finished the call</Text>
                </TouchableOpacity>
              </View>
            )}

            {phase === 'analyzing' && (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="large" color="#0d9488" />
                <Text style={styles.analyzingText}>Reading Android Call Log...</Text>
                <Text style={styles.analyzingSubtext}>
                  Extracting exact call duration automatically...
                </Text>
              </View>
            )}

            {phase === 'confirm' && (
              <View style={styles.confirmContainer}>
                {/* Auto Detection Badge */}
                {autoDetected ? (
                  <View style={styles.badgeSuccess}>
                    <Text style={styles.badgeSuccessText}>
                      ✓ Call Duration Auto-Detected via Android OS
                    </Text>
                  </View>
                ) : (
                  <View style={styles.badgeNotice}>
                    <Text style={styles.badgeNoticeText}>
                      ⏱ Call Duration Estimated / Manual
                    </Text>
                  </View>
                )}

                {/* Duration Inputs */}
                <Text style={styles.fieldLabel}>CALL DURATION</Text>
                <View style={styles.durationRow}>
                  <View style={styles.durationInputBlock}>
                    <TextInput
                      style={styles.durationInput}
                      keyboardType="numeric"
                      value={manualMinutes}
                      onChangeText={(val) => setManualMinutes(val)}
                    />
                    <Text style={styles.durationLabel}>Minutes</Text>
                  </View>
                  <Text style={styles.durationSeparator}>:</Text>
                  <View style={styles.durationInputBlock}>
                    <TextInput
                      style={styles.durationInput}
                      keyboardType="numeric"
                      value={manualSeconds}
                      onChangeText={(val) => setManualSeconds(val)}
                    />
                    <Text style={styles.durationLabel}>Seconds</Text>
                  </View>
                </View>

                {/* Call Outcome Status */}
                <Text style={styles.fieldLabel}>CALL OUTCOME</Text>
                <View style={styles.statusRow}>
                  <TouchableOpacity
                    style={[
                      styles.statusChip,
                      status === 'COMPLETED' && styles.statusChipActiveGreen,
                    ]}
                    onPress={() => setStatus('COMPLETED')}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        status === 'COMPLETED' && styles.statusChipTextActive,
                      ]}
                    >
                      ✅ Completed
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusChip,
                      status === 'MISSED' && styles.statusChipActiveRed,
                    ]}
                    onPress={() => setStatus('MISSED')}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        status === 'MISSED' && styles.statusChipTextActive,
                      ]}
                    >
                      📵 Missed
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusChip,
                      status === 'FAILED' && styles.statusChipActiveYellow,
                    ]}
                    onPress={() => setStatus('FAILED')}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        status === 'FAILED' && styles.statusChipTextActive,
                      ]}
                    >
                      ⚠️ Busy / Failed
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Call Notes */}
                <Text style={styles.fieldLabel}>CALL NOTES / SUMMARY</Text>
                <TextInput
                  style={styles.notesInput}
                  multiline
                  numberOfLines={3}
                  placeholder="e.g. Lead interested, callback requested next Monday..."
                  placeholderTextColor="#9ca3af"
                  value={notes}
                  onChangeText={setNotes}
                />

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={onClose}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelBtnText}>Discard</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save to CRM</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  header: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  headerSubtitle: {
    color: '#99f6e4',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  headerPhone: {
    color: '#ccfbf1',
    fontSize: 14,
    marginTop: 2,
  },
  content: {
    padding: 20,
    maxHeight: 520,
  },
  dialingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  pulseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ccfbf1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  phoneIcon: {
    fontSize: 34,
  },
  dialingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  dialingSubtext: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  manualReturnBtn: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
  manualReturnText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  analyzingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  analyzingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 14,
  },
  analyzingSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  confirmContainer: {},
  badgeSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  badgeSuccessText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  badgeNotice: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  badgeNoticeText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  durationInputBlock: {
    alignItems: 'center',
    width: 80,
  },
  durationInput: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f766e',
    textAlign: 'center',
    width: '100%',
    padding: 0,
  },
  durationLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  durationSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: '#9ca3af',
    marginHorizontal: 10,
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 6,
  },
  statusChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  statusChipActiveGreen: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  statusChipActiveRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  statusChipActiveYellow: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  statusChipText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '600',
  },
  statusChipTextActive: {
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 70,
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#4b5563',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0d9488',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
