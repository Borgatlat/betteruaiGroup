import React, { useState, useCallback, memo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Animated,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './DesignSystem';
import { AccessibleView } from './AccessibilityWrapper';
import { useDebounce } from '../hooks/usePerformance';

/**
 * Enhanced Form Input Component
 * 
 * Form UX Best Practices Explained:
 * - Real-time Validation: Immediate feedback as user types
 * - Progressive Error States: Gentle → firm error messaging
 * - Clear Success States: Visual confirmation when valid
 * - Accessibility First: Screen reader friendly
 * 
 * Validation Timing Strategy:
 * - On Focus: Show format hints
 * - On Blur: Validate and show errors
 * - On Change: Real-time validation for critical fields
 * - On Submit: Final validation with clear error summary
 */

const EnhancedFormInput = memo(({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  validator,
  required = false,
  errorMessage,
  successMessage,
  hint,
  icon,
  maxLength,
  style,
  autoComplete,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasBeenBlurred, setHasBeenBlurred] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isValid, setIsValid] = useState(false);
  
  // Debounce validation to avoid excessive validation calls
  const debouncedValue = useDebounce(value, 300);
  
  // Memoized validation function
  const validateInput = useCallback((inputValue) => {
    if (!validator) return { isValid: true, error: '' };
    
    try {
      const result = validator(inputValue);
      return typeof result === 'boolean' 
        ? { isValid: result, error: result ? '' : 'Invalid input' }
        : result; // { isValid: boolean, error: string }
    } catch (error) {
      return { isValid: false, error: 'Validation error' };
    }
  }, [validator]);

  // Run validation when debounced value changes
  React.useEffect(() => {
    if (debouncedValue && hasBeenBlurred) {
      const validation = validateInput(debouncedValue);
      setLocalError(validation.error);
      setIsValid(validation.isValid);
    }
  }, [debouncedValue, hasBeenBlurred, validateInput]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setHasBeenBlurred(true);
    
    // Validate on blur for immediate feedback
    if (value) {
      const validation = validateInput(value);
      setLocalError(validation.error);
      setIsValid(validation.isValid);
    }
  }, [value, validateInput]);

  const handleChangeText = useCallback((text) => {
    onChangeText(text);
    
    // Clear errors when user starts typing again
    if (localError && text !== value) {
      setLocalError('');
    }
  }, [onChangeText, localError, value]);

  // Determine current state for styling and accessibility
  const currentError = errorMessage || localError;
  const hasError = Boolean(currentError && hasBeenBlurred);
  const hasSuccess = isValid && value && hasBeenBlurred && !hasError;
  
  // Dynamic border color based on state
  const borderColor = hasError 
    ? theme.colors.error 
    : hasSuccess 
      ? theme.colors.success 
      : isFocused 
        ? theme.colors.borderFocus 
        : theme.colors.border;

  // Accessibility label combining all relevant information
  const accessibilityLabel = `${label}${required ? ', required' : ''}${hint ? `, ${hint}` : ''}`;
  const accessibilityValue = { text: value || '' };
  const accessibilityState = { 
    selected: isFocused,
    invalid: hasError,
  };

  return (
    <AccessibleView 
      style={[styles.container, style]}
      accessibilityRole="group"
      accessibilityLabel={`${label} input field`}
    >
      {/* Label with required indicator */}
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        {maxLength && value && (
          <Text style={styles.charCount}>
            {value.length}/{maxLength}
          </Text>
        )}
      </View>

      {/* Input container with state-based styling */}
      <View style={[
        styles.inputContainer,
        { borderColor },
        isFocused && styles.inputContainerFocused,
        hasError && styles.inputContainerError,
        hasSuccess && styles.inputContainerSuccess,
      ]}>
        {/* Icon if provided */}
        {icon && (
          <Ionicons 
            name={icon} 
            size={20} 
            color={isFocused ? theme.colors.primary : theme.colors.textMuted}
            style={styles.inputIcon}
          />
        )}
        
        {/* The actual text input */}
        <TextInput
          style={[
            styles.input,
            { color: hasError ? theme.colors.error : theme.colors.textPrimary }
          ]}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={accessibilityLabel}
          accessibilityValue={accessibilityValue}
          accessibilityState={accessibilityState}
          accessibilityHint={hint}
          {...props}
        />
        
        {/* Status indicator */}
        <View style={styles.statusContainer}>
          {hasError && (
            <Ionicons 
              name="alert-circle" 
              size={20} 
              color={theme.colors.error}
            />
          )}
          {hasSuccess && (
            <Ionicons 
              name="checkmark-circle" 
              size={20} 
              color={theme.colors.success}
            />
          )}
        </View>
      </View>

      {/* Helper text, error, or success message */}
      <View style={styles.messageContainer}>
        {hint && !hasError && !hasSuccess && (
          <Text 
            style={styles.hint}
            accessibilityRole="text"
          >
            {hint}
          </Text>
        )}
        
        {hasError && (
          <Text 
            style={styles.errorText}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            {currentError}
          </Text>
        )}
        
        {hasSuccess && successMessage && (
          <Text 
            style={styles.successText}
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
          >
            {successMessage}
          </Text>
        )}
      </View>
    </AccessibleView>
  );
});

/**
 * Common Validation Functions
 * 
 * These provide consistent validation across your app.
 * You can easily extend these for your specific needs.
 */
export const validators = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    return {
      isValid,
      error: isValid ? '' : 'Please enter a valid email address'
    };
  },
  
  password: (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    if (password.length < minLength) {
      return { isValid: false, error: `Password must be at least ${minLength} characters` };
    }
    if (!hasUpperCase || !hasLowerCase) {
      return { isValid: false, error: 'Password must contain both uppercase and lowercase letters' };
    }
    if (!hasNumbers) {
      return { isValid: false, error: 'Password must contain at least one number' };
    }
    
    return { isValid: true, error: '' };
  },
  
  required: (value) => ({
    isValid: Boolean(value && value.trim()),
    error: 'This field is required'
  }),
  
  number: (value, min, max) => {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { isValid: false, error: 'Please enter a valid number' };
    }
    if (min !== undefined && num < min) {
      return { isValid: false, error: `Minimum value is ${min}` };
    }
    if (max !== undefined && num > max) {
      return { isValid: false, error: `Maximum value is ${max}` };
    }
    return { isValid: true, error: '' };
  },
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  required: {
    color: theme.colors.error,
  },
  charCount: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 50,
  },
  inputContainerFocused: {
    backgroundColor: theme.colors.surfaceLight,
    ...theme.shadows.small,
  },
  inputContainerError: {
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
  },
  inputContainerSuccess: {
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    ...theme.typography.body,
    paddingVertical: theme.spacing.md,
    color: theme.colors.textPrimary,
  },
  statusContainer: {
    width: 24,
    alignItems: 'center',
  },
  messageContainer: {
    marginTop: theme.spacing.sm,
    minHeight: 20, // Prevents layout shift
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: '500',
  },
  successText: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontWeight: '500',
  },
});

export default EnhancedFormInput;