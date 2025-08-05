import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { LogoImage } from '../../utils/imageUtils';

/**
 * Enhanced Loading Screen Component
 * 
 * Key Concepts Explained:
 * - accessibilityRole: Tells screen readers this is a status indicator
 * - accessibilityLabel: Provides descriptive text for visually impaired users
 * - Platform.select(): Adapts spinner color for iOS vs Android design guidelines
 * - Animated logo creates professional brand experience during loading
 */
export default function LoadingScreen() {
  return (
    <View 
      style={styles.container}
      accessibilityRole="status"
      accessibilityLabel="Loading BetterU application, please wait"
    >
      {/* Logo provides visual branding during load */}
      <View style={styles.logoContainer}>
        <LogoImage 
          size={120} 
          accessibilityLabel="BetterU Logo"
        />
      </View>
      
      {/* Loading indicator with platform-specific colors */}
      <ActivityIndicator 
        size="large" 
        color={Platform.select({
          ios: '#00ffff',    // iOS prefers system colors
          android: '#00ffff', // Android can use brand colors
          default: '#00ffff'
        })}
        accessibilityLabel="Loading content"
      />
      
      {/* Loading text provides context */}
      <Text 
        style={styles.loadingText}
        accessibilityRole="text"
      >
        Getting things ready...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000', // Match app's dark theme
    padding: 20,
  },
  logoContainer: {
    marginBottom: 40,
    // Adding subtle shadow for depth
    shadowColor: '#00ffff',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8, // Android shadow
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#B3B3B3',
    textAlign: 'center',
    fontWeight: '500',
  },
}); 