import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { fetchCalls } from '../services/api';

interface CallRecord {
  id: string;
  leadId: string;
  provider: string;
  status: string;
  duration: number; // in seconds
  notes?: string;
  createdAt: string;
  phoneNumber?: string;
  lead?: {
    firstName: string;
    lastName?: string;
    phone: string;
  };
}

export const CallLogScreen: React.FC = () => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCalls = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await fetchCalls();
      setCalls(data || []);
    } catch (err) {
      console.warn('Failed to load call logs', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  // Aggregate stats
  const totalCalls = calls.length;
  const completedCalls = calls.filter((c) => c.status === 'COMPLETED').length;
  const totalDurationSec = calls.reduce((acc, c) => acc + (c.duration || 0), 0);

  const formatTotalTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${secs % 60}s`;
  };

  const formatDuration = (secs: number) => {
    if (!secs || secs === 0) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || 'UNKNOWN').toUpperCase();
    let bg = '#f1f5f9';
    let text = '#475569';

    if (s === 'COMPLETED') {
      bg = '#dcfce7';
      text = '#15803d';
    } else if (s === 'MISSED') {
      bg = '#fee2e2';
      text = '#b91c1c';
    } else if (s === 'FAILED' || s === 'REJECTED') {
      bg = '#fef3c7';
      text = '#b45309';
    } else if (s === 'INITIATED' || s === 'IN_PROGRESS') {
      bg = '#dbeafe';
      text = '#1d4ed8';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[styles.statusText, { color: text }]}>{s}</Text>
      </View>
    );
  };

  const renderCallItem = ({ item }: { item: CallRecord }) => {
    const leadName = item.lead
      ? `${item.lead.firstName} ${item.lead.lastName || ''}`.trim()
      : 'Unknown Lead';
    const phone = item.lead?.phone || item.phoneNumber || 'No Phone';
    const dateStr = new Date(item.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const dateDay = new Date(item.createdAt).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });

    return (
      <View style={styles.callCard}>
        <View style={styles.callCardLeft}>
          <View style={styles.callHeaderRow}>
            <Text style={styles.leadName}>{leadName}</Text>
            {renderStatusBadge(item.status)}
          </View>

          <Text style={styles.leadPhone}>{phone}</Text>

          {item.notes ? (
            <Text style={styles.callNotes}>💬 "{item.notes}"</Text>
          ) : null}

          <Text style={styles.callMeta}>
            {dateDay} at {dateStr} • Via {item.provider || 'SIM'}
          </Text>
        </View>

        <View style={styles.callCardRight}>
          <View style={styles.durationBadge}>
            <Text style={styles.durationIcon}>⏱</Text>
            <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Telecaller Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{totalCalls}</Text>
          <Text style={styles.statLabel}>Total Calls</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#0d9488' }]}>
            {formatTotalTime(totalDurationSec)}
          </Text>
          <Text style={styles.statLabel}>Talk Time</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#16a34a' }]}>
            {completedCalls}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* History List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={styles.loadingText}>Loading call history...</Text>
        </View>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          renderItem={renderCallItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadCalls(true)}
              tintColor="#0d9488"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📞</Text>
              <Text style={styles.emptyTitle}>No Calls Recorded</Text>
              <Text style={styles.emptySubtitle}>
                Calls made to leads will automatically appear here with their exact durations.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statsCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  callCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  callCardLeft: {
    flex: 1,
    marginRight: 10,
  },
  callHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  leadName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  leadPhone: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  callNotes: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
    marginTop: 4,
  },
  callMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
  },
  callCardRight: {
    alignItems: 'flex-end',
  },
  durationBadge: {
    backgroundColor: '#f0fdfa',
    borderColor: '#ccfbf1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationIcon: {
    fontSize: 12,
  },
  durationText: {
    color: '#0f766e',
    fontWeight: '700',
    fontSize: 13,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
});
