import React, { useState, useEffect } from 'react';
import { StatusBar, View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { LeadsScreen } from './src/screens/LeadsScreen';
import { CallLogScreen } from './src/screens/CallLogScreen';
import { WhatsAppScreen } from './src/screens/WhatsAppScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { getStoredUser, initApiConfig } from './src/services/api';

const Tab = createBottomTabNavigator();

function MainTabs({ onLogout }: { onLogout: () => void }) {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1e293b',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#334155',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          tabBarStyle: {
            backgroundColor: '#0f172a',
            borderTopWidth: 1,
            borderTopColor: '#1e293b',
            height: 60,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarActiveTintColor: '#14b8a6',
          tabBarInactiveTintColor: '#64748b',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            title: 'Overview',
            headerTitle: 'GlovaCRM Overview',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 20 }}>{focused ? '📊' : '📈'}</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Leads"
          component={LeadsScreen}
          options={{
            title: 'Leads',
            headerTitle: 'Sales Leads Pipeline',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 20 }}>{focused ? '🎯' : '👥'}</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Calls"
          component={CallLogScreen}
          options={{
            title: 'Calls',
            headerTitle: 'Call History & Duration',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 20 }}>{focused ? '📞' : '📱'}</Text>
            ),
          }}
        />
        <Tab.Screen
          name="WhatsApp"
          component={WhatsAppScreen}
          options={{
            title: 'WhatsApp',
            headerTitle: 'WhatsApp Conversations',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 20 }}>{focused ? '💬' : '🗨️'}</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          options={{
            title: 'Profile',
            headerTitle: 'Agent Profile & Settings',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 20 }}>{focused ? '⚙️' : '👤'}</Text>
            ),
          }}
        >
          {() => <SettingsScreen onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initApiConfig();
        const user = await getStoredUser();
        if (user) {
          setCurrentUser(user);
        }
      } catch (e) {
        console.warn('Bootstrap error:', e);
      } finally {
        setInitializing(false);
      }
    };
    bootstrap();
  }, []);

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0d9488" />
        <Text style={styles.initText}>Loading GlovaCRM...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      {currentUser ? (
        <MainTabs onLogout={() => setCurrentUser(null)} />
      ) : (
        <LoginScreen onLoginSuccess={(u) => setCurrentUser(u)} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
});
