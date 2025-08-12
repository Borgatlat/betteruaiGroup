import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Enhanced Error Display Component
const ErrorDisplay = ({ 
  error, 
  onRetry, 
  onDismiss, 
  type = "default" // "default", "network", "permission", "data"
}) => {
  const getErrorIcon = () => {
    switch (type) {
      case "network":
        return "wifi-outline";
      case "permission":
        return "shield-outline";
      case "data":
        return "cloud-outline";
      default:
        return "warning-outline";
    }
  };

  const getErrorTitle = () => {
    switch (type) {
      case "network":
        return "Connection Error";
      case "permission":
        return "Permission Required";
      case "data":
        return "Data Error";
      default:
        return "Something went wrong";
    }
  };

  const getErrorMessage = () => {
    switch (type) {
      case "network":
        return "Please check your internet connection and try again.";
      case "permission":
        return "This feature requires camera or location permission.";
      case "data":
        return "Unable to load your data. Please try refreshing.";
      default:
        return error?.message || "An unexpected error occurred.";
    }
  };

  const getRetryText = () => {
    switch (type) {
      case "network":
        return "Try Again";
      case "permission":
        return "Grant Permission";
      case "data":
        return "Refresh";
      default:
        return "Retry";
    }
  };

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRetry?.();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss?.();
  };

  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <Ionicons name={getErrorIcon()} size={48} color="#ff4444" />
      </View>
      
      <Text style={styles.errorTitle}>{getErrorTitle()}</Text>
      <Text style={styles.errorMessage}>{getErrorMessage()}</Text>
      
      <View style={styles.errorActions}>
        {onRetry && (
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.retryButtonText}>{getRetryText()}</Text>
          </TouchableOpacity>
        )}
        
        {onDismiss && (
          <TouchableOpacity 
            style={styles.dismissButton}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Enhanced Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // You can also log to a service like Sentry here
    // Sentry.captureException(error, { extra: errorInfo });
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  handleDismiss = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.boundaryContainer}>
          <ErrorDisplay
            error={this.state.error}
            onRetry={this.handleRetry}
            onDismiss={this.handleDismiss}
            type="default"
          />
        </View>
      );
    }

    return this.props.children;
  }
}

// Enhanced Network Error Component
const NetworkError = ({ onRetry, onDismiss }) => (
  <ErrorDisplay
    type="network"
    onRetry={onRetry}
    onDismiss={onDismiss}
  />
);

// Enhanced Permission Error Component
const PermissionError = ({ onRetry, onDismiss }) => (
  <ErrorDisplay
    type="permission"
    onRetry={onRetry}
    onDismiss={onDismiss}
  />
);

// Enhanced Data Error Component
const DataError = ({ onRetry, onDismiss }) => (
  <ErrorDisplay
    type="data"
    onRetry={onRetry}
    onDismiss={onDismiss}
  />
);

const styles = StyleSheet.create({
  boundaryContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 400,
    width: '100%',
  },
  errorIconContainer: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff4444',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  errorActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  retryButton: {
    backgroundColor: '#ff4444',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },
  dismissButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dismissButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export { ErrorBoundary, ErrorDisplay, NetworkError, PermissionError, DataError };
export default ErrorBoundary; 