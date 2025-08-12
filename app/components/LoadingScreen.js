import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

// Enhanced Skeleton Loading Component
const SkeletonCard = ({ width, height, borderRadius = 8, style }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, []);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          opacity: shimmerOpacity,
        },
        style,
      ]}
    />
  );
};

// Enhanced Loading Screen Component
const LoadingScreen = ({ 
  message = "Loading your progress...", 
  showSkeleton = true,
  type = "default" // "default", "minimal", "skeleton"
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for the loading indicator
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Rotation animation for the icon
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    rotateAnimation.start();

    return () => {
      pulseAnimation.stop();
      rotateAnimation.stop();
    };
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (type === "minimal") {
    return (
      <View style={styles.minimalContainer}>
        <Animated.View style={[styles.minimalIcon, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="fitness" size={32} color="#00ffff" />
        </Animated.View>
        <Text style={styles.minimalText}>{message}</Text>
      </View>
    );
  }

  if (type === "skeleton") {
    return (
      <View style={styles.skeletonContainer}>
        {/* Header skeleton */}
        <View style={styles.skeletonHeader}>
          <SkeletonCard width={120} height={20} style={styles.skeletonGreeting} />
          <SkeletonCard width={80} height={80} borderRadius={40} />
        </View>

        {/* Quote card skeleton */}
        <SkeletonCard width={screenWidth - 40} height={120} style={styles.skeletonCard} />

        {/* Activity ring skeleton */}
        <SkeletonCard width={screenWidth - 40} height={200} style={styles.skeletonCard} />

        {/* Food detection card skeleton */}
        <SkeletonCard width={screenWidth - 40} height={120} style={styles.skeletonCard} />

        {/* AI trainer banner skeleton */}
        <SkeletonCard width={screenWidth - 40} height={80} style={styles.skeletonCard} />

        {/* Wellness card skeleton */}
        <SkeletonCard width={screenWidth - 40} height={120} style={styles.skeletonCard} />

        {/* Tracker card skeleton */}
        <SkeletonCard width={screenWidth - 40} height={200} style={styles.skeletonCard} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.loadingIcon, 
          { 
            transform: [
              { scale: pulseAnim },
              { rotate: spin }
            ] 
          }
        ]}
      >
        <Ionicons name="fitness" size={48} color="#00ffff" />
      </Animated.View>
      
      <Text style={styles.loadingText}>{message}</Text>
      
      <View style={styles.loadingDots}>
        {[0, 1, 2].map((index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                transform: [
                  {
                    scale: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.3],
                    }),
                  },
                ],
                opacity: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 20,
  },
  loadingIcon: {
    marginBottom: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ffff',
    marginHorizontal: 4,
  },
  minimalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  minimalIcon: {
    marginBottom: 15,
  },
  minimalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  skeletonGreeting: {
    flex: 1,
    marginRight: 20,
  },
  skeletonCard: {
    marginBottom: 20,
  },
});

export default LoadingScreen; 