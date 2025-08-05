import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AccessibleTouchable, AccessibleView } from './AccessibilityWrapper';

/**
 * BetterU Design System
 * 
 * Professional Concepts Explained:
 * - Design Tokens: Consistent values for colors, spacing, typography
 * - Component Library: Reusable UI components with consistent styling
 * - Theme System: Centralized theme management for maintainability
 * - Semantic Naming: Colors named by purpose, not appearance
 * 
 * Why this matters: Consistent design = professional app that users trust
 * What if you change colors here? → Entire app updates automatically!
 */

// Design Tokens (the "DNA" of your app's visual design)
export const theme = {
  colors: {
    // Primary Brand Colors
    primary: '#00ffff',        // BetterU cyan brand color
    primaryDark: '#00cccc',    // Darker cyan for pressed states
    
    // Background Colors (Dark Theme)
    background: '#000000',     // Main background
    surface: '#111111',        // Card/modal backgrounds
    surfaceLight: 'rgba(255, 255, 255, 0.05)', // Subtle surfaces
    
    // Text Colors
    textPrimary: '#ffffff',    // Main text
    textSecondary: '#B3B3B3',  // Secondary text
    textMuted: '#666666',      // Muted text
    
    // Status Colors
    success: '#00ff00',        // Success/completed states
    warning: '#ffaa00',        // Warning states
    error: '#ff4444',          // Error states
    info: '#0088ff',           // Info states
    
    // Interactive Colors
    border: 'rgba(255, 255, 255, 0.1)', // Border color
    borderFocus: '#00ffff',    // Focused border
    disabled: 'rgba(255, 255, 255, 0.3)', // Disabled elements
  },
  
  spacing: {
    xs: 4,    // 4px - tiny spacing
    sm: 8,    // 8px - small spacing  
    md: 16,   // 16px - medium spacing (most common)
    lg: 24,   // 24px - large spacing
    xl: 32,   // 32px - extra large spacing
    xxl: 48,  // 48px - section spacing
  },
  
  typography: {
    // Font sizes with responsive scaling
    h1: { fontSize: 32, fontWeight: 'bold', lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: 'bold', lineHeight: 32 },
    h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
    body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
    caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
    small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  },
  
  borderRadius: {
    sm: 8,    // Small radius for buttons
    md: 12,   // Medium radius for cards
    lg: 16,   // Large radius for modals
    xl: 24,   // Extra large radius
    full: 999, // Circular elements
  },
  
  shadows: {
    // Platform-specific shadow styles
    small: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
    medium: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
};

/**
 * Standardized Button Component
 * 
 * React Performance Concepts:
 * - memo(): Prevents re-renders when props haven't changed
 * - Consistent API: Same props interface across all button types
 */
export const Button = memo(({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'medium',
  icon,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  ...props 
}) => {
  const buttonStyles = [
    styles.button,
    styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
    styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}`],
    disabled && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.buttonText,
    styles[`buttonText${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
    disabled && styles.buttonTextDisabled,
  ];

  return (
    <AccessibleTouchable
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      {...props}
    >
      {icon && (
        <Ionicons 
          name={icon} 
          size={20} 
          color={variant === 'primary' ? theme.colors.background : theme.colors.primary}
          style={styles.buttonIcon}
        />
      )}
      <Text style={textStyles}>{title}</Text>
    </AccessibleTouchable>
  );
});

/**
 * Standardized Card Component
 * 
 * Design Patterns Explained:
 * - Elevation: Visual hierarchy through shadows
 * - Consistent spacing: Using design tokens
 * - Accessibility: Proper labeling for card content
 */
export const Card = memo(({ 
  children, 
  title,
  onPress,
  style,
  accessibilityLabel,
  ...props 
}) => {
  const CardComponent = onPress ? AccessibleTouchable : AccessibleView;
  
  return (
    <CardComponent
      style={[styles.card, style]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole={onPress ? 'button' : 'group'}
      {...props}
    >
      {title && (
        <Text style={styles.cardTitle} accessibilityRole="header">
          {title}
        </Text>
      )}
      {children}
    </CardComponent>
  );
});

/**
 * Progress Ring with Accessibility
 * 
 * SVG + Accessibility Concepts:
 * - Semantic labeling for progress visualization
 * - Mathematical calculations for stroke-dasharray animation
 * - Live region updates for dynamic progress
 */
export const ProgressRing = memo(({ 
  progress, 
  size = 120, 
  strokeWidth = 8,
  color = theme.colors.primary,
  label,
  value,
  maxValue,
  children 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress * circumference);
  const percentage = Math.round(progress * 100);

  return (
    <AccessibleView
      style={{ width: size, height: size }}
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${value} of ${maxValue}, ${percentage} percent complete`}
      accessibilityLiveRegion="polite"
    >
      {children}
    </AccessibleView>
  );
});

// Standardized Styles
const styles = StyleSheet.create({
  // Button Styles
  button: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    ...theme.shadows.small,
  },
  
  // Button Variants
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  buttonDanger: {
    backgroundColor: theme.colors.error,
  },
  
  // Button Sizes
  buttonSmall: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  buttonMedium: {
    // Default size (already defined above)
  },
  buttonLarge: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  
  // Button States
  buttonDisabled: {
    opacity: 0.6,
    backgroundColor: theme.colors.disabled,
  },
  
  // Button Text Styles
  buttonText: {
    ...theme.typography.body,
    fontWeight: 'bold',
  },
  buttonTextPrimary: {
    color: theme.colors.background,
  },
  buttonTextSecondary: {
    color: theme.colors.primary,
  },
  buttonTextDanger: {
    color: theme.colors.textPrimary,
  },
  buttonTextDisabled: {
    color: theme.colors.textMuted,
  },
  
  buttonIcon: {
    marginRight: theme.spacing.xs,
  },
  
  // Card Styles
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },
  
  cardTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
});

export default { theme, Button, Card, ProgressRing };