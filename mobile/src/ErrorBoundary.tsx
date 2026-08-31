import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ScrollView } from 'react-native';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, padding: 20, paddingTop: 50, backgroundColor: 'red' }}>
          <Text style={{ fontSize: 24, color: 'white', fontWeight: 'bold' }}>JS Crash Caught!</Text>
          <ScrollView>
            <Text style={{ color: 'white', marginTop: 20 }}>{this.state.error?.toString()}</Text>
            <Text style={{ color: 'white', marginTop: 10 }}>{this.state.errorInfo?.componentStack}</Text>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}
