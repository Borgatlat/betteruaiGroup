import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './DesignSystem';
import { AccessibleView, AccessibleTouchable } from './AccessibilityWrapper';

/**
 * Optimized Activity Ring Component (Apple Fitness Style)
 * 
 * Performance Optimizations Explained:
 * - memo(): Prevents re-render unless props change
 * - useMemo(): Caches expensive SVG calculations
 * - Semantic colors: Each ring has meaning (red=move, green=exercise, blue=stand)
 * 
 * Accessibility Features:
 * - Screen reader announces progress percentages
 * - Live region updates when progress changes
 * - Descriptive labels for each activity type
 * 
 * What if you change the strokeWidth? → Affects both visual thickness and calculations
 * What if you change the size? → All proportions scale automatically
 */

const OptimizedActivityRing = memo(({ 
  progress = 0, 
  size = 120, 
  strokeWidth = 8, 
  color = theme.colors.primary,
  backgroundColor = '#222',
  valueText,
  label,
  onPress,
  current = 0,
  goal = 100,
  unit = '',
  style
}) => {
  // Memoize expensive calculations (only recalculate when inputs change)
  const ringCalculations = useMemo(() => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const clampedProgress = Math.max(0, Math.min(1, progress)); // Ensure 0-1 range
    const offset = circumference - (clampedProgress * circumference);
    const percentage = Math.round(clampedProgress * 100);
    
    return {
      radius,
      circumference, 
      offset,
      percentage,
      centerPosition: size / 2,
    };
  }, [progress, size, strokeWidth]);

  const { radius, circumference, offset, percentage, centerPosition } = ringCalculations;

  // Accessibility label with comprehensive information
  const accessibilityLabel = useMemo(() => {
    return `${label}: ${current}${unit} of ${goal}${unit}, ${percentage} percent complete`;
  }, [label, current, goal, unit, percentage]);

  const RingComponent = onPress ? AccessibleTouchable : AccessibleView;

  return (
    <RingComponent
      style={[{ width: size, height: size }, style]}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'progressbar'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={onPress ? `Tap to edit ${label.toLowerCase()} goal` : undefined}
      accessibilityLiveRegion="polite" // Announces progress changes
    >
      {/* SVG Ring with optimized rendering */}
      <Svg width={size} height={size}>
        {/* Background ring (shows total capacity) */}
        <Circle
          cx={centerPosition}
          cy={centerPosition}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress ring (shows current progress) */}
        <Circle
          cx={centerPosition}
          cy={centerPosition}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference},${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          // Smooth animation when progress changes
          style={{
            transition: 'stroke-dashoffset 0.3s ease-in-out',
          }}
        />
      </Svg>
      
      {/* Center content with value and label */}
      <View style={styles.centerContent}>
        <Text 
          style={[styles.valueText, { color }]}
          accessibilityRole="text"
        >
          {valueText || `${percentage}%`}
        </Text>
        {label && (
          <Text 
            style={styles.labelText}
            accessibilityRole="text"
          >
            {label}
          </Text>
        )}
      </View>

      {/* Progress indicator for goals over 100% */}
      {percentage > 100 && (
        <View style={styles.achievementBadge}>
          <Ionicons name="trophy" size={16} color={theme.colors.warning} />
        </View>
      )}
    </RingComponent>
  );
});

/**
 * Unified Activity Ring Component (Multiple Rings in One)
 * 
 * Advanced React Pattern: Compound Component
 * - Renders multiple activity rings in concentric circles
 * - Optimized rendering with single SVG container
 * - Accessibility announces overall health score
 */
export const UnifiedActivityRing = memo(({ 
  data = [],
  size = 200,
  strokeWidth = 12,
  spacing = 20,
  onPress,
  style 
}) => {
  // Calculate ring positions (outer to inner)
  const ringPositions = useMemo(() => {
    return data.map((_, index) => ({
      radius: (size - strokeWidth) / 2 - (index * spacing),
      size: size - (index * spacing * 2),
    }));
  }, [data.length, size, strokeWidth, spacing]);

  // Overall progress calculation
  const overallProgress = useMemo(() => {
    if (!data.length) return 0;
    const totalProgress = data.reduce((sum, item) => sum + (item.progress || 0), 0);
    return totalProgress / data.length;
  }, [data]);

  const accessibilityLabel = useMemo(() => {
    const descriptions = data.map(item => 
      `${item.label}: ${Math.round((item.progress || 0) * 100)}%`
    ).join(', ');
    return `Activity rings: ${descriptions}. Overall progress: ${Math.round(overallProgress * 100)}%`;
  }, [data, overallProgress]);

  return (
    <AccessibleView
      style={[{ width: size, height: size }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="group"
      accessibilityLiveRegion="polite"
    >
      <Svg width={size} height={size}>
        {data.map((ringData, index) => {
          const position = ringPositions[index];
          const circumference = position.radius * 2 * Math.PI;
          const progress = Math.max(0, Math.min(1, ringData.progress || 0));
          const offset = circumference - (progress * circumference);

          return (
            <React.Fragment key={index}>
              {/* Background ring */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={position.radius}
                stroke="#222"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Progress ring */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={position.radius}
                stroke={ringData.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${circumference},${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Center content showing overall progress */}
      <View style={styles.unifiedCenterContent}>
        <Text style={styles.overallPercentage}>
          {Math.round(overallProgress * 100)}%
        </Text>
        <Text style={styles.overallLabel}>Complete</Text>
      </View>

      {/* Individual ring labels around the outside */}
      {data.map((ringData, index) => (
        <View
          key={index}
          style={[
            styles.ringLabel,
            {
              transform: [
                { rotate: `${(index * 120)}deg` },
                { translateY: -size * 0.35 },
                { rotate: `${-(index * 120)}deg` },
              ],
            },
          ]}
        >
          <Text style={[styles.ringLabelText, { color: ringData.color }]}>
            {ringData.label}
          </Text>
        </View>
      ))}
    </AccessibleView>
  );
});

const styles = StyleSheet.create({
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    ...theme.typography.h3,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  labelText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  achievementBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    padding: 4,
    borderWidth: 2,
    borderColor: theme.colors.warning,
  },
  unifiedCenterContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overallPercentage: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
  },
  overallLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  ringLabel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabelText: {
    ...theme.typography.small,
    fontWeight: '600',
  },
});

export { OptimizedActivityRing as ActivityRing, UnifiedActivityRing };
export default OptimizedActivityRing;