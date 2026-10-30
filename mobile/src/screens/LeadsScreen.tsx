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
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { fetchLeads, createLead } from '../services/api';
import { CallModal } from '../components/CallModal';
import { backgroundSync, ActivePendingCall } from '../services/backgroundSync';

interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  companyName?: string;
  status?: string;
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

  // Add Lead Modal State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSavingLead, setIsSavingLead] = useState(false);

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

  const handleCreateLead = async () => {
    if (!newFirstName.trim() || !newPhone.trim()) {
      Alert.alert('Missing Info', 'First Name and Phone Number are required.');
      return;
    }

    setIsSavingLead(true);
    try {
      await createLead({
        firstName: newFirstName.trim(),
        lastName: newLastName.trim() || undefined,
        phone: newPhone.trim(),
        email: newEmail.trim() || undefined,
        companyName: newCompany.trim() || undefined,
        notes: newNotes.trim() || undefined,
      });

      Alert.alert('Success ✅', 'New lead added to CRM!');
      setAddModalVisible(false);
      // Reset form
      setNewFirstName('');
      setNewLastName('');
      setNewPhone('');
      setNewEmail('');
      setNewCompany('');
      setNewNotes('');
      loadLeads();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to create lead.');
    } finally {
      setIsSavingLead(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    let bg = '#e2e8f0';
    let text = '#475569';

    switch (status?.toUpperCase()) {
      case 'NEW':
        bg = '#dbeafe';
        text = '#1d4ed8';
        break;
      case 'CONTACTED':
        bg = '#fef3c7';
        text = '#b45309';
        break;
      case 'QUALIFIED':
        bg = '#dcfce7';
        text = '#15803d';
        break;
      case 'WON':
        bg = '#ccfbf1';
        text = '#0f766e';
        break;
      case 'LOST':
        bg = '#fee2e2';
        text = '#b91c1c';
        break;
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[styles.statusText, { color: text }]}>{status || 'LEAD'}</Text>
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
          {renderStatusBadge(item.status || 'NEW')}
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

      {/* Search Input & Add Button */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search leads by name or phone..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddModalVisible(true)}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
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
              colors={['#0d9488']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎯</Text>
              <Text style={styles.emptyTitle}>No leads found</Text>
              <Text style={styles.emptySubtitle}>
                Add a new lead above or check back later!
              </Text>
            </View>
          }
        />
      )}

      {/* Native Call Logger Modal */}
      <CallModal
        visible={callModalVisible}
        lead={selectedLead}
        onClose={() => setCallModalVisible(false)}
        onSuccess={() => loadLeads()}
      />

      {/* Add Lead Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Lead</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>First Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Rahul"
                placeholderTextColor="#94a3b8"
                value={newFirstName}
                onChangeText={setNewFirstName}
              />

              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Verma"
                placeholderTextColor="#94a3b8"
                value={newLastName}
                onChangeText={setNewLastName}
              />

              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. +91 98765 43210"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. rahul@example.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newEmail}
                onChangeText={setNewEmail}
              />

              <Text style={styles.inputLabel}>Company Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Acme Corp"
                placeholderTextColor="#94a3b8"
                value={newCompany}
                onChangeText={setNewCompany}
              />

              <Text style={styles.inputLabel}>Initial Notes</Text>
              <TextInput
                style={[styles.modalInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Lead requirements or inquiry source..."
                placeholderTextColor="#94a3b8"
                multiline
                value={newNotes}
                onChangeText={setNewNotes}
              />

              <TouchableOpacity
                style={styles.saveLeadBtn}
                disabled={isSavingLead}
                onPress={handleCreateLead}
              >
                {isSavingLead ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveLeadBtnText}>Save Lead to CRM</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  addBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  leadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 14,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtnText: {
    fontSize: 20,
    color: '#64748b',
    padding: 4,
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  saveLeadBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  saveLeadBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
