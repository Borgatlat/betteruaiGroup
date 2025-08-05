import React from 'react';
import { TouchableOpacity, View } from 'react-native';

/**
 * AccessibilityWrapper Component
 * 
 * This wrapper ensures consistent accessibility across all interactive elements.
 * 
 * Key Accessibility Concepts:
 * - accessibilityRole: Defines what type of element this is (button, text, etc.)
 * - accessibilityLabel: Descriptive text for screen readers
 * - accessibilityHint: Additional context about what happens when pressed
 * - accessibilityState: Current state (disabled, selected, etc.)
 * 
 * Why this matters: 15% of users have some form of visual impairment.
 * Good accessibility = better UX for everyone!
 */

export const AccessibleTouchable = ({ 
  children, 
  onPress, 
  accessibilityLabel, 
  accessibilityHint, 
  accessibilityRole = 'button',
  disabled = false,
  selected = false,
  style,
  ...props 
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[style, disabled && { opacity: 0.6 }]}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled,
        selected,
      }}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
};

/**
 * AccessibleView for non-interactive content that needs accessibility
 * 
 * Use this for:
 * - Progress indicators
 * - Statistics displays  
 * - Status messages
 */
export const AccessibleView = ({ 
  children, 
  accessibilityLabel, 
  accessibilityRole = 'text',
  accessibilityLiveRegion,
  style,
  ...props 
}) => {
  return (
    <View
      style={style}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion={accessibilityLiveRegion} // For dynamic content
      {...props}
    >
      {children}
    </View>
  );
};

/**
 * Accessible Progress Ring
 * 
 * Converts visual progress rings into meaningful screen reader announcements
 */
export const AccessibleProgressRing = ({ 
  progress, 
  label, 
  current, 
  goal, 
  children,
  style 
}) => {
  const percentage = Math.round((progress || 0) * 100);
  const accessibilityLabel = `${label}: ${current} of ${goal}, ${percentage} percent complete`;
  
  return (
    <AccessibleView
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite" // Announces changes
    >
      {children}
    </AccessibleView>
  );
};