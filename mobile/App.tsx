import React, { useRef, useState } from 'react';
import {
  StatusBar,
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const CRM_URL = 'https://glovacrm-frontend.onrender.com';

function LoadingView() {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.logoBox}>
        <Text style={styles.logoText}>Glova</Text>
        <Text style={styles.logoAccent}>CRM</Text>
      </View>
      <ActivityIndicator size="large" color="#14b8a6" style={{ marginTop: 32 }} />
      <Text style={styles.loadingText}>Loading your CRM...</Text>
      <Text style={styles.loadingSubText}>Please wait, connecting to server</Text>
    </View>
  );
}

function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.logoBox}>
        <Text style={styles.logoText}>Glova</Text>
        <Text style={styles.logoAccent}>CRM</Text>
      </View>
      <Text style={[styles.loadingText, { marginTop: 32, color: '#f87171' }]}>
        Connection Error
      </Text>
      <Text style={styles.loadingSubText}>
        Please check your internet connection and try again.
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [key, setKey] = useState(0);

  // Android back button: go back in WebView history if possible
  React.useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; // prevent default (exit app)
      }
      return false; // let default happen (exit app)
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [canGoBack]);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  };

  const handleRetry = () => {
    setError(false);
    setLoading(true);
    setKey(k => k + 1); // remount WebView
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {error ? (
          <ErrorView onRetry={handleRetry} />
        ) : (
          <>
            {loading && <LoadingView />}
            <WebView
              key={key}
              ref={webViewRef}
              source={{ uri: CRM_URL }}
              style={[styles.webview, loading && styles.hidden]}
              onLoad={() => {
                setLoading(false);
                setError(false);
              }}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                // only treat server errors as fatal errors
                if (nativeEvent.statusCode >= 500) {
                  setLoading(false);
                  setError(true);
                }
              }}
              onNavigationStateChange={handleNavigationStateChange}
              // Enable JS and DOM storage (required for React app + auth tokens)
              javaScriptEnabled={true}
              domStorageEnabled={true}
              // Allow cookies & local storage for sessions
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              // Allow file downloads and uploads
              allowFileAccess={true}
              allowFileAccessFromFileURLs={true}
              allowUniversalAccessFromFileURLs={true}
              // Zoom support
              scalesPageToFit={false}
              // Allow mixed content (just in case)
              mixedContentMode="always"
              // User agent to mimic mobile browser
              userAgent="Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36 GlovaCRM/1.0"
              // Increase timeout for Render cold starts (up to 60s)
              startInLoadingState={false}
              renderLoading={() => <View />}
              // Open links in the WebView (not external browser)
              setSupportMultipleWindows={false}
              onShouldStartLoadWithRequest={() => true}
            />
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  hidden: {
    opacity: 0,
    height: 0,
    flex: 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  logoBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  logoAccent: {
    fontSize: 42,
    fontWeight: '800',
    color: '#14b8a6',
    letterSpacing: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 32,
    backgroundColor: '#14b8a6',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 10,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});
