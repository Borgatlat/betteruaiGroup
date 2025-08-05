import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './DesignSystem';
import { AccessibleView } from './AccessibilityWrapper';

/**
 * Network Status Component
 * 
 * UX Concepts Explained:
 * - Progressive Enhancement: App works offline, but shows what's unavailable
 * - Contextual Feedback: Only shows when relevant (offline or poor connection)
 * - Non-intrusive Design: Appears at top without blocking content
 * - Auto-dismiss: Hides when connection is restored
 * 
 * Why this matters: Mobile users often have unreliable connections
 * Good offline UX = users can still use your app anywhere!
 */

const NetworkStatus = memo(() => {
  const [isOffline, setIsOffline] = useState(false);
  const [connectionType, setConnectionType] = useState('unknown');
  const [slideAnim] = useState(new Animated.Value(-60)); // Start hidden above screen

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('Network state changed:', state);
      
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);
      setConnectionType(state.type);
      
      // Animate the status bar in/out
      Animated.timing(slideAnim, {
        toValue: offline ? 0 : -60, // Show when offline, hide when online
        duration: 300,
        useNativeDriver: true,
      }).start();
    });

    return () => unsubscribe();
  }, []);

  if (!isOffline) {
    return null; // Don't render anything when online
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <AccessibleView
        style={styles.content}
        accessibilityRole="alert"
        accessibilityLabel="You are currently offline. Some features may not be available."
        accessibilityLiveRegion="assertive" // Immediately announces changes
      >
        <Ionicons 
          name="wifi-outline" 
          size={20} 
          color={theme.colors.textPrimary}
        />
        <Text style={styles.text}>
          {connectionType === 'cellular' 
            ? 'Limited connection - some features unavailable'
            : 'You\'re offline - limited functionality'
          }
        </Text>
      </AccessibleView>
    </Animated.View>
  );
});

/**
 * Retry Button Component for Failed Operations
 * 
 * Use this when network requests fail to give users easy recovery
 */
export const RetryButton = memo(({ onRetry, isLoading = false, style }) => {
  return (
    <AccessibleView style={[styles.retryContainer, style]}>
      <Text style={styles.retryText}>Something went wrong</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={onRetry}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel="Retry the last action"
        accessibilityHint="Tap to try the operation again"
        accessibilityState={{ busy: isLoading }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <>
            <Ionicons name="refresh" size={16} color={theme.colors.primary} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </>
        )}
      </TouchableOpacity>
    </AccessibleView>
  );
});

/**
 * Empty State Component
 * 
 * Shows when lists or data are empty - much better than blank screens
 */
export const EmptyState = memo(({ 
  icon = 'document-outline',
  title = 'Nothing here yet',
  description = 'Content will appear here when available',
  actionButton,
  style 
}) => {
  return (
    <AccessibleView 
      style={[styles.emptyState, style]}
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${description}`}
    >
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={64} color={theme.colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {actionButton}
    </AccessibleView>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: theme.colors.warning,
    paddingTop: Platform.select({
      ios: 44, // Status bar height
      android: 25,
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  text: {
    ...theme.typography.caption,
    color: theme.colors.background,
    fontWeight: '600',
  },
  retryContainer: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  retryText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
  },
  retryButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyIcon: {
    marginBottom: theme.spacing.lg,
    opacity: 0.6,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default NetworkStatus;