import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { fetchLeads } from '../services/api';
import { CallModal } from '../components/CallModal';
import { backgroundSync, ActivePendingCall } from '../services/backgroundSync';

interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  companyName?: string;
  status: string;
  source?: string;
}

export const LeadsScreen: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [webSyncActive, setWebSyncActive] = useState(true);

  const loadLeads = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetchLeads(1, 50, search);
      setLeads(res.data || []);
    } catch (err) {
      console.warn('Failed to fetch leads', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Manage Web Companion / Auto-dial Sync
  useEffect(() => {
    if (webSyncActive) {
      backgroundSync.start(5000, (pending: ActivePendingCall) => {
        setSelectedLead({
          id: pending.leadId,
          firstName: pending.leadName,
          phone: pending.phone,
          status: 'IN_PROGRESS',
        });
        setCallModalVisible(true);
      });
    } else {
      backgroundSync.stop();
    }

    return () => {
      backgroundSync.stop();
    };
  }, [webSyncActive]);

  const handleStartCall = (lead: Lead) => {
    setSelectedLead(lead);
    setCallModalVisible(true);
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || 'NEW').toUpperCase();
    let bg = '#f1f5f9';
    let text = '#475569';

    if (s === 'NEW') {
      bg = '#dbeafe';
      text = '#1d4ed8';
    } else if (s === 'CONTACTED') {
      bg = '#fef3c7';
      text = '#b45309';
    } else if (s === 'QUALIFIED') {
      bg = '#e0e7ff';
      text = '#4338ca';
    } else if (s === 'WON' || s === 'CUSTOMER') {
      bg = '#dcfce7';
      text = '#15803d';
    } else if (s === 'LOST') {
      bg = '#fee2e2';
      text = '#b91c1c';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[styles.statusText, { color: text }]}>{s}</Text>
      </View>
    );
  };

  const renderLeadItem = ({ item }: { item: Lead }) => (
    <View style={styles.leadCard}>
      <View style={styles.leadInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.leadName}>
            {item.firstName} {item.lastName || ''}
          </Text>
          {renderStatusBadge(item.status)}
        </View>

        <Text style={styles.leadPhone}>{item.phone}</Text>

        {item.companyName ? (
          <Text style={styles.leadCompany}>🏢 {item.companyName}</Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.callButton}
        onPress={() => handleStartCall(item)}
      >
        <Text style={styles.callIcon}>📞</Text>
        <Text style={styles.callBtnText}>Call</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Banner: Web CRM Remote Dial Sync */}
      <View style={styles.syncBanner}>
        <View style={styles.syncLeft}>
          <View
            style={[
              styles.syncDot,
              { backgroundColor: webSyncActive ? '#10b981' : '#9ca3af' },
            ]}
          />
          <View>
            <Text style={styles.syncTitle}>Web Companion Sync</Text>
            <Text style={styles.syncSubtitle}>
              {webSyncActive
                ? 'Listening for calls triggered from Web CRM'
                : 'Paused'}
            </Text>
          </View>
        </View>
        <Switch
          value={webSyncActive}
          onValueChange={setWebSyncActive}
          trackColor={{ false: '#cbd5e1', true: '#99f6e4' }}
          thumbColor={webSyncActive ? '#0d9488' : '#f1f5f9'}
        />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search leads by name or phone..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Leads List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={styles.loadingText}>Loading assigned leads...</Text>
        </View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item.id}
          renderItem={renderLeadItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadLeads(true)}
              tintColor="#0d9488"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No leads found</Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? 'No leads matching your search query.'
                  : 'No leads assigned yet.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Call & Duration Tracker Modal */}
      <CallModal
        visible={callModalVisible}
        lead={selectedLead}
        onClose={() => setCallModalVisible(false)}
        onSuccess={() => {
          loadLeads();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  syncBanner: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  syncDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  syncTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  syncSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  leadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  leadInfo: {
    flex: 1,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  leadName: {
    fontSize: 16,
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
    fontSize: 14,
    color: '#0d9488',
    fontWeight: '600',
    marginTop: 4,
  },
  leadCompany: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  callButton: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0d9488',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  callIcon: {
    fontSize: 14,
  },
  callBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
  },
});
