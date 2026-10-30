import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { fetchTeam } from '../services/api';

export const TeamScreen: React.FC = () => {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTeam = async () => {
    try {
      const data = await fetchTeam();
      setTeam(data);
    } catch (e) {
      console.warn('Failed to load team', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTeam();
  };

  const renderMember = ({ item }: { item: any }) => {
    const roleBadgeColor =
      item.role === 'SUPER_ADMIN' || item.role === 'TENANT_ADMIN'
        ? '#8b5cf6'
        : item.role === 'TEAM_MANAGER'
        ? '#3b82f6'
        : '#10b981';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.firstName?.[0] || 'U'}
              {item.lastName?.[0] || ''}
            </Text>
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>
              {item.firstName} {item.lastName || ''}
            </Text>
            <Text style={styles.memberEmail}>{item.email}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: roleBadgeColor }]}>
            <Text style={styles.roleBadgeText}>{item.role}</Text>
          </View>
        </View>

        {item.phone && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtnCall}
              onPress={() => Linking.openURL(`tel:${item.phone}`)}
            >
              <Text style={styles.actionBtnText}>📞 Call Member</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtnWa}
              onPress={() => {
                const clean = item.phone.replace(/\D/g, '');
                Linking.openURL(`whatsapp://send?phone=${clean}`);
              }}
            >
              <Text style={styles.actionBtnText}>💬 WhatsApp</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0d9488" />
        <Text style={styles.loadingText}>Loading Team Members...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={team}
        keyExtractor={(item) => item.id}
        renderItem={renderMember}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>Team Members</Text>
            <Text style={styles.emptySub}>
              Admins, Telecallers, and Sales Reps are managed here and in the Web CRM.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
    fontSize: 13,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  memberEmail: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  actionBtnCall: {
    flex: 1,
    backgroundColor: '#0d9488',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionBtnWa: {
    flex: 1,
    backgroundColor: '#25d366',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptySub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
