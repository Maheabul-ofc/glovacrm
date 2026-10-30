import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { fetchAnalytics, fetchCalls, fetchLeads, getStoredUser } from '../services/api';

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalLeads: 0,
    newLeads: 0,
    contactedLeads: 0,
    wonLeads: 0,
    totalCalls: 0,
    totalDuration: 0,
  });

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const currentUser = await getStoredUser();
      setUser(currentUser);

      const [leadsRes, callsData, analyticsData] = await Promise.all([
        fetchLeads(1, 100).catch(() => ({ data: [] })),
        fetchCalls().catch(() => []),
        fetchAnalytics().catch(() => null),
      ]);

      const leadsList = leadsRes.data || [];
      const callsList = Array.isArray(callsData) ? callsData : [];

      const newCount = leadsList.filter((l: any) => l.status === 'NEW').length;
      const contactedCount = leadsList.filter((l: any) => l.status === 'CONTACTED').length;
      const wonCount = leadsList.filter((l: any) => l.status === 'WON' || l.status === 'CUSTOMER').length;
      const totalDurSec = callsList.reduce((acc: number, c: any) => acc + (c.duration || 0), 0);

      setStats({
        totalLeads: analyticsData?.totalLeads ?? leadsList.length,
        newLeads: newCount,
        contactedLeads: contactedCount,
        wonLeads: wonCount,
        totalCalls: callsList.length,
        totalDuration: totalDurSec,
      });
    } catch (e) {
      console.warn('Dashboard load failed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDuration = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${secs % 60}s`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0d9488" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={['#0d9488']} />}
    >
      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeTextGroup}>
          <Text style={styles.welcomeGreeting}>Welcome back 👋</Text>
          <Text style={styles.welcomeName}>
            {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Sales Specialist'}
          </Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{(user?.role || 'TELECALLER').replace('_', ' ')}</Text>
          </View>
        </View>
        <View style={styles.shieldIconBadge}>
          <Text style={{ fontSize: 28 }}>🛡️</Text>
        </View>
      </View>

      {/* Primary KPI Grid */}
      <Text style={styles.sectionTitle}>Performance Overview</Text>
      <View style={styles.kpiGrid}>
        {/* Total Leads */}
        <TouchableOpacity
          style={[styles.kpiCard, { borderLeftColor: '#3b82f6' }]}
          onPress={() => navigation.navigate('Leads')}
          activeOpacity={0.8}
        >
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>TOTAL LEADS</Text>
            <Text style={styles.kpiIcon}>🎯</Text>
          </View>
          <Text style={styles.kpiValue}>{stats.totalLeads}</Text>
          <Text style={styles.kpiSubtext}>Pipeline entries</Text>
        </TouchableOpacity>

        {/* Calls Logged */}
        <TouchableOpacity
          style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}
          onPress={() => navigation.navigate('Calls')}
          activeOpacity={0.8}
        >
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>TOTAL CALLS</Text>
            <Text style={styles.kpiIcon}>📞</Text>
          </View>
          <Text style={styles.kpiValue}>{stats.totalCalls}</Text>
          <Text style={styles.kpiSubtext}>Logged & synced</Text>
        </TouchableOpacity>

        {/* Talk Time */}
        <View style={[styles.kpiCard, { borderLeftColor: '#8b5cf6' }]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>TALK TIME</Text>
            <Text style={styles.kpiIcon}>⏱️</Text>
          </View>
          <Text style={styles.kpiValue}>{formatDuration(stats.totalDuration)}</Text>
          <Text style={styles.kpiSubtext}>Total duration</Text>
        </View>

        {/* Closed Won */}
        <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b' }]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>DEALS WON</Text>
            <Text style={styles.kpiIcon}>🏆</Text>
          </View>
          <Text style={styles.kpiValue}>{stats.wonLeads}</Text>
          <Text style={styles.kpiSubtext}>Converted clients</Text>
        </View>
      </View>

      {/* Quick Action Shortcuts */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#0d9488' }]}
          onPress={() => navigation.navigate('Leads')}
          activeOpacity={0.85}
        >
          <Text style={styles.actionIcon}>📞</Text>
          <Text style={styles.actionBtnText}>Dial Leads</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#2563eb' }]}
          onPress={() => navigation.navigate('WhatsApp')}
          activeOpacity={0.85}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionBtnText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#475569' }]}
          onPress={() => navigation.navigate('Calls')}
          activeOpacity={0.85}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionBtnText}>Call Logs</Text>
        </TouchableOpacity>
      </View>

      {/* Lead Pipeline Breakdown */}
      <View style={styles.pipelineCard}>
        <Text style={styles.pipelineTitle}>Pipeline Status Breakdown</Text>
        <View style={styles.pipelineRow}>
          <View style={styles.pipelineItem}>
            <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.pipelineLabel}>New</Text>
            <Text style={styles.pipelineCount}>{stats.newLeads}</Text>
          </View>
          <View style={styles.pipelineItem}>
            <View style={[styles.dot, { backgroundColor: '#eab308' }]} />
            <Text style={styles.pipelineLabel}>Contacted</Text>
            <Text style={styles.pipelineCount}>{stats.contactedLeads}</Text>
          </View>
          <View style={styles.pipelineItem}>
            <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.pipelineLabel}>Won</Text>
            <Text style={styles.pipelineCount}>{stats.wonLeads}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  welcomeTextGroup: {
    flex: 1,
  },
  welcomeGreeting: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  welcomeName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 6,
  },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#0d948820',
    borderColor: '#0d9488',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  rolePillText: {
    color: '#14b8a6',
    fontSize: 11,
    fontWeight: '700',
  },
  shieldIconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0d948815',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0d948830',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    borderLeftWidth: 4,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  kpiIcon: {
    fontSize: 16,
  },
  kpiValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  kpiSubtext: {
    color: '#64748b',
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  pipelineCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pipelineTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
  },
  pipelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pipelineItem: {
    flex: 1,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  pipelineLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  pipelineCount: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
});
