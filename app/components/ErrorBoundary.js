import React, { Component } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LogoImage } from '../../utils/imageUtils';

/**
 * Enhanced Error Boundary Component
 * 
 * React Concepts Explained:
 * - Class Component: Error boundaries MUST be class components (not functional)
 * - getDerivedStateFromError(): Static method that updates state when error occurs
 * - componentDidCatch(): Lifecycle method for logging errors
 * - Error Recovery: Provides user-friendly way to recover from crashes
 * 
 * What happens if you change things:
 * - Remove hasError state → Users see blank screen on crashes
 * - Remove componentDidCatch → No error logging for debugging
 * - Remove retry button → Users must restart app manually
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  // This method is called when an error occurs
  static getDerivedStateFromError(error) {
    // Update state to show fallback UI
    return { hasError: true };
  }

  // This method logs error details for debugging
  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });
    
    // Log error for debugging (in production, send to crash reporting service)
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Could send to crash reporting service like Sentry:
    // crashlytics().recordError(error);
  }

  // Method to reset error state and try again
  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  // Method to show detailed error (for debugging)
  showErrorDetails = () => {
    const errorMessage = `Error: ${this.state.error?.message}\n\nStack: ${this.state.errorInfo?.componentStack}`;
    Alert.alert(
      'Error Details',
      errorMessage,
      [
        { text: 'Copy Error', onPress: () => {
          // In a real app, you'd copy to clipboard
          console.log('Error copied:', errorMessage);
        }},
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI when error occurs
      return (
        <View 
          style={styles.container}
          accessibilityRole="alert"
          accessibilityLabel="Application error occurred"
        >
          <View style={styles.content}>
            {/* Logo maintains brand consistency even in error state */}
            <LogoImage 
              size={80} 
              style={styles.logo}
              accessibilityLabel="BetterU Logo"
            />
            
            {/* Error icon with attention-grabbing color */}
            <View style={styles.errorIcon}>
              <Ionicons name="warning-outline" size={60} color="#ff4444" />
            </View>
            
            <Text 
              style={styles.errorTitle}
              accessibilityRole="header"
            >
              Oops! Something went wrong
            </Text>
            
            <Text 
              style={styles.errorMessage}
              accessibilityRole="text"
            >
              Don't worry, this happens sometimes. Try refreshing and you'll be back to crushing your fitness goals!
            </Text>

            {/* Action buttons with clear accessibility labels */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={this.handleRetry}
                accessibilityRole="button"
                accessibilityLabel="Retry and refresh the application"
                accessibilityHint="Tap to try loading the app again"
              >
                <Ionicons name="refresh" size={20} color="#000" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>

              {/* Debug button (only show in development) */}
              {__DEV__ && (
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={this.showErrorDetails}
                  accessibilityRole="button"
                  accessibilityLabel="Show error details for debugging"
                  accessibilityHint="Tap to view technical error information"
                >
                  <Ionicons name="bug-outline" size={20} color="#00ffff" />
                  <Text style={styles.debugButtonText}>Error Details</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  logo: {
    marginBottom: 20,
    opacity: 0.8,
  },
  errorIcon: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#B3B3B3',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#00ffff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00ffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  debugButtonText: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ErrorBoundary;