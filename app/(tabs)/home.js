"use client";

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Animated, Dimensions, ScrollView, Platform, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../context/UserContext';
import { useTracking } from '../../context/TrackingContext';
import Svg, { Circle } from 'react-native-svg';
import { PremiumAvatar } from '../components/PremiumAvatar';
import { Picker } from '@react-native-picker/picker';
import { AIMealGenerator } from '../../components/AIMealGenerator';
import { CalorieTracker } from '../../components/CalorieTracker';
import * as ImagePicker from 'expo-image-picker';
import { analyzeFoodWithAI, estimateCaloriesFromDescription } from '../../utils/aiFoodDetection';
import { getUsageStats } from '../../utils/usageTracker';

const { width: screenWidth } = Dimensions.get('window');

// Motivational quotes array
const motivationalQuotes = [
  { text: "The only bad workout is the one that didn't happen", author: "Unknown" },
  { text: "Strength does not come from the physical capacity. It comes from an indomitable will", author: "Mahatma Gandhi" },
  { text: "The body achieves what the mind believes", author: "Napoleon Hill" },
  { text: "Pain is temporary. Quitting lasts forever", author: "Lance Armstrong" },
  { text: "Success isn't always about greatness. It's about consistency", author: "Dwayne Johnson" },
  { text: "The only person you are destined to become is the person you decide to be", author: "Ralph Waldo Emerson" },
  { text: "Don't wish for it. Work for it", author: "Unknown" },
  { text: "Your body can stand almost anything. It's your mind you have to convince", author: "Unknown" },
  { text: "The difference between try and triumph is just a little umph!", author: "Marvin Phillips" },
  { text: "Make yourself proud", author: "Unknown" }
];

