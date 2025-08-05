import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  Animated,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LogoImage } from '../../../utils/imageUtils';
import { theme, Button } from '../../components/DesignSystem';
import { AccessibleView } from '../../components/AccessibilityWrapper';

/**
 * Enhanced Welcome Screen Component
 * 
 * UX Improvements Explained:
 * - Progressive disclosure: Shows features one by one for better comprehension
 * - Micro-interactions: Smooth animations create premium feel
 * - Accessibility: Full screen reader support with semantic structure
 * - Clear CTA: Single primary action reduces cognitive load
 * 
 * Animation Concepts:
 * - Parallel animations: Multiple elements animate simultaneously
 * - useNativeDriver: Offloads animation to native thread for 60fps
 * - Easing curves: Natural motion that feels responsive
 */
export default function WelcomeScreen() {
  const router = useRouter();
  
  // Animation values with meaningful names
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [featureAnimations] = useState([
    new Animated.Value(0),
    new Animated.Value(0), 
    new Animated.Value(0),
  ]);

  // Memoized feature data to prevent unnecessary re-calculations
  const features = useMemo(() => [
    {
      icon: "barbell-outline",
      title: "Personalized Workouts", 
      description: "AI-powered routines tailored to your fitness level"
    },
    {
      icon: "fitness-outline", 
      title: "Track Your Progress",
      description: "Comprehensive analytics to see your improvement"
    },
    {
      icon: "trophy-outline",
      title: "Achieve Your Goals", 
      description: "Set targets and celebrate every milestone"
    }
  ], []);

  useEffect(() => {
    // Staggered entrance animation for better visual hierarchy
    const mainAnimation = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);

    // Feature animations with staggered timing
    const featureAnimationsArray = featureAnimations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 600,
        delay: 300 + (index * 200), // Each feature appears 200ms after the previous
        useNativeDriver: true,
      })
    );

    // Start main animation, then features
    mainAnimation.start(() => {
      Animated.parallel(featureAnimationsArray).start();
    });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Set status bar to light content for dark background */}
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Logo with enhanced accessibility */}
          <AccessibleView 
            style={styles.logoContainer}
            accessibilityRole="image"
            accessibilityLabel="BetterU app logo, a fitness and wellness application"
          >
            <LogoImage 
              size={150} 
              style={styles.logo}
              accessibilityLabel="BetterU Logo"
            />
          </AccessibleView>

          {/* Header text with semantic structure */}
          <AccessibleView
            accessibilityRole="header"
            accessibilityLabel="Welcome to BetterU"
          >
            <Text style={styles.title}>Welcome to BetterU</Text>
          </AccessibleView>
          
          <Text 
            style={styles.subtitle}
            accessibilityRole="text"
            accessibilityLabel="Your journey to a stronger, healthier you begins here"
          >
            Your journey to a stronger, healthier you begins here
          </Text>

          {/* Features with staggered animations and accessibility */}
          <AccessibleView 
            style={styles.featuresContainer}
            accessibilityRole="list"
            accessibilityLabel="App features"
          >
            {features.map((feature, index) => (
              <Animated.View
                key={feature.title}
                style={[
                  styles.feature,
                  {
                    opacity: featureAnimations[index],
                    transform: [{
                      translateY: featureAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    }],
                  },
                ]}
                accessibilityRole="listitem"
              >
                <View style={styles.featureIcon}>
                  <Ionicons 
                    name={feature.icon} 
                    size={28} 
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </Animated.View>
            ))}
          </AccessibleView>

          {/* Enhanced CTA button with design system */}
          <Button
            title="Get Started"
            icon="arrow-forward"
            onPress={() => router.push('/(auth)/onboarding/goal-gender')}
            variant="primary"
            size="large"
            style={styles.ctaButton}
            accessibilityLabel="Get started with BetterU onboarding"
            accessibilityHint="Tap to begin setting up your fitness profile"
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'ios' ? 50 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    maxWidth: 400, // Responsive design for tablets
  },
  logoContainer: {
    marginBottom: theme.spacing.xxl,
    // Enhanced logo styling with glow effect
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    // Logo styling is handled by the LogoImage component
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xxl,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: theme.spacing.md,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surfaceLight,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },
  featureIcon: {
    marginRight: theme.spacing.md,
    marginTop: 2, // Align with text baseline
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  featureDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  ctaButton: {
    width: '100%',
    marginTop: theme.spacing.lg,
  },
}); 