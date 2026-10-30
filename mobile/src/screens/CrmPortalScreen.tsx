import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  SafeAreaView,
  StatusBar,
  BackHandler,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CrmPortalScreen: React.FC = () => {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(true);
  const [portalUrl, setPortalUrl] = useState('https://glovacrm-frontend.onrender.com');

  useEffect(() => {
    // Check if custom server url was configured
    AsyncStorage.getItem('server_url').then((url) => {
      if (url && !url.includes('onrender.com')) {
        // If user changed backend to custom host, try matching frontend
        const base = url.replace('/api', '').replace(/\/+$/, '');
        if (base.includes(':5000')) {
          setPortalUrl(base.replace(':5000', ':3000'));
        }
      }
    });

    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      };
    }
  }, [canGoBack]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      {/* Top Portal Navigation Bar */}
      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          <TouchableOpacity
            style={[styles.navBtn, !canGoBack && styles.navBtnDisabled]}
            disabled={!canGoBack}
            onPress={() => webViewRef.current?.goBack()}
          >
            <Text style={styles.navBtnText}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, !canGoForward && styles.navBtnDisabled]}
            disabled={!canGoForward}
            onPress={() => webViewRef.current?.goForward()}
          >
            <Text style={styles.navBtnText}>▶</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => webViewRef.current?.reload()}
          >
            <Text style={styles.navBtnText}>🔄</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navCenter}>
          <Text style={styles.navTitle} numberOfLines={1}>
            GlovaCRM Full Suite
          </Text>
        </View>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() =>
            webViewRef.current?.injectJavaScript(
              `window.location.href = '${portalUrl}/dashboard'; true;`
            )
          }
        >
          <Text style={styles.homeBtnText}>Dashboard</Text>
        </TouchableOpacity>
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={styles.loadingText}>Opening GlovaCRM Web Portal...</Text>
        </View>
      )}

      {/* Live Responsive Web CRM */}
      <WebView
        ref={webViewRef}
        source={{ uri: portalUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        allowsInlineMediaPlayback={true}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
          setCanGoForward(navState.canGoForward);
        }}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0d9488" />
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  navBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  navTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  homeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0d9488',
  },
  homeBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
});
