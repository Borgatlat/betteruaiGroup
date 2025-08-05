"use client";

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../context/UserContext';
import { generateWorkout } from '../../utils/aiUtils';
import { FloatingAITrainer } from '../../components/FloatingAITrainer';

const WorkoutScreen = () => {
  const router = useRouter();
  const [showLogs, setShowLogs] = useState(false);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [monthlyWorkouts, setMonthlyWorkouts] = useState(0);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [userWorkouts, setUserWorkouts] = useState([]);
  const { isPremium } = useUser();

  const fetchWorkoutLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }

      // Get current month's start and end dates
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const { data, error } = await supabase
        .from('user_workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', startOfMonth)
        .lte('completed_at', endOfMonth)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      console.log('Fetched workoutLogs:', data);
      setWorkoutLogs(data || []);
      setMonthlyWorkouts(data ? data.length : 0);
    } catch (error) {
      console.error('Error fetching workout logs:', error);
    }
  };

  const deleteAllWorkoutLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }

      const { error } = await supabase
        .from('user_workout_logs')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setWorkoutLogs([]);
      setShowDeleteConfirmation(false);
      Alert.alert('Success', 'All workout logs have been deleted');
    } catch (error) {
      console.error('Error deleting workout logs:', error);
      Alert.alert('Error', 'Failed to delete workout logs. Please try again.');
    }
  };

  const fetchUserWorkouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id')
        .eq('user_id', user.id)
        .single();
      console.log('Profile fetch result (workouts):', profile, profileError);
      let profileId;
      if (profile && profile.id) {
        profileId = profile.id;
      } else {
        console.log('No profile found for user', user.id, '- using user.id as profileId fallback');
        profileId = user.id;
      }
      console.log('Fetching user workouts for profileId:', profileId);
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      console.log('Fetched userWorkouts:', data);
      setUserWorkouts(data || []);
    } catch (error) {
      console.error('Error fetching user workouts:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWorkoutLogs();
      fetchUserWorkouts();
    }, [])
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderWorkoutLog = ({ item }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <Text style={styles.logTitle}>{item.workout_name}</Text>
        <Text style={styles.logDate}>{formatDate(item.completed_at)}</Text>
      </View>
      <View style={styles.logStats}>
        <View style={styles.logStat}>
          <Ionicons name="time-outline" size={20} color="#00ffff" />
          <Text style={styles.logStatValue}>{formatTime(parseInt(item.duration))}</Text>
        </View>
        <View style={styles.logStat}>
          <Ionicons name="barbell-outline" size={20} color="#00ffff" />
          <Text style={styles.logStatValue}>{item.exercise_count} exercises</Text>
        </View>
        <View style={styles.logStat}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#00ffff" />
          <Text style={styles.logStatValue}>{item.completed_sets} sets</Text>
        </View>
      </View>
      <View style={styles.logDetails}>
        <Text style={styles.logDetailTitle}>Exercises:</Text>
        {item.exercise_names && item.exercise_names.map((exercise, index) => (
          <Text key={index} style={styles.logDetailText}>• {exercise}</Text>
        ))}
        {item.total_weight > 0 && (
          <Text style={styles.logDetailText}>Total Weight: {item.total_weight} lbs</Text>
        )}
      </View>
    </View>
  );

  const handleDeleteWorkout = async (workoutId) => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
              if (error) throw error;
              setUserWorkouts(userWorkouts.filter(w => w.id !== workoutId));
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete workout.');
            }
          }
        }
      ]
    );
  };

  const startWorkout = (workout) => {
    router.push({
      pathname: '/active-workout',
      params: {
        custom: 'true',
        workout: JSON.stringify(workout)
      }
    });
  };

  const handleGenerateWorkout = async () => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'Upgrade to Premium to generate custom workouts!',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Show prompt input
      Alert.prompt(
        'Customize Your Workout',
        'Enter a brief description of the workout you want (max 100 characters):',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Generate',
            onPress: async (prompt) => {
              if (!prompt) {
                Alert.alert('Error', 'Please enter a description for your workout');
                return;
              }

              if (prompt.length > 100) {
                Alert.alert('Error', 'Description must be less than 100 characters');
                return;
              }

              // Show loading state
              Alert.alert(
                'Generating Workout',
                'Please wait while we create your personalized workout...',
                [{ text: 'OK' }]
              );

              // Get user profile data
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                Alert.alert('Error', 'Please log in to generate workouts');
                return;
              }

              // Get profile data
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

              if (profileError || !profile) {
                console.error('Error getting profile:', profileError);
                Alert.alert('Error', 'Failed to get user profile');
                return;
              }

              // Generate the workout
              const result = await generateWorkout({
                training_level: profile?.training_level || 'beginner',
                fitness_goal: profile?.fitness_goal || 'general fitness',
                age: profile?.age,
                weight: profile?.weight,
                height: profile?.height,
                gender: profile?.gender,
                bio: profile?.bio || '',
                custom_prompt: prompt
              });

              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to generate workout');
                return;
              }

              // Save the generated workout
              const { error: saveError } = await supabase
                .from('workouts')
                .insert({
                  profile_id: user.id,
                  workout_name: result.workout.name,
                  exercises: result.workout.exercises,
                  created_at: new Date().toISOString()
                });

              if (saveError) {
                console.error('Error saving workout:', saveError);
                Alert.alert('Error', 'Failed to save workout');
                return;
              }

              // Refresh the workouts list
              fetchUserWorkouts();

              Alert.alert(
                'Success',
                'Your personalized workout has been generated!',
                [{ text: 'OK' }]
              );
            }
          }
        ],
        'plain-text'
      );
    } catch (error) {
      console.error('Error generating workout:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const premiumWorkouts = [
    {
      name: 'Athlete Power Circuit',
      description: 'Explosive full-body circuit for athletes',
      repRange: '8-10 reps',
      duration: '50 min',
      intensity: 'Elite',
      exercises: [
        'Power Cleans',
        'Push Press',
        'Box Jumps',
        'Chin-Ups',
        "Farmer's Walk"
      ],
      howTo: 'Focus on explosive movements and maintain proper form throughout the circuit.'
    },
    {
      name: 'Glute & Core Sculpt',
      description: 'Targeted glute and core workout for strength and shape',
      repRange: '12-15 reps',
      duration: '40 min',
      intensity: 'High',
      exercises: [
        'Hip Thrusts',
        'Cable Kickbacks',
        'Plank Variations',
        'Bulgarian Split Squats',
        'Hanging Leg Raises'
      ],
      howTo: 'Engage your core and glutes with each movement for maximum effectiveness.'
    },
    {
      name: 'Ultimate Conditioning',
      description: 'High-intensity conditioning for max calorie burn',
      repRange: '30s work',
      duration: '35 min',
      intensity: 'Extreme',
      exercises: [
        'Battle Ropes',
        'Sled Push',
        'Burpee Pull-Ups',
        'Rowing Sprints',
        'Medicine Ball Slams'
      ],
      howTo: 'Push yourself to the limit with short, intense bursts of activity.'
    },
    {
      name: 'Push-Pull-Legs Pro',
      description: 'Advanced PPL split for muscle growth',
      repRange: '8-12 reps',
      duration: '60 min',
      intensity: 'Pro',
      exercises: [
        'Incline Barbell Press',
        'Pendlay Rows',
        'Walking Lunges',
        'Arnold Press',
        'Nordic Hamstring Curls'
      ],
      howTo: 'Focus on compound movements to maximize muscle engagement and growth.'
    },
    {
      name: 'Elite Strength Builder',
      description: 'Build raw strength with heavy compound lifts',
      repRange: '5-8 reps',
      duration: '70 min',
      intensity: 'Elite',
      exercises: [
        'Deadlift',
        'Squat',
        'Bench Press',
        'Overhead Press',
        'Barbell Row'
      ],
      howTo: 'Use heavy weights and focus on form to build maximum strength.'
    },
    {
      name: 'High-Intensity Interval Training',
      description: 'Burn fat and improve cardiovascular health',
      repRange: '20s work, 10s rest',
      duration: '30 min',
      intensity: 'High',
      exercises: [
        'Mountain Climbers',
        'Jump Squats',
        'High Knees',
        'Burpees',
        'Plank Jacks'
      ],
      howTo: 'Alternate between high-intensity exercises and short rest periods for maximum calorie burn.'
    },
    {
      name: 'Flexibility and Mobility',
      description: 'Improve flexibility and joint mobility',
      repRange: '30-60s holds',
      duration: '45 min',
      intensity: 'Low',
      exercises: [
        'Dynamic Stretching',
        'Foam Rolling',
        'Yoga Poses',
        'Joint Mobility',
        'Static Stretching'
      ],
      howTo: 'Focus on deep breathing and gradual stretching to improve flexibility.'
    },
    {
      name: 'Core Crusher',
      description: 'Strengthen your core with targeted exercises',
      repRange: '15-20 reps',
      duration: '40 min',
      intensity: 'Medium',
      exercises: [
        'Plank Variations',
        'Russian Twists',
        'Leg Raises',
        'Cable Crunches',
        'Bicycle Crunches'
      ],
      howTo: 'Engage your core throughout each exercise for maximum effectiveness.'
    },
    {
      name: 'Upper Body Power',
      description: 'Build upper body strength and power',
      repRange: '6-10 reps',
      duration: '55 min',
      intensity: 'High',
      exercises: [
        'Pull-Ups',
        'Dips',
        'Push-Ups',
        'Dumbbell Press',
        'Tricep Extensions'
      ],
      howTo: 'Focus on explosive movements and proper form to build upper body power.'
    },
    {
      name: 'Lower Body Strength',
      description: 'Strengthen your lower body with heavy lifts',
      repRange: '8-12 reps',
      duration: '60 min',
      intensity: 'High',
      exercises: [
        'Squats',
        'Lunges',
        'Leg Press',
        'Calf Raises',
        'Romanian Deadlifts'
      ],
      howTo: 'Use heavy weights and focus on form to build lower body strength.'
    }
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.sectionHeader}>
          <Text style={styles.title}>Workouts</Text>
            <TouchableOpacity 
              style={styles.createWorkoutButton}
              onPress={() => setShowLogs(true)}
            >
              <Ionicons name="time-outline" size={20} color="#00ffff" style={{marginRight: 6}} />
              <Text style={styles.createWorkoutButtonText}>View Logs</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{marginHorizontal: 20, marginTop: 10, marginBottom: 0}}>
          <TouchableOpacity 
            style={styles.trainingPlansButton}
            onPress={() => router.push('/(tabs)/pr')}
          >
            <Ionicons name="trophy-outline" size={20} color="#00ffff" style={{marginRight: 6}} />
            <Text style={styles.trainingPlansButtonText}>View Personal Records</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <View style={{ position: 'relative' }}>
            <TouchableOpacity 
              style={[styles.actionButton, !isPremium && styles.disabledButton]}
              onPress={() => {
                if (!isPremium) {
                  Alert.alert(
                    'Premium Feature',
                    'Upgrade to Premium to create custom workouts!',
                    [{ text: 'OK' }]
                  );
                  return;
                }
                router.push('/create-workout');
              }}
              disabled={!isPremium}
            >
              <Ionicons name="add-circle-outline" size={24} color="#00ffff" />
              <Text style={styles.actionButtonText}>Create Workout</Text>
            </TouchableOpacity>
            {!isPremium && (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={28} color="#fff" style={{ opacity: 0.85 }} />
              </View>
            )}
          </View>
          <View style={{ position: 'relative' }}>
            <TouchableOpacity 
              style={[styles.actionButton, !isPremium && styles.disabledButton]}
              onPress={handleGenerateWorkout}
              disabled={!isPremium}
            >
              <Ionicons name="sparkles-outline" size={24} color="#00ffff" />
              <Text style={styles.actionButtonText}>Generate Workout</Text>
            </TouchableOpacity>
            {!isPremium && (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={28} color="#fff" style={{ opacity: 0.85 }} />
              </View>
            )}
          </View>
        </View>

        {/* User's Custom Workouts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Workouts</Text>
          </View>
          {userWorkouts.length === 0 ? (
            <Text style={styles.emptyText}>No custom workouts yet.</Text>
          ) : (
            userWorkouts.map((workout) => (
              <View key={workout.id} style={styles.workoutCard}>
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutTitle}>{workout.workout_name || workout.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.repRangeText}>{Array.isArray(workout.exercises) ? workout.exercises.length : 0} exercises</Text> 
                    <TouchableOpacity onPress={() => handleDeleteWorkout(workout.id)}>
                      <Ionicons name="trash-outline" size={20} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.workoutDescription}>Custom workout</Text>
                <View style={styles.exercises}>
                  <Text style={styles.exercisesTitle}>Exercises:</Text>
                  {Array.isArray(workout.exercises) && workout.exercises.map((ex, idx) => {
                    if (typeof ex === 'string') {
                      return <Text key={idx} style={styles.exercisesList}>• {ex}</Text>;
                    } else if (typeof ex === 'object' && ex !== null) {
                      return <Text key={idx} style={styles.exercisesList}>• {ex.name} ({ex.sets || 3} x {ex.reps || 10})</Text>;
                    } else {
                      return null;
                    }
                  })}
                </View>
                <TouchableOpacity 
                  style={styles.startButton}
                  onPress={() => startWorkout({
                    ...workout,
                    name: workout.workout_name || workout.name,
                  })}
                >
                  <Text style={styles.startButtonText}>Start Workout</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Workout Types */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Workout Types</Text>
            <TouchableOpacity 
              style={styles.createWorkoutButton}
              onPress={() => router.push('/training-plans')}
            >
              <Text style={styles.createWorkoutButtonText}>Training Plans</Text>
            </TouchableOpacity>
          </View>
          
          {/* Full Body Workout */}
          <TouchableOpacity 
            style={styles.workoutCard}
            onPress={() => router.push('/active-workout')}
          >
            <View>
              <View style={styles.workoutHeader}>
                <Text style={styles.workoutTitle}>Full Body Workout</Text>
                <View style={styles.repRange}>
                  <Text style={styles.repRangeText}>8-12 reps</Text>
                </View>
              </View>
              <Text style={styles.workoutDescription}>
                Complete full body workout targeting all major muscle groups
              </Text>
              <View style={styles.workoutMeta}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.metaText}>60 min</Text>
                <Ionicons name="flame-outline" size={20} color="#666" />
                <Text style={styles.metaText}>High Intensity</Text>
              </View>
              <View style={styles.exercises}>
                <Text style={styles.exercisesTitle}>Exercises:</Text>
                <Text style={styles.exercisesList}>• Squats</Text>
                <Text style={styles.exercisesList}>• Bench Press</Text>
                <Text style={styles.exercisesList}>• Deadlifts</Text>
                <Text style={styles.exercisesList}>• Pull-ups</Text>
                <Text style={styles.exercisesList}>• Shoulder Press</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.startButton}
              onPress={() => router.push({
                pathname: '/active-workout',
                params: { type: 'Full Body Workout' }
              })}
            >
              <Text style={styles.startButtonText}>Start Workout</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Upper Body Power */}
          <TouchableOpacity 
            style={styles.workoutCard}
            onPress={() => router.push('/active-workout')}
          >
            <View>
              <View style={styles.workoutHeader}>
                <Text style={styles.workoutTitle}>Upper Body Power</Text>
                <View style={styles.repRange}>
                  <Text style={styles.repRangeText}>4-6 reps</Text>
                </View>
              </View>
              <Text style={styles.workoutDescription}>
                Heavy upper body focused workout for strength gains
              </Text>
              <View style={styles.workoutMeta}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.metaText}>45 min</Text>
                <Ionicons name="flame-outline" size={20} color="#666" />
                <Text style={styles.metaText}>High Intensity</Text>
              </View>
              <View style={styles.exercises}>
                <Text style={styles.exercisesTitle}>Exercises:</Text>
                <Text style={styles.exercisesList}>• Bench Press</Text>
                <Text style={styles.exercisesList}>• Weighted Pull-ups</Text>
                <Text style={styles.exercisesList}>• Military Press</Text>
                <Text style={styles.exercisesList}>• Barbell Rows</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.startButton}
              onPress={() => router.push({
                pathname: '/active-workout',
                params: { type: 'Upper Body Power' }
              })}
            >
              <Text style={styles.startButtonText}>Start Workout</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Lower Body Power */}
          <TouchableOpacity 
            style={styles.workoutCard}
            onPress={() => router.push('/active-workout')}
          >
            <View>
              <View style={styles.workoutHeader}>
                <Text style={styles.workoutTitle}>Lower Body Power</Text>
                <View style={styles.repRange}>
                  <Text style={styles.repRangeText}>4-6 reps</Text>
                </View>
              </View>
              <Text style={styles.workoutDescription}>
                Heavy lower body focused workout for strength gains
              </Text>
              <View style={styles.workoutMeta}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.metaText}>45 min</Text>
                <Ionicons name="flame-outline" size={20} color="#666" />
                <Text style={styles.metaText}>High Intensity</Text>
              </View>
              <View style={styles.exercises}>
                <Text style={styles.exercisesTitle}>Exercises:</Text>
                <Text style={styles.exercisesList}>• Back Squats</Text>
                <Text style={styles.exercisesList}>• Romanian Deadlifts</Text>
                <Text style={styles.exercisesList}>• Front Squats</Text>
                <Text style={styles.exercisesList}>• Leg Press</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.startButton}
              onPress={() => router.push({
                pathname: '/active-workout',
                params: { type: 'Lower Body Power' }
              })}
            >
              <Text style={styles.startButtonText}>Start Workout</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* HIIT Cardio */}
          <TouchableOpacity 
            style={styles.workoutCard}
            onPress={() => router.push('/active-workout')}
          >
            <View>
              <View style={styles.workoutHeader}>
                <Text style={styles.workoutTitle}>HIIT Cardio</Text>
                <View style={styles.repRange}>
                  <Text style={styles.repRangeText}>30s work/30s rest</Text>
                </View>
              </View>
              <Text style={styles.workoutDescription}>
                High-intensity interval training for maximum calorie burn
              </Text>
              <View style={styles.workoutMeta}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.metaText}>30 min</Text>
                <Ionicons name="flame-outline" size={20} color="#666" />
                <Text style={styles.metaText}>Very High Intensity</Text>
              </View>
              <View style={styles.exercises}>
                <Text style={styles.exercisesTitle}>Exercises:</Text>
                <Text style={styles.exercisesList}>• Burpees</Text>
                <Text style={styles.exercisesList}>• Mountain Climbers</Text>
                <Text style={styles.exercisesList}>• Jump Squats</Text>
                <Text style={styles.exercisesList}>• High Knees</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.startButton}
              onPress={() => router.push({
                pathname: '/active-workout',
                params: { type: 'HIIT Cardio' }
              })}
            >
              <Text style={styles.startButtonText}>Start Workout</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Core & Abs */}
          <TouchableOpacity 
            style={styles.workoutCard}
            onPress={() => router.push('/active-workout')}
          >
            <View>
              <View style={styles.workoutHeader}>
                <Text style={styles.workoutTitle}>Core & Abs</Text>
                <View style={styles.repRange}>
                  <Text style={styles.repRangeText}>15-20 reps</Text>
                </View>
              </View>
              <Text style={styles.workoutDescription}>
                Focused core workout for strength and definition
              </Text>
              <View style={styles.workoutMeta}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.metaText}>30 min</Text>
                <Ionicons name="flame-outline" size={20} color="#666" />
                <Text style={styles.metaText}>Medium Intensity</Text>
              </View>
              <View style={styles.exercises}>
                <Text style={styles.exercisesTitle}>Exercises:</Text>
                <Text style={styles.exercisesList}>• Planks</Text>
                <Text style={styles.exercisesList}>• Russian Twists</Text>
                <Text style={styles.exercisesList}>• Leg Raises</Text>
                <Text style={styles.exercisesList}>• Cable Crunches</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.startButton}
              onPress={() => router.push({
                pathname: '/active-workout',
                params: { type: 'Core & Abs' }
              })}
            >
              <Text style={styles.startButtonText}>Start Workout</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Mobility & Recovery */}
          <TouchableOpacity 
            style={styles.workoutCard}
            onPress={() => router.push('/active-workout')}
          >
            <View>
              <View style={styles.workoutHeader}>
                <Text style={styles.workoutTitle}>Mobility & Recovery</Text>
                <View style={styles.repRange}>
                  <Text style={styles.repRangeText}>30-60s holds</Text>
                </View>
              </View>
              <Text style={styles.workoutDescription}>
                Stretching and mobility work for better flexibility and recovery
              </Text>
              <View style={styles.workoutMeta}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.metaText}>40 min</Text>
                <Ionicons name="flame-outline" size={20} color="#666" />
                <Text style={styles.metaText}>Low Intensity</Text>
              </View>
              <View style={styles.exercises}>
                <Text style={styles.exercisesTitle}>Exercises:</Text>
                <Text style={styles.exercisesList}>• Dynamic Stretching</Text>
                <Text style={styles.exercisesList}>• Foam Rolling</Text>
                <Text style={styles.exercisesList}>• Yoga Poses</Text>
                <Text style={styles.exercisesList}>• Joint Mobility</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.startButton}
              onPress={() => router.push({
                pathname: '/active-workout',
                params: { type: 'Mobility & Recovery' }
              })}
            >
              <Text style={styles.startButtonText}>Start Workout</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Premium Workouts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Workouts</Text>
          {isPremium ? (
            <>
              <Text style={{ color: '#00ffff', fontWeight: 'bold', marginBottom: 8, fontSize: 16 }}>Premium</Text>
              {premiumWorkouts.map((workout, idx) => (
                <TouchableOpacity
                  key={workout.name}
                  style={styles.workoutCard}
                  onPress={() => startWorkout(workout)}
                >
                  <View>
                    <View style={styles.workoutHeader}>
                      <Text style={styles.workoutTitle}>{workout.name}</Text>
                      <View style={styles.repRange}>
                        <Text style={styles.repRangeText}>{workout.repRange}</Text>
                      </View>
                    </View>
                    <Text style={styles.workoutDescription}>{workout.description}</Text>
                    <View style={styles.workoutMeta}>
                      <Ionicons name="time-outline" size={20} color="#666" />
                      <Text style={styles.metaText}>{workout.duration}</Text>
                      <Ionicons name="flame-outline" size={20} color="#666" />
                      <Text style={styles.metaText}>{workout.intensity}</Text>
                    </View>
                    <View style={styles.exercises}>
                      <Text style={styles.exercisesTitle}>Exercises:</Text>
                      {workout.exercises.map((ex, i) => (
                        <Text key={i} style={styles.exercisesList}>• {ex}</Text>
                      ))}
                    </View>
                    {workout.howTo && (
                      <View style={styles.howToSection}>
                        <Text style={styles.howToTitle}>How to:</Text>
                        <Text style={styles.howToText}>{workout.howTo}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity style={styles.startButton} onPress={() => startWorkout(workout)}>
                    <Text style={styles.startButtonText}>Start Workout</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              {premiumWorkouts.map((workout, idx) => (
                <View key={workout.name} style={[styles.workoutCard, { opacity: 0.6 }]}> 
                  <View style={styles.workoutHeader}>
                    <Text style={styles.workoutTitle}>{workout.name}</Text>
                    <Ionicons name="lock-closed" size={22} color="#ff4444" style={{ marginLeft: 8 }} />
                  </View>
                  <Text style={styles.workoutDescription}>{workout.description}</Text>
                  <View style={styles.workoutMeta}>
                    <Ionicons name="time-outline" size={20} color="#666" />
                    <Text style={styles.metaText}>{workout.duration}</Text>
                    <Ionicons name="flame-outline" size={20} color="#666" />
                    <Text style={styles.metaText}>{workout.intensity}</Text>
                  </View>
                  <View style={styles.exercises}>
                    <Text style={styles.exercisesTitle}>Exercises:</Text>
                    {workout.exercises.map((ex, i) => (
                      <Text key={i} style={styles.exercisesList}>• {ex}</Text>
                    ))}
                  </View>
                  {workout.howTo && (
                    <View style={styles.howToSection}>
                      <Text style={styles.howToTitle}>How to:</Text>
                      <Text style={styles.howToText}>{workout.howTo}</Text>
                    </View>
                  )}
                  <View style={{ alignItems: 'center', marginTop: 10 }}>
                    <Text style={{ color: '#ff4444', fontWeight: 'bold', fontSize: 14 }}>Upgrade to Premium to start these workouts</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Workout Logs Modal */}
        <Modal
          visible={showLogs}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Workout History</Text>
                  <Text style={styles.modalSubtitle}>{monthlyWorkouts} workouts this month</Text>
                </View>
                <View style={styles.modalHeaderButtons}>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => setShowDeleteConfirmation(true)}
                  >
                    <Ionicons name="trash-outline" size={24} color="#ff4444" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setShowLogs(false)}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <FlatList
                data={workoutLogs}
                renderItem={renderWorkoutLog}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.logsList}
                ListEmptyComponent={() => (
                  <Text style={styles.emptyText}>No workout history yet</Text>
                )}
                onRefresh={fetchWorkoutLogs}
                refreshing={false}
              />
            </View>
          </View>

          {/* Delete Confirmation Modal */}
          <Modal
            visible={showDeleteConfirmation}
            transparent={true}
            animationType="fade"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.confirmationModal}>
                <Text style={styles.confirmationTitle}>Delete All Workout Logs?</Text>
                <Text style={styles.confirmationText}>This action cannot be undone. All your workout history will be permanently deleted.</Text>
                <View style={styles.confirmationButtons}>
                  <TouchableOpacity 
                    style={[styles.confirmationButton, styles.cancelButton]}
                    onPress={() => setShowDeleteConfirmation(false)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.confirmationButton, styles.deleteButton]}
                    onPress={deleteAllWorkoutLogs}
                  >
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </Modal>
      </ScrollView>
      <FloatingAITrainer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  trainingPlansButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#00ffff',
  },
  trainingPlansButtonText: {
    color: '#00ffff',
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    padding: 20,
    paddingBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  workoutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 25,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  repRange: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  repRangeText: {
    color: '#00ffff',
    fontSize: 10,
    fontWeight: '600',
    marginRight: 10, 
  },
  workoutDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 15,
  },
  metaText: {
    color: '#666',
    fontSize: 14,
    marginRight: 15,
  },
  exercises: {
    marginBottom: 15,
  },
  exercisesTitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
  },
  exercisesList: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  startButton: {
    backgroundColor: '#00ffff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContent: {
    flex: 1,
    marginTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  modalHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: 'transparent',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'transparent',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logsList: {
    padding: 20,
  },
  logCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  logDate: {
    fontSize: 14,
    color: '#666',
  },
  logStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  logStatValue: {
    color: '#00ffff',
    fontSize: 14,
  },
  logDetails: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  logDetailTitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
  },
  logDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
    marginBottom: 2,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  confirmationText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confirmationButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  createWorkoutButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#00ffff',
  },
  createWorkoutButtonText: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    gap: 15,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#00ffff',
  },
  actionButtonText: {
    color: '#00ffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  howToSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderRadius: 10,
  },
  howToTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00ffff',
    marginBottom: 5,
  },
  howToText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default WorkoutScreen; 