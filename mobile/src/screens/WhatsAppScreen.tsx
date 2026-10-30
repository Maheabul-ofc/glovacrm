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
  Linking,
  Alert,
} from 'react-native';
import { fetchLeads, sendWhatsAppMessage } from '../services/api';

interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  companyName?: string;
  status: string;
}

export const WhatsAppScreen: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quickTemplate, setQuickTemplate] = useState('Hello {{name}}, following up regarding your inquiry with GlovaCRM!');

  const loadLeads = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetchLeads(1, 50, search);
      setLeads(res.data || []);
    } catch (e) {
      console.warn('Failed to load WhatsApp leads:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleOpenWhatsApp = (lead: Lead) => {
    let cleanPhone = lead.phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }
    const leadName = `${lead.firstName} ${lead.lastName || ''}`.trim();
    const text = quickTemplate.replace('{{name}}', leadName);
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
          // Also log to backend
          sendWhatsAppMessage(lead.id, text).catch(() => {});
        } else {
          // Fallback to web link
          Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`);
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Unable to launch WhatsApp on this device.');
      });
  };

  const renderLeadItem = ({ item }: { item: Lead }) => {
    const fullName = `${item.firstName} ${item.lastName || ''}`.trim();
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.firstName?.[0] || 'L').toUpperCase()}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.phone}>{item.phone}</Text>
            {item.companyName ? <Text style={styles.company}>{item.companyName}</Text> : null}
          </View>
        </View>

        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => handleOpenWhatsApp(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.chatIcon}>💬</Text>
          <Text style={styles.chatText}>Chat</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone or company..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Quick Template Picker */}
      <View style={styles.templateBar}>
        <Text style={styles.templateLabel}>Quick Template:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
          <TouchableOpacity
            style={[styles.templatePill, quickTemplate.includes('following up') && styles.activePill]}
            onPress={() => setQuickTemplate('Hello {{name}}, following up regarding your inquiry with GlovaCRM!')}
          >
            <Text style={styles.pillText}>👋 Follow-up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.templatePill, quickTemplate.includes('welcome') && styles.activePill]}
            onPress={() => setQuickTemplate('Hello {{name}}, welcome to GlovaCRM! How can we assist you today?')}
          >
            <Text style={styles.pillText}>✨ Welcome</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.templatePill, quickTemplate.includes('quotation') && styles.activePill]}
            onPress={() => setQuickTemplate('Hi {{name}}, your requested quotation has been prepared. Please let us know when to review!')}
          >
            <Text style={styles.pillText}>📄 Quotation</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Leads List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading WhatsApp Contacts...</Text>
        </View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item.id}
          renderItem={renderLeadItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadLeads(true)} colors={['#10b981']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>💬</Text>
              <Text style={styles.emptyTitle}>No Contacts Found</Text>
              <Text style={styles.emptySubtitle}>Try searching for another customer name</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

// Need ScrollView for horizontal pills
import { ScrollView } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  searchInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  templateBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  templateLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  pillScroll: {
    flexDirection: 'row',
  },
  templatePill: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activePill: {
    borderColor: '#10b981',
    backgroundColor: '#10b98120',
  },
  pillText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10b98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#10b98140',
  },
  avatarText: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  phone: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  company: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  chatButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  chatIcon: {
    fontSize: 14,
  },
  chatText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
});
