import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

// Enhanced Touchable Component with Accessibility
const AccessibleTouchable = ({ 
  children, 
  onPress, 
  accessibilityLabel, 
  accessibilityHint, 
  accessibilityRole = "button",
  accessibilityState,
  disabled = false,
  style,
  hapticFeedback = true,
  hapticType = "light",
  minTouchTarget = 44,
  ...props 
}) => {
  const handlePress = () => {
    if (disabled) return;
    
    if (hapticFeedback) {
      switch (hapticType) {
        case "light":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "medium":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "heavy":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case "success":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "warning":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case "error":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        default:
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
    
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      style={[
        {
          minHeight: minTouchTarget,
          minWidth: minTouchTarget,
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}
      activeOpacity={0.8}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
};

// Enhanced Text Component with Accessibility
const AccessibleText = ({ 
  children, 
  accessibilityRole = "text",
  accessibilityLabel,
  style,
  ...props 
}) => {
  return (
    <Text
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.accessibleText,
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

// Enhanced View Component with Accessibility
const AccessibleView = ({ 
  children, 
  accessibilityRole = "none",
  accessibilityLabel,
  accessibilityHint,
  style,
  ...props 
}) => {
  return (
    <View
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={style}
      {...props}
    >
      {children}
    </View>
  );
};

// Enhanced Card Component with Better Touch Targets
const AccessibleCard = ({ 
  children, 
  onPress, 
  accessibilityLabel, 
  accessibilityHint,
  style,
  hapticFeedback = true,
  hapticType = "light",
  ...props 
}) => {
  return (
    <AccessibleTouchable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      style={[
        styles.card,
        style,
      ]}
      hapticFeedback={hapticFeedback}
      hapticType={hapticType}
      minTouchTarget={48}
      {...props}
    >
      {children}
    </AccessibleTouchable>
  );
};

// Enhanced Button Component with Accessibility
const AccessibleButton = ({ 
  title, 
  onPress, 
  disabled = false,
  variant = "primary", // "primary", "secondary", "danger", "success"
  size = "medium", // "small", "medium", "large"
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  hapticFeedback = true,
  hapticType = "light",
  ...props 
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}`]];
    
    if (disabled) {
      return [...baseStyle, styles.buttonDisabled];
    }
    
    switch (variant) {
      case "primary":
        return [...baseStyle, styles.buttonPrimary];
      case "secondary":
        return [...baseStyle, styles.buttonSecondary];
      case "danger":
        return [...baseStyle, styles.buttonDanger];
      case "success":
        return [...baseStyle, styles.buttonSuccess];
      default:
        return [...baseStyle, styles.buttonPrimary];
    }
  };

  const getTextStyle = () => {
    const baseStyle = [styles.buttonText, styles[`buttonText${size.charAt(0).toUpperCase() + size.slice(1)}`]];
    
    if (disabled) {
      return [...baseStyle, styles.buttonTextDisabled];
    }
    
    switch (variant) {
      case "primary":
        return [...baseStyle, styles.buttonTextPrimary];
      case "secondary":
        return [...baseStyle, styles.buttonTextSecondary];
      case "danger":
        return [...baseStyle, styles.buttonTextDanger];
      case "success":
        return [...baseStyle, styles.buttonTextSuccess];
      default:
        return [...baseStyle, styles.buttonTextPrimary];
    }
  };

  return (
    <AccessibleTouchable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[getButtonStyle(), style]}
      hapticFeedback={hapticFeedback}
      hapticType={hapticType}
      minTouchTarget={44}
      {...props}
    >
      <AccessibleText style={[getTextStyle(), textStyle]}>
        {title}
      </AccessibleText>
    </AccessibleTouchable>
  );
};

// Enhanced Input Component with Accessibility
const AccessibleInput = ({ 
  placeholder,
  value,
  onChangeText,
  accessibilityLabel,
  accessibilityHint,
  style,
  ...props 
}) => {
  return (
    <AccessibleView
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel || placeholder}
      accessibilityHint={accessibilityHint}
      style={[styles.input, style]}
      {...props}
    >
      <Text
        style={styles.inputText}
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel || placeholder}
      >
        {value || placeholder}
      </Text>
    </AccessibleView>
  );
};

const styles = StyleSheet.create({
  accessibleText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#fff',
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  button: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  buttonMedium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 44,
  },
  buttonLarge: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 52,
  },
  buttonPrimary: {
    backgroundColor: '#00ffff',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  buttonDanger: {
    backgroundColor: '#ff4444',
  },
  buttonSuccess: {
    backgroundColor: '#00ff00',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonTextSmall: {
    fontSize: 14,
  },
  buttonTextMedium: {
    fontSize: 16,
  },
  buttonTextLarge: {
    fontSize: 18,
  },
  buttonTextPrimary: {
    color: '#000',
  },
  buttonTextSecondary: {
    color: '#00ffff',
  },
  buttonTextDanger: {
    color: '#fff',
  },
  buttonTextSuccess: {
    color: '#000',
  },
  buttonTextDisabled: {
    color: '#666',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 44,
  },
  inputText: {
    color: '#fff',
    fontSize: 16,
  },
});

export {
  AccessibleTouchable,
  AccessibleText,
  AccessibleView,
  AccessibleCard,
  AccessibleButton,
  AccessibleInput,
}; 