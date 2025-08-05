import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from './DesignSystem';
import { AccessibleTouchable } from './AccessibilityWrapper';

/**
 * Enhanced Tab Bar Component
 * 
 * Navigation UX Concepts Explained:
 * - Haptic Feedback: Physical response confirms user action
 * - Visual State Management: Clear active/inactive states
 * - Badge System: Notifications and updates indicators  
 * - Accessibility Navigation: Screen reader friendly
 * 
 * iOS Human Interface Guidelines:
 * - Tab bars should have 3-5 items for optimal usability
 * - Icons should be recognizable and consistent
 * - Labels should be concise and descriptive
 * 
 * What if you add more tabs? → Consider "More" tab for overflow
 * What if you change icon sizes? → Ensure 44pt minimum touch target
 */

const EnhancedTabBar = memo(({ 
  tabs = [],
  activeTab,
  onTabPress,
  badges = {},
  style 
}) => {
  
  // Optimized tab press handler with haptic feedback
  const handleTabPress = useCallback(async (tabName, index) => {
    // Haptic feedback for better tactile experience
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Call parent handler
    onTabPress?.(tabName, index);
  }, [onTabPress]);

  return (
    <View 
      style={[styles.container, style]}
      accessibilityRole="tablist"
      accessibilityLabel="Main navigation tabs"
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.name;
        const badgeCount = badges[tab.name] || 0;
        
        return (
          <AccessibleTouchable
            key={tab.name}
            style={[
              styles.tab,
              isActive && styles.tabActive,
            ]}
            onPress={() => handleTabPress(tab.name, index)}
            accessibilityRole="tab"
            accessibilityLabel={`${tab.title} tab`}
            accessibilityHint={`Navigate to ${tab.title} screen`}
            accessibilityState={{ selected: isActive }}
          >
            {/* Icon with state-based styling */}
            <View style={styles.iconContainer}>
              <Ionicons
                name={tab.icon(isActive)}
                size={24}
                color={isActive ? theme.colors.primary : theme.colors.textMuted}
                accessibilityHidden={true} // Label provides context
              />
              
              {/* Badge for notifications/updates */}
              {badgeCount > 0 && (
                <View 
                  style={styles.badge}
                  accessibilityRole="text"
                  accessibilityLabel={`${badgeCount} notifications`}
                >
                  <Text style={styles.badgeText}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Tab label with dynamic styling */}
            <Text 
              style={[
                styles.tabLabel,
                isActive ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
              accessibilityHidden={true} // Handled by parent accessibility
            >
              {tab.title}
            </Text>
            
            {/* Active indicator dot */}
            {isActive && <View style={styles.activeIndicator} />}
          </AccessibleTouchable>
        );
      })}
    </View>
  );
});

/**
 * Tab Badge Component (Standalone)
 * 
 * Use for notification counts, update indicators, etc.
 */
export const TabBadge = memo(({ count, style, maxCount = 99 }) => {
  if (!count || count <= 0) return null;
  
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  
  return (
    <View 
      style={[styles.badge, style]}
      accessibilityRole="text"
      accessibilityLabel={`${count} notifications`}
    >
      <Text style={styles.badgeText}>{displayCount}</Text>
    </View>
  );
});

/**
 * Enhanced Tab Configuration
 * 
 * Improved tab configuration with better icons and descriptions
 */
export const enhancedTabConfig = {
  home: {
    title: 'Home',
    icon: (focused) => focused ? 'home' : 'home-outline',
    description: 'Dashboard and daily tracking'
  },
  workout: {
    title: 'Workout', 
    icon: (focused) => focused ? 'barbell' : 'barbell-outline',
    description: 'Exercise routines and tracking'
  },
  mental: {
    title: 'Mental',
    icon: (focused) => focused ? 'leaf' : 'leaf-outline', 
    description: 'Mindfulness and mental wellness'
  },
  community: {
    title: 'Community',
    icon: (focused) => focused ? 'people' : 'people-outline',
    description: 'Connect with other users'
  },
  run: {
    title: 'Run',
    icon: (focused) => focused ? 'walk' : 'walk-outline',
    description: 'Running tracking and routes'
  }
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
    paddingBottom: Platform.select({
      ios: theme.spacing.lg, // Extra space for home indicator
      android: theme.spacing.sm,
    }),
    paddingHorizontal: theme.spacing.sm,
    ...theme.shadows.medium,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    minHeight: 44, // iOS minimum touch target
  },
  tabActive: {
    backgroundColor: theme.colors.surfaceLight,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: theme.spacing.xs,
  },
  tabLabel: {
    ...theme.typography.small,
    textAlign: 'center',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  tabLabelInactive: {
    color: theme.colors.textMuted,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -theme.spacing.sm,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  badgeText: {
    ...theme.typography.small,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 10,
  },
});

export default EnhancedTabBar;