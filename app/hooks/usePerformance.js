import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { Platform, Dimensions } from 'react-native';

/**
 * Performance Optimization Hooks
 * 
 * React Performance Concepts Explained:
 * - useMemo(): Caches expensive calculations between re-renders
 * - useCallback(): Caches function references to prevent child re-renders
 * - useRef(): Stores values that don't trigger re-renders when changed
 * - Debouncing: Delays execution to prevent excessive API calls
 * 
 * Why this matters: Poor performance = users abandon your app!
 * Mobile devices have limited resources compared to desktop.
 */

/**
 * Debounced Value Hook
 * 
 * Use this for search inputs or any rapidly changing values.
 * Example: User types "apple" → only searches after they stop typing for 300ms
 * 
 * What if you change the delay?
 * - Lower delay (100ms) = More responsive but more API calls
 * - Higher delay (500ms) = Fewer API calls but feels less responsive
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear the timer if value changes before delay completes
    // This prevents unnecessary updates when user is still typing
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Only re-run if value or delay changes

  return debouncedValue;
};

/**
 * Optimized Event Handlers Hook
 * 
 * Creates stable function references that don't change on every render.
 * This prevents child components from re-rendering unnecessarily.
 */
export const useOptimizedHandlers = (dependencies = []) => {
  return {
    // Navigation handlers (cached with useCallback)
    navigateToScreen: useCallback((screenName, params = {}) => {
      // router.push() calls would go here
      console.log(`Navigating to ${screenName}`, params);
    }, dependencies),

    // Form handlers with validation
    createFormHandler: useCallback((field, validator, setter) => {
      return (value) => {
        // Real-time validation as user types
        const isValid = validator ? validator(value) : true;
        setter(value, isValid);
      };
    }, dependencies),

    // Modal handlers (prevents creating new functions on each render)
    createModalHandler: useCallback((modalSetter, value = true) => {
      return () => modalSetter(value);
    }, dependencies),
  };
};

/**
 * Memoized Calculations Hook
 * 
 * Caches expensive calculations like progress percentages, 
 * color interpolations, and data transformations.
 */
export const useMemoizedCalculations = (data) => {
  // Progress calculations (only recalculate when data changes)
  const progressCalculations = useMemo(() => {
    if (!data) return { calorieProgress: 0, waterProgress: 0, proteinProgress: 0 };

    const calorieProgress = data.calories ? 
      Math.min(data.calories.consumed / data.calories.goal, 1) : 0;
    
    const waterProgress = data.water ? 
      Math.min(data.water.consumed / (data.water.goal * 1000), 1) : 0;
    
    const proteinProgress = data.protein ? 
      Math.min(data.protein.consumed / data.protein.goal, 1) : 0;

    return {
      calorieProgress,
      waterProgress, 
      proteinProgress,
      // Overall health score (composite metric)
      overallProgress: (calorieProgress + waterProgress + proteinProgress) / 3,
    };
  }, [data?.calories, data?.water, data?.protein]);

  // Activity ring data (expensive SVG calculations)
  const activityRingData = useMemo(() => {
    const { calorieProgress, waterProgress, proteinProgress } = progressCalculations;
    
    return [
      {
        label: 'Calories',
        progress: calorieProgress,
        color: '#ff6b6b',
        current: data?.calories?.consumed || 0,
        goal: data?.calories?.goal || 2000,
      },
      {
        label: 'Water', 
        progress: waterProgress,
        color: '#4ecdc4',
        current: data?.water?.consumed || 0,
        goal: (data?.water?.goal || 2) * 1000,
      },
      {
        label: 'Protein',
        progress: proteinProgress, 
        color: '#95e1d3',
        current: data?.protein?.consumed || 0,
        goal: data?.protein?.goal || 150,
      },
    ];
  }, [progressCalculations, data]);

  return {
    progressCalculations,
    activityRingData,
  };
};

/**
 * Intersection Observer Hook (for lazy loading)
 * 
 * Advanced Concept: Only load/render components when they're visible
 * Great for long lists or heavy components below the fold
 */
export const useIntersectionObserver = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [threshold]);

  return [elementRef, isVisible];
};

/**
 * Safe Area Hook (handles notches and dynamic islands)
 * 
 * Ensures content doesn't get hidden behind device UI elements
 */
export const useSafeAreaCalculations = () => {
  return useMemo(() => {
    const isIphoneX = Platform.OS === 'ios' && (
      // iPhone X and newer have specific dimensions
      Dimensions.get('window').height >= 812 || 
      Dimensions.get('window').width >= 812
    );

    return {
      paddingTop: Platform.select({
        ios: isIphoneX ? 44 : 20,  // Status bar height
        android: 0,                 // Android handles this automatically
      }),
      paddingBottom: Platform.select({
        ios: isIphoneX ? 34 : 0,   // Home indicator height
        android: 0,
      }),
    };
  }, []);
};