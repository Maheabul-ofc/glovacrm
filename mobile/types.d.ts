declare module 'react-native-webview' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface WebViewProps extends ViewProps {
    source?: { uri?: string; html?: string };
    style?: any;
    javaScriptEnabled?: boolean;
    domStorageEnabled?: boolean;
    allowsInlineMediaPlayback?: boolean;
    sharedCookiesEnabled?: boolean;
    thirdPartyCookiesEnabled?: boolean;
    startInLoadingState?: boolean;
    renderLoading?: () => React.ReactElement;
    onNavigationStateChange?: (navState: any) => void;
    onMessage?: (event: any) => void;
    onShouldStartLoadWithRequest?: (request: any) => boolean;
    onError?: (error: any) => void;
    injectedJavaScript?: string;
  }

  export class WebView extends Component<WebViewProps> {
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
    stopLoading: () => void;
    injectJavaScript: (script: string) => void;
  }
}
