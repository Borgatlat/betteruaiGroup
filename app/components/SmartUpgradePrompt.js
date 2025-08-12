import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const SmartUpgradePrompt = ({ 
  visible = false,
  type = 'ai_limit', // ai_limit, feature_unlock, streak_bonus, etc.
  currentUsage = 0,
  maxUsage = 10,
  featureName = '',
  onClose,
  onUpgrade
}) => {
  const router = useRouter();
  const [slideAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getPromptContent = () => {
    switch (type) {
      case 'ai_limit':
        return {
          title: 'AI Limit Reached! 🚀',
          subtitle: `You've used ${currentUsage}/${maxUsage} AI messages today`,
          description: 'Upgrade to Premium for 10x more AI messages (100/day) and unlock unlimited personalized coaching!',
          icon: 'chatbubbles',
          gradient: ['#ff6b6b', '#ff8e8e'],
          cta: 'Get 10x More Messages'
        };
      case 'feature_unlock':
        return {
          title: 'Premium Feature Locked 🔒',
          subtitle: `${featureName} is a Premium feature`,
          description: 'Unlock this feature and many more with Premium!',
          icon: 'lock-closed',
          gradient: ['#ffaa00', '#ffcc00'],
          cta: 'Unlock Premium'
        };
      case 'streak_bonus':
        return {
          title: 'Keep Your Streak Alive! 🔥',
          subtitle: 'Premium users get bonus rewards for streaks',
          description: 'Double your streak rewards and unlock exclusive challenges!',
          icon: 'flame',
          gradient: ['#ff0055', '#ff3377'],
          cta: 'Get Streak Bonuses'
        };
      case 'challenge_rewards':
        return {
          title: 'Boost Your Rewards! 🏆',
          subtitle: 'Premium users get 3x challenge rewards',
          description: 'Earn more points, unlock exclusive challenges, and dominate leaderboards!',
          icon: 'trophy',
          gradient: ['#00ff99', '#33ffaa'],
          cta: 'Get 3x Rewards'
        };
      default:
        return {
          title: 'Upgrade to Premium! ⭐',
          subtitle: 'Unlock all features and remove limits',
          description: 'Get unlimited AI coaching, advanced analytics, and exclusive features!',
          icon: 'star',
          gradient: ['#00ffff', '#33ffff'],
          cta: 'Upgrade Now'
        };
    }
  };

  const handleUpgrade = () => {
    onUpgrade?.();
    router.push('/purchase-subscription');
  };

  const handleClose = () => {
    onClose?.();
  };

  const content = getPromptContent();

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.overlay,
        { opacity: fadeAnim }
      ]}
    >
      <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
        <Animated.View 
          style={[
            styles.promptContainer,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                })
              }]
            }
          ]}
        >
          {/* Header with close button */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Icon and gradient background */}
          <LinearGradient
            colors={content.gradient}
            style={styles.iconContainer}
          >
            <Ionicons name={content.icon} size={32} color="#fff" />
          </LinearGradient>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.subtitle}>{content.subtitle}</Text>
            <Text style={styles.description}>{content.description}</Text>

            {/* Premium benefits list */}
            <View style={styles.benefitsContainer}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={16} color="#00ff99" />
                <Text style={styles.benefitText}>Unlimited AI coaching</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={16} color="#00ff99" />
                <Text style={styles.benefitText}>Advanced analytics</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={16} color="#00ff99" />
                <Text style={styles.benefitText}>Premium challenges</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={16} color="#00ff99" />
                <Text style={styles.benefitText}>Ad-free experience</Text>
              </View>
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgrade}
            >
              <LinearGradient
                colors={content.gradient}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>{content.cta}</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Continue free option */}
            <TouchableOpacity onPress={handleClose} style={styles.continueFree}>
              <Text style={styles.continueFreeText}>Continue with Free</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  promptContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 20,
    padding: 24,
    width: width - 40,
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  closeButton: {
    padding: 8,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#00ffff',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
  upgradeButton: {
    width: '100%',
    marginBottom: 16,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  continueFree: {
    paddingVertical: 8,
  },
  continueFreeText: {
    color: '#888',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default SmartUpgradePrompt;