// Unified Activity Ring Component (Apple Fitness Style)
const UnifiedActivityRing = ({ water, calories, protein, size = 100, strokeWidth = 12, onPress }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate progress for each metric
  const waterProgress = Math.min(water.consumed / (water.goal * 1000), 1);
  const calorieProgress = Math.min(calories.consumed / calories.goal, 1);
  const proteinProgress = Math.min(protein.consumed / protein.goal, 1);
  
  // Calculate stroke dash offsets
  const waterOffset = circumference * (1 - waterProgress);
  const calorieOffset = circumference * (1 - calorieProgress);
  const proteinOffset = circumference * (1 - proteinProgress);
  
  // Colors for the rings
  const waterColor = "#00ffff";
  const calorieColor = "#ff3131";
  const proteinColor = "#00ff00"; // Neon green for protein
  
  // Calculate ring radii with separation
  const outerRadius = radius + strokeWidth + 2; // Protein ring (outermost)
  const middleRadius = radius; // Water ring (middle)
  const innerRadius = radius - strokeWidth - 4; // Calorie ring (innermost)
  
  // Calculate circumferences for each ring
  const outerCircumference = 2 * Math.PI * outerRadius;
  const middleCircumference = 2 * Math.PI * middleRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;
  
  // Calculate offsets for each ring
  const outerProteinOffset = outerCircumference * (1 - proteinProgress);
  const middleWaterOffset = middleCircumference * (1 - waterProgress);
  const innerCalorieOffset = innerCircumference * (1 - calorieProgress);
  
  // Calculate total SVG size to accommodate all rings with extra padding
  const totalSize = size + strokeWidth + 20; // Much more padding for outer ring
  
  return (
    <TouchableOpacity onPress={onPress} style={{ alignItems: 'center' }}>
      <View style={{ 
        position: 'relative', 
        padding: 15, // More padding around the SVG
        width: totalSize + 30, // Much larger container
        height: totalSize + 30, // Much larger container
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Svg 
          width={totalSize} 
          height={totalSize}
          style={{ 
            overflow: 'visible' // Ensure rings aren't clipped
          }}
        >
          {/* Background circle for protein ring (outermost) */}
          <Circle
            cx={totalSize / 2}
            cy={totalSize / 2}
            r={outerRadius}
            stroke="#1a1a1a"
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          {/* Background circle for water ring (middle) */}
          <Circle
            cx={totalSize / 2}
            cy={totalSize / 2}
            r={middleRadius}
            stroke="#1a1a1a"
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          {/* Background circle for calorie ring (innermost) */}
          <Circle
            cx={totalSize / 2}
            cy={totalSize / 2}
            r={innerRadius}
            stroke="#1a1a1a"
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          {/* Protein ring (outermost) */}
          <Circle
            cx={totalSize / 2}
            cy={totalSize / 2}
            r={outerRadius}
            stroke={proteinColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${outerCircumference},${outerCircumference}`}
            strokeDashoffset={outerProteinOffset}
            strokeLinecap="round"
            opacity={0.9}
          />
          
          {/* Water ring (middle) */}
          <Circle
            cx={totalSize / 2}
            cy={totalSize / 2}
            r={middleRadius}
            stroke={waterColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${middleCircumference},${middleCircumference}`}
            strokeDashoffset={middleWaterOffset}
            strokeLinecap="round"
            opacity={0.9}
          />
          
          {/* Calorie ring (innermost) */}
          <Circle
            cx={totalSize / 2}
            cy={totalSize / 2}
            r={innerRadius}
            stroke={calorieColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${innerCircumference},${innerCircumference}`}
            strokeDashoffset={innerCalorieOffset}
            strokeLinecap="round"
            opacity={0.9}
          />
        </Svg>
      </View>
    </TouchableOpacity>
  );
};

// Add this helper component for activity rings:
const ActivityRing = ({ progress, color, size = 80, strokeWidth = 10, label, valueText }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(progress, 1));
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#222"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference},${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <Text style={{ color: color, fontWeight: 'bold', fontSize: 18 }}>{valueText}</Text>
        {label && <Text style={{ color: '#fff', fontSize: 13 }}>{label}</Text>}
      </View>
    </View>
  );
};

const HomeScreen = () => {
  const router = useRouter();
  const { userProfile, isPremium } = useUser();
  const { calories, water, protein, mood, stats, addCalories, addWater, addProtein, updateGoal, incrementStat, setCalories, setWater, setProtein, setStats } = useTracking();
  const [showCalorieModal, setShowCalorieModal] = useState(false);
  const [calorieInput, setCalorieInput] = useState('');
  const [showCustomWaterModal, setShowCustomWaterModal] = useState(false);
  const [waterInput, setWaterInput] = useState('');
  const [showProteinModal, setShowProteinModal] = useState(false);
  const [proteinInput, setProteinInput] = useState('');
  const [currentQuote, setCurrentQuote] = useState(() => {
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    return motivationalQuotes[randomIndex];
  });
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [showGoalModal, setShowGoalModal] = useState(null);
  const [goalInput, setGoalInput] = useState('');
  const [workoutCompleted, setWorkoutCompleted] = useState(stats.today_workout_completed);
  const [mentalCompleted, setMentalCompleted] = useState(stats.today_mental_completed);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showAIMealModal, setShowAIMealModal] = useState(false);
  const [showFoodDetectionModal, setShowFoodDetectionModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedFood, setDetectedFood] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const calorieTrackerRef = useRef(null);

  const activityData = {
    labels: ["Workout", "Mental", "Water", "Calories"],
    data: [
      workoutCompleted ? 1 : 0,
      mentalCompleted ? 1 : 0,
      Math.min(water.consumed / (water.goal * 1000), 1),
      Math.min(calories.consumed / calories.goal, 1)
    ]
  };

  // Update quote rotation with smooth transitions
  useEffect(() => {
    const rotateQuote = () => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Change quote with true random selection
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * motivationalQuotes.length);
        } while (newIndex === motivationalQuotes.indexOf(currentQuote));
        
        setCurrentQuote(motivationalQuotes[newIndex]);
        
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    };

    const intervalId = setInterval(rotateQuote, 10000); // 10 seconds

    return () => clearInterval(intervalId);
  }, [currentQuote]);

  useEffect(() => {
    const checkMidnightReset = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const timeUntilMidnight = midnight - now;

      if (timeUntilMidnight <= 0) {
        // Reset trackers at midnight
        addCalories(-calories.consumed);
        addWater(-water.consumed);
      }
    };

    const intervalId = setInterval(checkMidnightReset, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [calories.consumed, water.consumed]);

  useEffect(() => {
    setWorkoutCompleted(stats.today_workout_completed);
    setMentalCompleted(stats.today_mental_completed);
  }, [stats.today_workout_completed, stats.today_mental_completed]);

  // Add a useEffect to fetch and sync state on login
  useEffect(() => {
    const fetchStats = async () => {
      if (!userProfile?.id) {
        console.log('Profile not loaded yet');
        return;
      }

      console.log('Fetching stats for user:', userProfile.id);
    };
    fetchStats();
  }, [userProfile]);

  // Add a useEffect to check for daily reset
  useEffect(() => {
    const checkDailyReset = async () => {
      if (!userProfile?.id) return;
    };

    // Check every minute
    const interval = setInterval(checkDailyReset, 60000);
    checkDailyReset(); // Initial check

    return () => clearInterval(interval);
  }, [userProfile]);

  const handleAddCalories = () => {
    const amount = parseInt(calorieInput);
    if (!isNaN(amount) && amount > 0) {
      addCalories(amount);
      setCalorieInput('');
      setShowCalorieModal(false);
    }
  };

  const handleQuickAddCalories = (amount) => {
    if (amount === 'custom') {
      setShowCalorieModal(true);
    } else {
      addCalories(amount);
    }
  };

  const handleAddWater = (amount) => {
    if (amount === 'custom') {
      setShowCustomWaterModal(true);
    } else {
      addWater(amount);
    }
  };

  const handleAddCustomWater = () => {
    const amount = parseFloat(waterInput);
    if (!isNaN(amount) && amount > 0) {
      addWater(amount);
      setWaterInput('');
      setShowCustomWaterModal(false);
    }
  };

  const handleAddProtein = () => {
    const amount = parseInt(proteinInput);
    if (!isNaN(amount) && amount > 0) {
      addProtein(amount);
      setProteinInput('');
      setShowProteinModal(false);
    }
  };

  const handleQuickAddProtein = (amount) => {
    if (amount === 'custom') {
      setShowProteinModal(true);
    } else {
      addProtein(amount);
    }
  };

  // Food Detection Functions
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setDetectedFood(null);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setDetectedFood(null);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const analyzeFood = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    try {
      // Use real AI to analyze the food image
      const result = await analyzeFoodWithAI(selectedImage);
      
      setDetectedFood({
        name: result.name,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        fiber: result.fiber,
        confidence: result.confidence,
        description: result.description
      });
    } catch (error) {
      console.error('Error analyzing food:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to analyze food image.';
      
      if (error.message.includes('API key')) {
        errorMessage = 'AI service not configured. Please contact support.';
      } else if (error.message.includes('network')) {
        errorMessage = 'No internet connection. Please check your network and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('Rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.message.includes('Invalid request')) {
        errorMessage = 'Image format not supported. Please try a different photo.';
      } else if (error.message.includes('usage limit')) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'AI Analysis Failed',
        errorMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Try Manual', 
            onPress: () => {
              // For now, we'll use a default estimation
              const fallbackFood = estimateCaloriesFromDescription('food');
              setDetectedFood({
                name: 'Unknown Food',
                calories: fallbackFood.calories,
                protein: fallbackFood.protein,
                carbs: fallbackFood.carbs,
                fat: fallbackFood.fat,
                fiber: fallbackFood.fiber,
                confidence: 0.5,
                description: 'Unable to detect specific food. Using general estimation.'
              });
            }
          }
        ]
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Load usage stats when modal opens
  const loadUsageStats = async () => {
    try {
      const stats = await getUsageStats();
      setUsageStats(stats);
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  const addDetectedCalories = async () => {
    if (detectedFood) {
      try {
        // Add calories to the tracker
        addCalories(detectedFood.calories);
        
        // Also add protein if available
        if (detectedFood.protein && detectedFood.protein > 0) {
          addProtein(detectedFood.protein);
        }
        
        // Close modal and reset state
        setShowFoodDetectionModal(false);
        setSelectedImage(null);
        setDetectedFood(null);
        
        // Create detailed success message
        let successMessage = `Added ${detectedFood.calories} calories from ${detectedFood.name}`;
        
        if (detectedFood.protein && detectedFood.protein > 0) {
          successMessage += `\n\n📊 Nutrition Breakdown:`;
          successMessage += `\n• Calories: ${detectedFood.calories} cal`;
          successMessage += `\n• Protein: ${detectedFood.protein}g`;
          if (detectedFood.carbs) successMessage += `\n• Carbs: ${detectedFood.carbs}g`;
          if (detectedFood.fat) successMessage += `\n• Fat: ${detectedFood.fat}g`;
          if (detectedFood.fiber) successMessage += `\n• Fiber: ${detectedFood.fiber}g`;
          
          successMessage += `\n\n✅ Updated your daily tracking!`;
        }
        
        // Show success alert with detailed information
        Alert.alert(
          '🍽️ Food Added Successfully!',
          successMessage,
          [
            { 
              text: 'View Activity Ring', 
              onPress: () => setShowActivityModal(true),
              style: 'default'
            },
            { text: 'OK', style: 'cancel' }
          ]
        );
        
        // Force refresh of activity ring data
        // This ensures the UI updates immediately
        setTimeout(() => {
          // Trigger a re-render of the activity ring
          // The context should handle this automatically, but we can force it
          if (typeof addCalories === 'function') {
            // This will trigger a re-render
            addCalories(0); // Add 0 to trigger update
            addCalories(-0); // Remove 0 to revert
          }
        }, 100);
        
      } catch (error) {
        console.error('Error adding detected food:', error);
        Alert.alert(
          'Error',
          'Failed to add food to tracker. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleUpdateGoal = () => {
    const amount = showGoalModal === 'calories' ? parseInt(goalInput) : parseFloat(goalInput);
    if (!isNaN(amount) && amount > 0) {
      updateGoal(showGoalModal, amount);
      setShowGoalModal(null);
      setGoalInput('');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 }]}>
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>Good Afternoon</Text>
          <Text style={styles.nameText}>{userProfile?.full_name || 'User'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => router.push('/profile')}
        >
          <PremiumAvatar
            userId={userProfile?.id}
            size={32}
            source={userProfile?.avatar_url ? { uri: userProfile.avatar_url } : null}
            username={userProfile?.username}
            fullName={userProfile?.full_name}
          />
        </TouchableOpacity>
      </View>

      {/* Motivational Quote Card */}
      <Animated.View style={[styles.quoteCard, { opacity: fadeAnim }]}>
        <Text style={styles.quoteText}>"{currentQuote.text}"</Text>
        <Text style={styles.quoteAuthor}>- {currentQuote.author}</Text>
      </Animated.View>

      {/* Unified Activity Ring */}
      <View style={{ 
        alignItems: 'center', 
        marginTop: 15, 
        marginBottom: 15, 
        paddingHorizontal: 0,
        width: '100%',
        minHeight: 150
      }}>
        <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 15, letterSpacing: 0.5 }}>
          Daily Activity
        </Text>
        <UnifiedActivityRing
          water={water}
          calories={calories}
          protein={protein}
          size={100}
          strokeWidth={12}
          onPress={() => setShowActivityModal(true)}
        />
      </View>

      {/* AI Food Detection Card */}
      <View style={styles.foodDetectionCard}>
        <View style={styles.foodDetectionHeader}>
          <Ionicons name="camera" size={24} color="#ff4444" />
          <Text style={styles.foodDetectionTitle}>AI Food Detection</Text>
        </View>
        <Text style={styles.foodDetectionDescription}>
          Take a photo of your food to automatically detect calories and protein content
        </Text>
        <View style={styles.foodDetectionButtons}>
          <TouchableOpacity 
            style={[styles.foodDetectionButton, styles.cameraButton]}
            onPress={async () => {
              if (isPremium) {
                try {
                  // Request camera permission
                  const { status } = await ImagePicker.requestCameraPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert('Permission needed', 'Camera permission is required to take photos');
                    return;
                  }

                  // Launch camera directly
                  const result = await ImagePicker.launchCameraAsync({
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                  });

                  if (!result.canceled && result.assets[0]) {
                    setSelectedImage(result.assets[0].uri);
                    setDetectedFood(null);
                    setShowFoodDetectionModal(true);
                    loadUsageStats();
                  }
                } catch (error) {
                  console.error('Error taking photo:', error);
                  Alert.alert('Error', 'Failed to take photo. Please try again.');
                }
              } else {
                Alert.alert(
                  'Premium Feature',
                  'AI Food Detection is a premium feature. Upgrade to Premium in settings to unlock this feature!',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Go to Settings', onPress: () => router.push('/settings') }
                  ]
                );
              }
            }}
          >
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.foodDetectionButtonText}>
              {isPremium ? 'Take Photo' : '🔒 Premium Only'}
            </Text>
          </TouchableOpacity>
          
          {!isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>PREMIUM</Text>
            </View>
          )}
        </View>
      </View>

      {/* AI Trainer Banner */}
      <TouchableOpacity 
        style={styles.aiTrainerBanner}
        onPress={() => router.push('/(tabs)/trainer')}
      >
        <View style={styles.aiTrainerContent}>
          <View style={styles.aiTrainerText}>
            <Text style={styles.aiTrainerTitle}>AI Personal Trainer</Text>
            <Text style={styles.aiTrainerSubtitle}>Get personalized workout plans and guidance</Text>
          </View>
          <Ionicons name="fitness" size={32} color="#00ffff" />
          </View>
      </TouchableOpacity>

      {/* Mental Wellness Check */}
      <View style={styles.wellnessCard}>
        <View style={styles.wellnessHeader}>
          <Ionicons name="sad" size={24} color="#ffb6c1" />
          <View style={styles.wellnessText}>
            <Text style={styles.wellnessTitle}>Mental Wellness Check</Text>
            <Text style={styles.wellnessSubtitle}>You're feeling {mood || 'neutral'} today</Text>
          </View>
        </View>
        <Text style={styles.wellnessDescription}>
          Track your daily mood to monitor your mental wellness and identify patterns over time.
        </Text>
        <View style={styles.wellnessButtons}>
          <TouchableOpacity style={styles.wellnessButton} onPress={() => router.push('/(tabs)/mental')}>
            <Text style={styles.wellnessButtonText}>Update Mood</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.wellnessButton} onPress={() => router.push('/mood-history')}>
            <Text style={styles.wellnessButtonText}>View History</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Calorie Tracker */}
      <View style={styles.trackerCard}>
        <View style={styles.trackerHeader}>
          <Text style={styles.trackerTitle}>Calorie Tracker</Text>
          <View style={styles.calorieHeaderButtons}>
            <TouchableOpacity
              style={[styles.aiMealButton, !isPremium && styles.aiMealButtonLocked]}
              onPress={() => {
                if (isPremium) {
                  setShowAIMealModal(true);
                } else {
                  Alert.alert(
                    'Premium Feature',
                    'AI Meal Generation is a premium feature. Upgrade to Premium in settings to unlock this feature!',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Go to Settings', onPress: () => router.push('/settings') }
                    ]
                  );
                }
              }}
            >
              <Text style={[styles.aiMealButtonText, !isPremium && styles.aiMealButtonTextLocked]}>
                {isPremium ? '🤖 Generate AI Meal' : '🔒 AI Meal Generator'}
              </Text>
              {!isPremium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                </View>
              )}
            </TouchableOpacity>
            {/* 
              The following block conditionally renders a "PREMIUM" badge if the user is not a premium member.
              In React Native, curly braces `{}` are used to embed JavaScript expressions inside JSX.
              The `!isPremium && ...` syntax means "if not premium, then render the badge".
              If you remove the curly braces or the parentheses, the code will break or not render as expected.
            */}
            {/* 
              If you changed `!isPremium` to `isPremium`, the badge would show for premium users instead.
              If you removed the parentheses, React would not know where the conditional ends.
            */}
          </View>
        </View>
        <Text style={styles.trackerProgress}>{calories.consumed} / {calories.goal} cal</Text>
        <View style={styles.progressBar}>
          {/* 
            Here, we use an inline style to set the width of the progress bar fill.
            The width is calculated as a percentage: (consumed / goal) * 100.
            If you changed the division to addition, the bar would not represent progress correctly.
          */}
          <View style={[styles.progressFill, { width: `${(calories.consumed / calories.goal) * 100}%`, backgroundColor: '#ff4444' }]} />
        </View>
        <View style={styles.trackerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{calories.consumed}</Text>
            <Text style={styles.statLabel}>Consumed</Text>
          </View>
          <View style={styles.statItem}>
            {/* 
              Math.max(0, calories.goal - calories.consumed) ensures we never show a negative number.
              If you removed Math.max, you might see negative "remaining" calories.
            */}
            <Text style={styles.statValue}>{Math.max(0, calories.goal - calories.consumed)}</Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
        </View>
        <View style={styles.quickAddContainer}>
          <Text style={styles.quickAddLabel}>Quick Add:</Text>
          <View style={styles.quickAddButtons}>
            <TouchableOpacity style={styles.quickAddButton} onPress={() => handleQuickAddCalories(100)}>
              <Text style={styles.quickAddButtonText}>100 cal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAddButton} onPress={() => handleQuickAddCalories(200)}>
              <Text style={styles.quickAddButtonText}>200 cal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAddButton} onPress={() => handleQuickAddCalories('custom')}>
              <Text style={styles.quickAddButtonText}>Custom</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* AI Nutrition Tracker */}
      <CalorieTracker 
        ref={calorieTrackerRef}
        isPremium={isPremium}
        onMealConsumed={(caloriesToAdd) => {
          // Update the main calorie tracker when a meal is consumed
          addCalories(caloriesToAdd);
        }}
      />

      {/* Water Tracker */}
      <View style={styles.trackerCard}>
        <View style={styles.trackerHeader}>
          <Text style={styles.trackerTitle}>Water Tracker</Text>
        </View>
        <Text style={styles.trackerProgress}>{water.consumed}ml / {water.goal}L</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(water.consumed / (water.goal * 1000)) * 100}%`, backgroundColor: '#00aaff' }]} />
        </View>
        <View style={styles.trackerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{water.consumed}ml</Text>
            <Text style={styles.statLabel}>Consumed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.max(0, (water.goal * 1000) - water.consumed)}ml</Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
        </View>
        <View style={styles.quickAddContainer}>
          <Text style={styles.quickAddLabel}>Quick Add:</Text>
          <View style={styles.quickAddButtons}>
            <TouchableOpacity style={styles.quickAddButton} onPress={() => handleAddWater(250)}>
              <Text style={styles.quickAddButtonText}>250ml</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAddButton} onPress={() => handleAddWater(500)}>
              <Text style={styles.quickAddButtonText}>500ml</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAddButton} onPress={() => handleAddWater('custom')}>
              <Text style={styles.quickAddButtonText}>Custom</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Protein Tracker */}
      <View style={styles.trackerCard}>
        <View style={styles.trackerHeader}>
          <Text style={styles.trackerTitle}>Protein Tracker</Text>
          <TouchableOpacity
            style={styles.goalButton}
            onPress={() => {
              setShowGoalModal('protein');
              setGoalInput(protein.goal.toString());
            }}
          >
            <Ionicons name="settings-outline" size={20} color="#00ff00" />
          </TouchableOpacity>
        </View>
        <Text style={styles.trackerProgress}>{protein.consumed}g / {protein.goal}g</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(protein.consumed / protein.goal) * 100}%`, backgroundColor: '#00ff00' }]} />
        </View>
        <View style={styles.trackerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{protein.consumed}g</Text>
            <Text style={styles.statLabel}>Consumed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.max(0, protein.goal - protein.consumed)}g</Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
        </View>
        <View style={styles.quickAddContainer}>
          <Text style={styles.quickAddLabel}>Quick Add:</Text>
          <View style={styles.quickAddButtons}>
            <TouchableOpacity style={styles.quickAddButton} onPress={() => handleQuickAddProtein(20)}>
              <Text style={styles.quickAddButtonText}>20g</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAddButton} onPress={() => handleQuickAddProtein(30)}>
              <Text style={styles.quickAddButtonText}>30g</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAddButton} onPress={() => handleQuickAddProtein('custom')}>
              <Text style={styles.quickAddButtonText}>Custom</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Activity Details Modal */}
      <Modal
        visible={showActivityModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Daily Activity Details</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowActivityModal(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.activityDetailsContainer}>
              {/* Water Section */}
              <View style={styles.activitySection}>
                <View style={styles.activityHeader}>
                  <Ionicons name="water" size={24} color="#00ffff" />
                  <Text style={styles.activityTitle}>Water Intake</Text>
                </View>
                <View style={styles.activityStats}>
                  <View style={styles.activityStat}>
                    <Text style={styles.activityValue}>{water.consumed}ml</Text>
                    <Text style={styles.activityLabel}>Consumed</Text>
                  </View>
                  <View style={styles.activityStat}>
                    <Text style={styles.activityValue}>{Math.round((water.consumed / (water.goal * 1000)) * 100)}%</Text>
                    <Text style={styles.activityLabel}>Progress</Text>
                  </View>
                  <View style={styles.activityStat}>
                    <Text style={styles.activityValue}>{Math.max(0, (water.goal * 1000) - water.consumed)}ml</Text>
                    <Text style={styles.activityLabel}>Remaining</Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min((water.consumed / (water.goal * 1000)) * 100, 100)}%`, backgroundColor: '#00ffff' }]} />
                </View>
                <Text style={styles.activityGoal}>Goal: {water.goal}L</Text>
              </View>

              {/* Calories Section */}
              <View style={styles.activitySection}>
                <View style={styles.activityHeader}>
                  <Ionicons name="flame" size={24} color="#ff3131" />
                  <Text style={styles.activityTitle}>Calories</Text>
                </View>
                <View style={styles.activityStats}>
                  <View style={styles.activityStat}>
                    <Text style={styles.activityValue}>{calories.consumed}</Text>
                    <Text style={styles.activityLabel}>Consumed</Text>
                  </View>
                  <View style={styles.activityStat}>
                    <Text style={styles.activityValue}>{Math.round((calories.consumed / calories.goal) * 100)}%</Text>
                    <Text style={styles.activityLabel}>Progress</Text>
                  </View>
                  <View style={styles.activityStat}>
                    <Text style={styles.activityValue}>{Math.max(0, calories.goal - calories.consumed)}</Text>
                    <Text style={styles.activityLabel}>Remaining</Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min((calories.consumed / calories.goal) * 100, 100)}%`, backgroundColor: '#ff3131' }]} />
                </View>
                <Text style={styles.activityGoal}>Goal: {calories.goal} cal</Text>
              </View>

              {/* Protein Section */}
              <View style={styles.activitySection}>
                <View style={styles.activityHeader}>
                  <Ionicons name="fitness" size={24} color="#00ff00" />
                  <Text style={styles.activityTitle}>Protein</Text>
                </View>
                <View style={styles.activityStats}>
                  <View style={styles.activityStat}>
                    <Text style={styles.activityValue}>{protein.consumed}g</Text>
                    <Text style={styles.activityLabel}>Consumed</Text>
                  </View>
                  <View style={styles.activityStat}>
                    <Text style={styles.activityValue}>{Math.round((protein.consumed / protein.goal) * 100)}%</Text>
                    <Text style={styles.activityLabel}>Progress</Text>
                  </View>
                  <View style={styles.activityStat}>
                    <Text style={styles.activityValue}>{Math.max(0, protein.goal - protein.consumed)}g</Text>
                    <Text style={styles.activityLabel}>Remaining</Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min((protein.consumed / protein.goal) * 100, 100)}%`, backgroundColor: '#00ff00' }]} />
                </View>
                <Text style={styles.activityGoal}>Goal: {protein.goal}g</Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setShowActivityModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Goal Setting Modal */}
      <Modal
        visible={showGoalModal !== null}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Set Daily {showGoalModal === 'calories' ? 'Calorie' : showGoalModal === 'water' ? 'Water' : 'Protein'} Goal
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowGoalModal(null);
                  setGoalInput('');
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalInputContainer}>
              <TextInput
                style={styles.modalInput}
                value={goalInput}
                onChangeText={setGoalInput}
                placeholder={`Enter daily ${showGoalModal === 'calories' ? 'calorie' : showGoalModal === 'water' ? 'water' : 'protein'} goal`}
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
              <Text style={styles.modalInputLabel}>
                {showGoalModal === 'calories' ? 'calories' : showGoalModal === 'water' ? 'L' : 'g'}
              </Text>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowGoalModal(null);
                  setGoalInput('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.addButton]}
                onPress={handleUpdateGoal}
              >
                <Text style={styles.addButtonText}>Update Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calorie Input Modal */}
      <Modal
        visible={showCalorieModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Calories</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowCalorieModal(false);
                  setCalorieInput('');
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Picker
                selectedValue={parseInt(calorieInput) || 100}
                onValueChange={value => setCalorieInput(value.toString())}
                style={{ width: 200, color: '#fff', backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#222' }}
                itemStyle={{ color: '#fff', fontSize: 22 }}
              >
                {[...Array(191)].map((_, i) => {
                  const value = 100 + i * 10;
                  return <Picker.Item key={value} label={`${value} cal`} value={value} />;
                })}
              </Picker>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowCalorieModal(false);
                  setCalorieInput('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.addButton]}
                onPress={handleAddCalories}
              >
                <Text style={styles.addButtonText}>Add Calories</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Water Input Modal */}
      <Modal
        visible={showCustomWaterModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Water</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowCustomWaterModal(false);
                  setWaterInput('');
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Picker
                selectedValue={parseInt(waterInput) || 250}
                onValueChange={value => setWaterInput(value.toString())}
                style={{ width: 200, color: '#fff', backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#222' }}
                itemStyle={{ color: '#fff', fontSize: 22 }}
              >
                {[...Array(8)].map((_, i) => {
                  const value = 250 + i * 250;
                  return <Picker.Item key={value} label={`${value} ml`} value={value} />;
                })}
              </Picker>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowCustomWaterModal(false);
                  setWaterInput('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.addButton]}
                onPress={handleAddCustomWater}
              >
                <Text style={styles.addButtonText}>Add Water</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Protein Input Modal */}
      <Modal
        visible={showProteinModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Protein</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowProteinModal(false);
                  setProteinInput('');
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Picker
                selectedValue={parseInt(proteinInput) || 20}
                onValueChange={value => setProteinInput(value.toString())}
                style={{ width: 200, color: '#fff', backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#222' }}
                itemStyle={{ color: '#fff', fontSize: 22 }}
              >
                {[...Array(16)].map((_, i) => {
                  const value = 10 + i * 5;
                  return <Picker.Item key={value} label={`${value}g`} value={value} />;
                })}
              </Picker>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowProteinModal(false);
                  setProteinInput('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.addButton]}
                onPress={handleAddProtein}
              >
                <Text style={styles.addButtonText}>Add Protein</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Food Detection Modal */}
      <Modal
        visible={showFoodDetectionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFoodDetectionModal(false)}
        onShow={loadUsageStats}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Food Detection</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowFoodDetectionModal(false);
                  setSelectedImage(null);
                  setDetectedFood(null);
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Usage Stats */}
            {usageStats && (
              <View style={styles.usageStatsContainer}>
                <View style={styles.usageStat}>
                  <Text style={styles.usageLabel}>Daily Usage</Text>
                  <Text style={styles.usageValue}>
                    {usageStats.daily.used}/{usageStats.daily.limit}
                  </Text>
                  <Text style={styles.usageRemaining}>
                    {usageStats.daily.remaining} remaining
                  </Text>
                </View>
                <View style={styles.usageStat}>
                  <Text style={styles.usageLabel}>Hourly Usage</Text>
                  <Text style={styles.usageValue}>
                    {usageStats.hourly.used}/{usageStats.hourly.limit}
                  </Text>
                  <Text style={styles.usageRemaining}>
                    {usageStats.hourly.remaining} remaining
                  </Text>
                </View>
              </View>
            )}

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {!selectedImage ? (
                <View style={styles.foodDetectionContent}>
                  <View style={styles.foodDetectionIcon}>
                    <Ionicons name="camera" size={60} color="#ff4444" />
                  </View>
                  <Text style={styles.foodDetectionTitle}>Detect Food Calories</Text>
                  <Text style={styles.foodDetectionSubtitle}>
                    Take a photo or select an image of your food to automatically detect calories
                  </Text>
                  
                  <View style={styles.foodDetectionButtons}>
                    <TouchableOpacity 
                      style={[styles.foodDetectionButton, styles.cameraButton]}
                      onPress={takePhoto}
                    >
                      <Ionicons name="camera" size={24} color="#fff" />
                      <Text style={styles.foodDetectionButtonText}>Take Photo</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.foodDetectionButton, styles.galleryButton]}
                      onPress={pickImage}
                    >
                      <Ionicons name="images" size={24} color="#fff" />
                      <Text style={styles.foodDetectionButtonText}>Choose from Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.foodDetectionContent}>
                  <View style={styles.selectedImageContainer}>
                    <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                  </View>
                  
                  {!detectedFood && !isAnalyzing && (
                    <TouchableOpacity 
                      style={[styles.foodDetectionButton, styles.analyzeButton]}
                      onPress={analyzeFood}
                    >
                      <Ionicons name="search" size={24} color="#fff" />
                      <Text style={styles.foodDetectionButtonText}>Analyze Food</Text>
                    </TouchableOpacity>
                  )}
                  
                  {isAnalyzing && (
                    <View style={styles.analyzingContainer}>
                      <ActivityIndicator size="large" color="#ff4444" />
                      <Text style={styles.analyzingText}>Analyzing food...</Text>
                    </View>
                  )}
                  
                  {detectedFood && (
                    <View style={styles.detectedFoodContainer}>
                      <View style={styles.detectedFoodHeader}>
                        <Ionicons name="checkmark-circle" size={24} color="#00ff00" />
                        <Text style={styles.detectedFoodTitle}>Food Detected!</Text>
                      </View>
                      
                                             <View style={styles.detectedFoodInfo}>
                         <Text style={styles.detectedFoodName}>{detectedFood.name}</Text>
                         <Text style={styles.detectedFoodCalories}>{detectedFood.calories} calories</Text>
                         
                         <View style={styles.nutritionInfo}>
                           <View style={styles.nutritionItem}>
                             <Text style={styles.nutritionLabel}>Protein</Text>
                             <Text style={styles.nutritionValue}>{detectedFood.protein}g</Text>
                           </View>
                           <View style={styles.nutritionItem}>
                             <Text style={styles.nutritionLabel}>Carbs</Text>
                             <Text style={styles.nutritionValue}>{detectedFood.carbs}g</Text>
                           </View>
                           <View style={styles.nutritionItem}>
                             <Text style={styles.nutritionLabel}>Fat</Text>
                             <Text style={styles.nutritionValue}>{detectedFood.fat}g</Text>
                           </View>
                           <View style={styles.nutritionItem}>
                             <Text style={styles.nutritionLabel}>Fiber</Text>
                             <Text style={styles.nutritionValue}>{detectedFood.fiber}g</Text>
                           </View>
                         </View>
                         
                         <Text style={styles.detectedFoodConfidence}>
                           Confidence: {Math.round(detectedFood.confidence * 100)}%
                         </Text>
                       </View>
                      
                      <View style={styles.detectedFoodActions}>
                        <TouchableOpacity 
                          style={[styles.foodDetectionButton, styles.addCaloriesButton]}
                          onPress={addDetectedCalories}
                        >
                          <Ionicons name="add" size={24} color="#fff" />
                          <Text style={styles.foodDetectionButtonText}>Add to Tracker</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.foodDetectionButton, styles.retakeButton]}
                          onPress={() => {
                            setSelectedImage(null);
                            setDetectedFood(null);
                          }}
                        >
                          <Ionicons name="refresh" size={24} color="#fff" />
                          <Text style={styles.foodDetectionButtonText}>Try Again</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* AI Meal Generator Modal */}
      <Modal
        visible={showAIMealModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAIMealModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AIMealGenerator 
              isInModal={true}
              onMealGenerated={(meal) => {
                console.log('Meal generated:', meal);
                setShowAIMealModal(false);
                // Refresh the CalorieTracker to show the new meal
                if (calorieTrackerRef.current) {
                  calorieTrackerRef.current.refresh();
                }
              }}
              onClose={() => setShowAIMealModal(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Add a button in the HomeScreen component (only in __DEV__) to force daily reset */}
      {__DEV__ && (
        <TouchableOpacity
          style={{ backgroundColor: '#ff4444', padding: 12, borderRadius: 10, margin: 20, alignItems: 'center' }}
          onPress={async () => {
            console.log('Force Daily Reset button pressed');
            // Assuming forceDailyReset is imported or defined elsewhere
            // For now, commenting out as it's not directly available in this file
            // await forceDailyReset(userProfile, calories, water, setCalories, setWater, setStats);
            // Alert.alert('Daily Reset', 'Forced daily reset complete. Check logs for details.');
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Force Daily Reset</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  greeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: '#666',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
    marginLeft: 10,
  },


  activityDetailsContainer: {
    marginVertical: 20,
  },
  activitySection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  activityStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  activityStat: {
    alignItems: 'center',
    flex: 1,
  },
  activityValue: {
    color: '#00ffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  activityLabel: {
    color: '#aaa',
    fontSize: 12,
  },
  activityGoal: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  closeButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  closeButtonText: {
    color: '#00ffff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  trackerCard: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: 0,
    borderWidth: 1,
    borderColor: '#222',
  },
  trackerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiMealButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  aiMealButtonText: {
    color: '#00ffff',
    fontSize: 12,
    fontWeight: '600',
  },
  aiMealButtonLocked: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  aiMealButtonTextLocked: {
    color: '#ff4444',
  },
  premiumBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff6666',
  },
  premiumBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  trackerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  goalButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.3)',
  },
  calorieHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cameraButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  cameraButtonLocked: {
    backgroundColor: 'rgba(102, 102, 102, 0.1)',
    borderColor: 'rgba(102, 102, 102, 0.3)',
  },
  foodDetectionContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  foodDetectionIcon: {
    marginBottom: 20,
  },
  foodDetectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  foodDetectionSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  foodDetectionButtons: {
    width: '100%',
    gap: 15,
  },
  foodDetectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 120,
  },
  cameraButton: {
    backgroundColor: '#ff4444',
  },
  galleryButton: {
    backgroundColor: '#00aaff',
  },
  analyzeButton: {
    backgroundColor: '#00ff00',
  },
  addCaloriesButton: {
    backgroundColor: '#ff4444',
  },
  retakeButton: {
    backgroundColor: '#666',
  },
  foodDetectionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  selectedImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  analyzingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  analyzingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 15,
  },
  detectedFoodContainer: {
    width: '100%',
    padding: 20,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.3)',
  },
  detectedFoodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  detectedFoodTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00ff00',
    marginLeft: 10,
  },
  detectedFoodInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  detectedFoodName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  detectedFoodCalories: {
    fontSize: 20,
    color: '#ff4444',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  detectedFoodConfidence: {
    fontSize: 14,
    color: '#666',
  },
  nutritionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  detectedFoodActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  usageStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  usageStat: {
    alignItems: 'center',
    flex: 1,
  },
  usageLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  usageValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00ffff',
    marginBottom: 2,
  },
  usageRemaining: {
    fontSize: 10,
    color: '#888',
  },
  trackerProgress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00ffff',
    borderRadius: 3,
  },
  trackerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
  },
  addButton: {
    backgroundColor: '#00ffff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  quickAddContainer: {
    marginTop: 10,
  },
  quickAddLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  quickAddButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAddButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  quickAddButtonText: {
    color: '#00ffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  wellnessCard: {
    backgroundColor: 'rgba(255, 182, 193, 0.03)',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 182, 193, 0.1)',
  },
  wellnessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  wellnessText: {
    marginLeft: 15,
  },
  wellnessTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  wellnessSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  wellnessDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  wellnessButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  wellnessButton: {
    backgroundColor: '#222',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  wellnessButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalInput: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    paddingVertical: 15,
  },
  modalInputLabel: {
    color: '#666',
    fontSize: 18,
    marginLeft: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quoteCard: {
    backgroundColor: 'rgba(0, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: 0,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  quoteText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#666',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  aiTrainerBanner: {
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: 0,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  aiTrainerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiTrainerText: {
    flex: 1,
    marginRight: 15,
  },
  aiTrainerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00ffff',
    marginBottom: 5,
  },
  aiTrainerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  foodDetectionCard: {
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.1)',
  },
  foodDetectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  foodDetectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff4444',
    marginLeft: 10,
  },
  foodDetectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  foodDetectionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
});

export default HomeScreen; 