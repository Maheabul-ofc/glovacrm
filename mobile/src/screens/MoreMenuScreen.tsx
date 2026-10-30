import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { TeamScreen } from './TeamScreen';
import { CampaignsScreen } from './CampaignsScreen';
import { WhatsAppScreen } from './WhatsAppScreen';
import { SettingsScreen } from './SettingsScreen';
import { CrmPortalScreen } from './CrmPortalScreen';

interface MoreMenuScreenProps {
  onLogout: () => void;
}

export const MoreMenuScreen: React.FC<MoreMenuScreenProps> = ({ onLogout }) => {
  const [activeSubScreen, setActiveSubScreen] = useState<string | null>(null);

  if (activeSubScreen === 'team') {
    return (
      <View style={styles.subContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setActiveSubScreen(null)}>
          <Text style={styles.backBtnText}>◀ Back to Suite Menu</Text>
        </TouchableOpacity>
        <TeamScreen />
      </View>
    );
  }

  if (activeSubScreen === 'campaigns') {
    return (
      <View style={styles.subContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setActiveSubScreen(null)}>
          <Text style={styles.backBtnText}>◀ Back to Suite Menu</Text>
        </TouchableOpacity>
        <CampaignsScreen />
      </View>
    );
  }

  if (activeSubScreen === 'whatsapp') {
    return (
      <View style={styles.subContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setActiveSubScreen(null)}>
          <Text style={styles.backBtnText}>◀ Back to Suite Menu</Text>
        </TouchableOpacity>
        <WhatsAppScreen />
      </View>
    );
  }

  if (activeSubScreen === 'settings') {
    return (
      <View style={styles.subContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setActiveSubScreen(null)}>
          <Text style={styles.backBtnText}>◀ Back to Suite Menu</Text>
        </TouchableOpacity>
        <SettingsScreen onLogout={onLogout} />
      </View>
    );
  }

  if (activeSubScreen === 'portal') {
    return (
      <View style={styles.subContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setActiveSubScreen(null)}>
          <Text style={styles.backBtnText}>◀ Back to Suite Menu</Text>
        </TouchableOpacity>
        <CrmPortalScreen />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>GLOVACRM ENTERPRISE SUITE</Text>
      
      {/* Big Full CRM Banner */}
      <TouchableOpacity
        style={styles.heroCard}
        onPress={() => setActiveSubScreen('portal')}
      >
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>LIVE WEB CRM</Text>
        </View>
        <Text style={styles.heroTitle}>🌐 Open Full Web CRM Portal</Text>
        <Text style={styles.heroDesc}>
          Access all 15+ features: Kanban Pipeline, Reports, Campaigns, Integrations, Custom Fields, Subscriptions, and Admin Management.
        </Text>
      </TouchableOpacity>

      {/* Grid of Features */}
      <Text style={styles.sectionHeader}>ADDITIONAL MODULES</Text>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => setActiveSubScreen('team')}
      >
        <View style={[styles.iconCircle, { backgroundColor: '#3b82f6' }]}>
          <Text style={styles.iconText}>👥</Text>
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={styles.menuTitle}>Sales Team & Telecallers</Text>
          <Text style={styles.menuSubtitle}>View agent list, roles & contact info</Text>
        </View>
        <Text style={styles.arrowText}>▶</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => setActiveSubScreen('campaigns')}
      >
        <View style={[styles.iconCircle, { backgroundColor: '#8b5cf6' }]}>
          <Text style={styles.iconText}>📢</Text>
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={styles.menuTitle}>Marketing Campaigns</Text>
          <Text style={styles.menuSubtitle}>Outreach performance & conversions</Text>
        </View>
        <Text style={styles.arrowText}>▶</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => setActiveSubScreen('whatsapp')}
      >
        <View style={[styles.iconCircle, { backgroundColor: '#10b981' }]}>
          <Text style={styles.iconText}>💬</Text>
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={styles.menuTitle}>WhatsApp Conversations Hub</Text>
          <Text style={styles.menuSubtitle}>Instant templates & lead chat</Text>
        </View>
        <Text style={styles.arrowText}>▶</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => setActiveSubScreen('settings')}
      >
        <View style={[styles.iconCircle, { backgroundColor: '#f59e0b' }]}>
          <Text style={styles.iconText}>⚙️</Text>
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={styles.menuTitle}>Profile & App Settings</Text>
          <Text style={styles.menuSubtitle}>Server URL, call permissions & preferences</Text>
        </View>
        <Text style={styles.arrowText}>▶</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => {
          Alert.alert('Sign Out', 'Are you sure you want to log out of GlovaCRM?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: onLogout },
          ]);
        }}
      >
        <Text style={styles.logoutText}>🚪 Log Out of GlovaCRM</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  subContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  backBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtnText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  heroCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#0d9488',
    marginBottom: 20,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0d9488',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  heroBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
    lineHeight: 18,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 20,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  arrowText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
  },
  logoutBtn: {
    marginTop: 20,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
