import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useTracking } from '../../context/TrackingContext';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { AppState } from 'react-native';
import { useSettings } from '../../context/SettingsContext';
import { FloatingAITrainer } from '../../components/FloatingAITrainer';

const workoutData = {
  'Full Body Workout': {
    name: 'Full Body Workout',
    exercises: [
      {
        name: 'Squats',
        targetMuscles: 'Quads, Glutes, Core',
        instructions: [
          'Stand with feet shoulder-width apart, toes slightly turned out',
          'Keep chest up and core tight as you lower down',
          'Push through heels to return to starting position',
          'Keep knees in line with toes throughout movement'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Bench Press',
        targetMuscles: 'Chest, Shoulders, Triceps',
        instructions: [
          'Lie flat on bench with feet planted on ground',
          'Grip bar slightly wider than shoulder width',
          'Lower bar to mid-chest with control',
          'Press bar up to starting position'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Deadlifts',
        targetMuscles: 'Back, Hamstrings, Core',
        instructions: [
          'Stand with feet hip-width apart, bar over mid-foot',
          'Bend at hips and knees to grip bar',
          'Keep back straight as you lift bar by extending hips',
          'Lower bar with control, maintaining form'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Pull-ups',
        targetMuscles: 'Back, Biceps',
        instructions: [
          'Grip bar slightly wider than shoulder width',
          'Hang with arms fully extended',
          'Pull body up until chin clears bar',
          'Lower with control to starting position'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Shoulder Press',
        targetMuscles: 'Shoulders, Triceps',
        instructions: [
          'Hold weights at shoulder height',
          'Press weights overhead until arms are straight',
          'Lower weights with control to starting position',
          'Keep core tight throughout movement'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
    ],
  },
  'Push Day': {
    name: 'Push Day',
    exercises: [
      {
        name: 'Bench Press',
        targetMuscles: 'Chest, Shoulders, Triceps',
        instructions: [
          'Lie flat on bench with feet planted on ground',
          'Grip bar slightly wider than shoulder width',
          'Lower bar to mid-chest with control',
          'Press bar up to starting position'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Overhead Press',
        targetMuscles: 'Shoulders, Triceps',
        instructions: [
          'Hold weights at shoulder height',
          'Press weights overhead until arms are straight',
          'Lower weights with control to starting position',
          'Keep core tight throughout movement'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Incline Dumbbell Press',
        targetMuscles: 'Upper Chest, Shoulders',
        instructions: [
          'Set bench to 30-45 degree angle',
          'Hold dumbbells at shoulder level',
          'Press dumbbells up and together',
          'Lower with control to starting position'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Lateral Raises',
        targetMuscles: 'Shoulders',
        instructions: [
          'Stand with dumbbells at sides',
          'Raise arms to shoulder height',
          'Keep slight bend in elbows',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
        ],
      },
      {
        name: 'Tricep Pushdowns',
        targetMuscles: 'Triceps',
        instructions: [
          'Stand facing cable machine',
          'Keep elbows at sides',
          'Push bar down until arms are straight',
          'Return to starting position with control'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
        ],
      },
    ],
  },
  'Pull Day': {
    name: 'Pull Day',
    exercises: [
      {
        name: 'Deadlifts',
        targetMuscles: 'Back, Hamstrings, Core',
        instructions: [
          'Stand with feet hip-width apart, bar over mid-foot',
          'Bend at hips and knees to grip bar',
          'Keep back straight as you lift bar by extending hips',
          'Lower bar with control, maintaining form'
        ],
        sets: [
          { weight: '', reps: '6-8', completed: false },
          { weight: '', reps: '6-8', completed: false },
          { weight: '', reps: '6-8', completed: false },
        ],
      },
      {
        name: 'Pull-ups',
        targetMuscles: 'Back, Biceps',
        instructions: [
          'Grip bar slightly wider than shoulder width',
          'Hang with arms fully extended',
          'Pull body up until chin clears bar',
          'Lower with control to starting position'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Barbell Rows',
        targetMuscles: 'Back, Lats, Rear Delts, Biceps',
        instructions: [
          'Stand with feet hip-width apart, grip barbell with overhand grip',
          'Hinge at hips, keep back straight and chest up',
          'Pull barbell to lower chest, squeezing shoulder blades',
          'Lower bar with control, keeping core tight',
          'Repeat for reps'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Face Pulls',
        targetMuscles: 'Rear Delts, Upper Back',
        instructions: [
          'Set cable at face height',
          'Pull rope towards face',
          'Squeeze shoulder blades together',
          'Return with control'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
        ],
      },
      {
        name: 'Bicep Curls',
        targetMuscles: 'Biceps',
        instructions: [
          'Stand with dumbbells at sides',
          'Curl weights up to shoulders',
          'Keep elbows at sides',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
        ],
      },
    ],
  },
  'Leg Day': {
    name: 'Leg Day',
    exercises: [
      {
        name: 'Squats',
        targetMuscles: 'Quads, Glutes, Core',
        instructions: [
          'Stand with feet shoulder-width apart, toes slightly turned out',
          'Keep chest up and core tight as you lower down',
          'Push through heels to return to starting position',
          'Keep knees in line with toes throughout movement'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Romanian Deadlifts',
        targetMuscles: 'Hamstrings, Glutes',
        instructions: [
          'Stand with feet hip-width apart',
          'Hinge at hips, keeping back straight',
          'Lower bar along legs',
          'Return to standing by extending hips'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Leg Press',
        targetMuscles: 'Quads, Hamstrings, Glutes',
        instructions: [
          'Place feet shoulder-width apart on platform',
          'Lower weight with control',
          'Push through heels to extend legs',
          'Keep back flat against pad'
        ],
        sets: [
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
        ],
      },
      {
        name: 'Leg Curls',
        targetMuscles: 'Hamstrings',
        instructions: [
          'Lie face down on machine',
          'Curl legs up to glutes',
          'Squeeze hamstrings at top',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
        ],
      },
      {
        name: 'Calf Raises',
        targetMuscles: 'Calves',
        instructions: [
          'Stand on edge of step or platform',
          'Raise heels as high as possible',
          'Lower heels below step level',
          'Repeat with control'
        ],
        sets: [
          { weight: '', reps: '15-20', completed: false },
          { weight: '', reps: '15-20', completed: false },
          { weight: '', reps: '15-20', completed: false },
        ],
      },
    ],
  },
  'Upper Body 1': {
    name: 'Upper Body 1',
    exercises: [
      {
        name: 'Bench Press',
        targetMuscles: 'Chest, Shoulders, Triceps',
        instructions: [
          'Lie flat on bench with feet planted on ground',
          'Grip bar slightly wider than shoulder width',
          'Lower bar to mid-chest with control',
          'Press bar up to starting position'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Military Press',
        targetMuscles: 'Shoulders, Triceps',
        instructions: [
          'Stand with feet shoulder-width apart',
          'Hold barbell at shoulder height',
          'Press bar overhead until arms are straight',
          'Lower with control to starting position'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Incline Dumbbell Press',
        targetMuscles: 'Upper Chest, Shoulders',
        instructions: [
          'Set bench to 30-45 degree angle',
          'Hold dumbbells at shoulder level',
          'Press dumbbells up and together',
          'Lower with control to starting position'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Lateral Raises',
        targetMuscles: 'Shoulders',
        instructions: [
          'Stand with dumbbells at sides',
          'Raise arms to shoulder height',
          'Keep slight bend in elbows',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
        ],
      },
      {
        name: 'Tricep Pushdowns',
        targetMuscles: 'Triceps',
        instructions: [
          'Stand facing cable machine',
          'Keep elbows at sides',
          'Push bar down until arms are straight',
          'Return to starting position with control'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
        ],
      },
    ],
  },
  'Lower Body 1': {
    name: 'Lower Body 1',
    exercises: [
      {
        name: 'Back Squats',
        targetMuscles: 'Quads, Glutes, Core',
        instructions: [
          'Stand with feet shoulder-width apart',
          'Bar across upper back',
          'Keep chest up as you squat down',
          'Drive through heels to stand'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Leg Press',
        targetMuscles: 'Quads, Hamstrings, Glutes',
        instructions: [
          'Place feet shoulder-width on platform',
          'Lower weight with control',
          'Push through heels to extend legs',
          'Keep back flat against pad'
        ],
        sets: [
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
        ],
      },
      {
        name: 'Bulgarian Split Squats',
        targetMuscles: 'Quads, Glutes, Balance',
        instructions: [
          'Back foot elevated on bench',
          'Front foot forward',
          'Lower until back knee nearly touches ground',
          'Push through front heel to stand'
        ],
        sets: [
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
        ],
      },
      {
        name: 'Leg Extensions',
        targetMuscles: 'Quads',
        instructions: [
          'Sit in machine with back against pad',
          'Hook feet under pad',
          'Extend legs fully',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
        ],
      },
      {
        name: 'Calf Raises',
        targetMuscles: 'Calves',
        instructions: [
          'Stand on edge of step',
          'Lower heels below platform',
          'Rise up onto toes',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '15-20', completed: false },
          { weight: '', reps: '15-20', completed: false },
          { weight: '', reps: '15-20', completed: false },
        ],
      },
    ],
  },
  'Upper Body 2': {
    name: 'Upper Body 2',
    exercises: [
      {
        name: 'Deadlifts',
        targetMuscles: 'Back, Hamstrings, Core',
        instructions: [
          'Stand with feet hip-width apart',
          'Bend at hips and knees to grip bar',
          'Keep back straight as you lift',
          'Lower bar with control'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Pull-ups',
        targetMuscles: 'Back, Biceps',
        instructions: [
          'Grip bar slightly wider than shoulders',
          'Hang with arms extended',
          'Pull up until chin over bar',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Barbell Rows',
        targetMuscles: 'Back, Lats, Rear Delts, Biceps',
        instructions: [
          'Stand with feet hip-width apart, grip barbell with overhand grip',
          'Hinge at hips, keep back straight and chest up',
          'Pull barbell to lower chest, squeezing shoulder blades',
          'Lower bar with control, keeping core tight',
          'Repeat for reps'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Face Pulls',
        targetMuscles: 'Rear Delts, Upper Back',
        instructions: [
          'Set cable at face height',
          'Pull rope to face, elbows high',
          'Squeeze shoulder blades',
          'Return with control'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
        ],
      },
      {
        name: 'Bicep Curls',
        targetMuscles: 'Biceps',
        instructions: [
          'Stand with dumbbells at sides',
          'Curl weights to shoulders',
          'Keep elbows at sides',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
        ],
      },
    ],
  },
  'Lower Body 2': {
    name: 'Lower Body 2',
    exercises: [
      {
        name: 'Romanian Deadlifts',
        targetMuscles: 'Hamstrings, Lower Back',
        instructions: [
          'Stand with feet hip-width',
          'Soft bend in knees',
          'Hinge at hips, bar close to legs',
          'Feel stretch in hamstrings'
        ],
        sets: [
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
          { weight: '', reps: '8-12', completed: false },
        ],
      },
      {
        name: 'Hip Thrusts',
        targetMuscles: 'Glutes, Hamstrings',
        instructions: [
          'Upper back on bench',
          'Bar across hips',
          'Drive hips up to full extension',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
        ],
      },
      {
        name: 'Leg Curls',
        targetMuscles: 'Hamstrings',
        instructions: [
          'Lie face down on machine',
          'Hook ankles under pad',
          'Curl legs toward glutes',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
        ],
      },
      {
        name: 'Glute Bridges',
        targetMuscles: 'Glutes, Lower Back',
        instructions: [
          'Lie on back, knees bent',
          'Feet flat on ground',
          'Drive hips up to ceiling',
          'Squeeze glutes at top'
        ],
        sets: [
          { weight: '', reps: '15-20', completed: false },
          { weight: '', reps: '15-20', completed: false },
          { weight: '', reps: '15-20', completed: false },
        ],
      },
      {
        name: 'Calf Raises',
        targetMuscles: 'Calves',
        instructions: [
          'Stand on edge of step',
          'Lower heels below platform',
          'Rise up onto toes',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '15-20', completed: false },
          { weight: '', reps: '15-20', completed: false },
          { weight: '', reps: '15-20', completed: false },
        ],
      },
    ],
  },
  'Strength Day 1': {
    name: 'Strength Day 1',
    exercises: [
      {
        name: 'Squats',
        targetMuscles: 'Quads, Glutes, Core',
        instructions: [
          'Bar across upper back',
          'Feet shoulder-width apart',
          'Break at hips and knees',
          'Drive through heels'
        ],
        sets: [
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
        ],
      },
      {
        name: 'Bench Press',
        targetMuscles: 'Chest, Shoulders, Triceps',
        instructions: [
          'Arch back slightly',
          'Grip bar just outside shoulders',
          'Lower to mid-chest',
          'Press with explosive power'
        ],
        sets: [
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
        ],
      },
      {
        name: 'Overhead Press',
        targetMuscles: 'Shoulders, Triceps',
        instructions: [
          'Grip just outside shoulders',
          'Brace core tight',
          'Press bar overhead',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
        ],
      },
      {
        name: 'Barbell Rows',
        targetMuscles: 'Back, Lats, Rear Delts, Biceps',
        instructions: [
          'Stand with feet hip-width apart, grip barbell with overhand grip',
          'Hinge at hips, keep back straight and chest up',
          'Pull barbell to lower chest, squeezing shoulder blades',
          'Lower bar with control, keeping core tight',
          'Repeat for reps'
        ],
        sets: [
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
        ],
      },
      {
        name: 'Weighted Dips',
        targetMuscles: 'Chest, Triceps',
        instructions: [
          'Add weight via belt/vest',
          'Lower until shoulders stretched',
          'Press back to straight arms',
          'Keep core tight'
        ],
        sets: [
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
        ],
      },
    ],
  },
  'Strength Day 2': {
    name: 'Strength Day 2',
    exercises: [
      {
        name: 'Deadlifts',
        targetMuscles: 'Back, Hamstrings, Core',
        instructions: [
          'Bar over mid-foot',
          'Grip just outside legs',
          'Keep back flat',
          'Drive through floor'
        ],
        sets: [
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
        ],
      },
      {
        name: 'Power Cleans',
        targetMuscles: 'Full Body, Explosiveness',
        instructions: [
          'Start like deadlift',
          'Pull explosively',
          'Catch on shoulders',
          'Stand and reset'
        ],
        sets: [
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
        ],
      },
      {
        name: 'Front Squats',
        targetMuscles: 'Quads, Core',
        instructions: [
          'Bar on front shoulders',
          'Elbows high',
          'Keep torso upright',
          'Break at hips and knees'
        ],
        sets: [
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
        ],
      },
      {
        name: 'Pull-ups',
        targetMuscles: 'Back, Biceps',
        instructions: [
          'Wide grip on bar',
          'Pull chest to bar',
          'Lead with elbows',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
          { weight: '', reps: '5', completed: false },
        ],
      },
    ],
  },
  'Strength Day 3': {
    name: 'Strength Day 3',
    exercises: [
      {
        name: 'Incline Press',
        targetMuscles: 'Upper Chest, Shoulders',
        instructions: [
          'Bench at 30-45 degrees',
          'Grip slightly wider than shoulders',
          'Lower to upper chest',
          'Press with power'
        ],
        sets: [
          { weight: '', reps: '4', completed: false },
          { weight: '', reps: '4', completed: false },
          { weight: '', reps: '4', completed: false },
        ],
      },
      {
        name: 'Romanian Deadlifts',
        targetMuscles: 'Hamstrings, Lower Back',
        instructions: [
          'Soft knee bend',
          'Hinge at hips',
          'Bar close to legs',
          'Feel hamstring stretch'
        ],
        sets: [
          { weight: '', reps: '4', completed: false },
          { weight: '', reps: '4', completed: false },
          { weight: '', reps: '4', completed: false },
        ],
      },
      {
        name: 'Military Press',
        targetMuscles: 'Shoulders, Triceps',
        instructions: [
          'Strict form',
          'Press overhead',
          'Bar path straight',
          'Full lockout'
        ],
        sets: [
          { weight: '', reps: '4', completed: false },
          { weight: '', reps: '4', completed: false },
          { weight: '', reps: '4', completed: false },
        ],
      },
      {
        name: 'Weighted Chin-ups',
        targetMuscles: 'Back, Biceps',
        instructions: [
          'Add weight via belt',
          'Underhand grip',
          'Pull to upper chest',
          'Full range of motion'
        ],
        sets: [
          { weight: '', reps: '4', completed: false },
          { weight: '', reps: '4', completed: false },
          { weight: '', reps: '4', completed: false },
        ],
      },
    ],
  },
  'Upper Body Power': {
    name: 'Upper Body Power',
    exercises: [
      {
        name: 'Bench Press',
        targetMuscles: 'Chest, Shoulders, Triceps',
        instructions: [
          'Lie flat on bench with feet planted',
          'Grip bar slightly wider than shoulders',
          'Lower bar to mid-chest with control',
          'Press with explosive power'
        ],
        sets: [
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
        ],
      },
      {
        name: 'Weighted Pull-ups',
        targetMuscles: 'Back, Biceps',
        instructions: [
          'Add weight via belt or vest',
          'Grip bar slightly wider than shoulders',
          'Pull chest to bar with power',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
        ],
      },
      {
        name: 'Military Press',
        targetMuscles: 'Shoulders, Triceps',
        instructions: [
          'Stand with feet shoulder-width apart',
          'Press bar overhead with power',
          'Keep core tight throughout',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
        ],
      },
      {
        name: 'Barbell Rows',
        targetMuscles: 'Back, Lats, Rear Delts, Biceps',
        instructions: [
          'Stand with feet hip-width apart, grip barbell with overhand grip',
          'Hinge at hips, keep back straight and chest up',
          'Pull barbell to lower chest, squeezing shoulder blades',
          'Lower bar with control, keeping core tight',
          'Repeat for reps'
        ],
        sets: [
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
        ],
      },
    ],
  },
  'Lower Body Power': {
    name: 'Lower Body Power',
    exercises: [
      {
        name: 'Back Squats',
        targetMuscles: 'Quads, Glutes',
        instructions: [
          'Bar across upper back',
          'Feet shoulder-width apart',
          'Break at hips and knees',
          'Drive through heels explosively'
        ],
        sets: [
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
        ],
      },
      {
        name: 'Romanian Deadlifts',
        targetMuscles: 'Hamstrings, Lower Back',
        instructions: [
          'Stand with feet hip-width',
          'Hinge at hips with soft knees',
          'Lower bar along legs with power',
          'Drive hips forward explosively'
        ],
        sets: [
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
        ],
      },
      {
        name: 'Front Squats',
        targetMuscles: 'Quads, Core',
        instructions: [
          'Bar racked on front delts',
          'Elbows high, chest up',
          'Break at hips and knees',
          'Stand explosively'
        ],
        sets: [
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
        ],
      },
      {
        name: 'Leg Press',
        targetMuscles: 'Quads, Hamstrings, Glutes',
        instructions: [
          'Feet shoulder-width on platform',
          'Lower weight with control',
          'Drive through heels powerfully',
          'Stop just before lockout'
        ],
        sets: [
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
          { weight: '', reps: '4-6', completed: false },
        ],
      },
    ],
  },
  'HIIT Cardio': {
    name: 'HIIT Cardio',
    exercises: [
      {
        name: 'Burpees',
        targetMuscles: 'Glutes, Quads, Hamstrings, Core, Calves, Chest, Shoulders, Triceps',
        instructions: [
          "Stand with your feet shoulder-width apart, arms at your sides.",
          "Drop into a squat position and place your hands on the floor in front of you.",
          "Jump your feet back so you're in a high plank position.",
          "Do a push-up, keeping your body straight and core tight.",
          "Jump your feet forward to return to the squat position.",
          "Explosively jump into the air, reaching your arms overhead.",
          "Land softly and immediately go into the next rep."
        ],
        sets: [
          { weight: '', reps: '30s', completed: false },
          { weight: '', reps: '30s', completed: false },
          { weight: '', reps: '30s', completed: false },
          { weight: '', reps: '30s', completed: false }
        ]
      },
      {
        name: 'Mountain Climbers',
        targetMuscles: 'Core, Shoulders',
        instructions: [
          'Start in plank position',
          'Drive knees to chest alternately',
          'Keep hips level',
          'Maintain fast, controlled pace'
        ],
        sets: [
          { weight: '', reps: '30s', completed: false },
          { weight: '', reps: '30s', completed: false },
          { weight: '', reps: '30s', completed: false },
          { weight: '', reps: '30s', completed: false },
        ],
      },
      {
        name: 'Jump Squats',
        targetMuscles: 'Legs, Core',
        instructions: [
          'Start in squat stance',
          'Lower into squat',
          'Jump explosively',
          'Land softly and repeat'
        ],
        sets: [
          { weight: '', reps: '30s', completed: false },
          { weight: '', reps: '30s', completed: false },
          { weight: '', reps: '30s', completed: false },
          { weight: '', reps: '30s', completed: false },
        ],
      },
      {
        name: 'High Knees',
        targetMuscles: 'Core, Legs',
        instructions: [
          'Stand tall, arms at sides',
          'Drive knees up alternately',
          'Touch knees to palms',
          'Maintain quick rhythm'
        ],
        sets: [
          { weight: '', reps: '30s', completed: false },
          { weight: '', reps: '30s', completed: false },
          { weight: '', reps: '30s', completed: false },
          { weight: '', reps: '30s', completed: false },
        ],
      },
    ],
  },
  'Core & Abs': {
    name: 'Core & Abs',
    exercises: [
      {
        name: 'Planks',
        targetMuscles: 'Core, Shoulders',
        instructions: [
          'Start in forearm plank position',
          'Keep body in straight line',
          'Engage core and glutes',
          'Breathe steadily throughout'
        ],
        sets: [
          { weight: '', reps: '60s', completed: false },
          { weight: '', reps: '45s', completed: false },
          { weight: '', reps: '30s', completed: false },
        ],
      },
      {
        name: 'Russian Twists',
        targetMuscles: 'Obliques, Core',
        instructions: [
          'Sit with knees bent, feet off ground',
          'Lean back slightly, keeping back straight',
          'Rotate torso side to side',
          'Touch ground on each side'
        ],
        sets: [
          { weight: '', reps: '15-20', completed: false },
          { weight: '', reps: '15-20', completed: false },
          { weight: '', reps: '15-20', completed: false },
        ],
      },
      {
        name: 'Leg Raises',
        targetMuscles: 'Lower Abs',
        instructions: [
          'Lie flat on back',
          'Keep legs straight',
          'Raise legs to 90 degrees',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '15-20', completed: false },
          { weight: '', reps: '15-20', completed: false },
          { weight: '', reps: '15-20', completed: false },
        ],
      },
      {
        name: 'Cable Crunches',
        targetMuscles: 'Upper Abs',
        instructions: [
          'Kneel facing cable machine',
          'Hold rope behind head',
          'Curl torso down and in',
          'Squeeze abs at bottom'
        ],
        sets: [
          { weight: '', reps: '15-20', completed: false },
          { weight: '', reps: '15-20', completed: false },
          { weight: '', reps: '15-20', completed: false },
        ],
      },
    ],
  },
  'Mobility & Recovery': {
    name: 'Mobility & Recovery',
    exercises: [
      {
        name: 'Dynamic Stretching',
        targetMuscles: 'Hips, Hamstrings, Quads, Glutes, Shoulders, Core',
        instructions: [
          "Perform a series of active movements to warm up the body before exercise.",
          "Examples: Arm circles (shoulders), leg swings (hips, hamstrings), walking lunges (quads, glutes), high knees (hip flexors, core), butt kicks (hamstrings, quads), trunk twists (core), and side shuffles (adductors, abductors).",
          "Each movement should be performed for 20-30 seconds, moving through a full range of motion without holding the stretch."
        ],
        sets: [
          { weight: '', reps: '60s', completed: false },
          { weight: '', reps: '60s', completed: false }
        ]
      },
      {
        name: 'Yoga Poses',
        targetMuscles: 'Back, Hips, Hamstrings, Shoulders, Core',
        instructions: [
          "Perform a sequence of foundational yoga poses, holding each for 30-60 seconds:",
          "1. Downward Facing Dog: Start on hands and knees, lift hips to form an inverted V. Stretches hamstrings, calves, shoulders, and back.",
          "2. Cat-Cow: Alternate arching and rounding your back on hands and knees. Mobilizes spine and stretches back/core.",
          "3. Cobra Pose: Lie on your stomach, hands under shoulders, press up to lift chest. Stretches chest, abs, and strengthens back.",
          "4. Child's Pose: Kneel, sit back on heels, stretch arms forward. Stretches back, hips, and relaxes the body.",
          "5. Warrior I: Lunge forward with one leg, arms overhead, hips square. Stretches hips, strengthens legs and shoulders."
        ],
        sets: [
          { weight: '', reps: '30s each', completed: false },
          { weight: '', reps: '30s each', completed: false }
        ]
      },
      {
        name: 'Joint Mobility',
        targetMuscles: 'Ankles, Hips, Shoulders',
        instructions: [
          "Start with gentle circular movements",
          "Move through full range of motion",
          "Focus on controlled, smooth movements",
          "Perform 8-10 reps in each direction",
          "Stop if you feel any sharp pain"
        ],
        sets: [
          { weight: '', reps: '30s each', completed: false },
          { weight: '', reps: '30s each', completed: false }
        ]
      },
      {
        name: 'Foam Rolling',
        targetMuscles: 'Back, Legs',
        instructions: [
          'Start with major muscle groups: quads, hamstrings, calves',
          'Roll slowly, pausing on tender spots for 20-30 seconds',
          'Maintain proper posture and core engagement',
          'Breathe deeply while rolling',
          'Avoid rolling directly over joints or bones'
        ],
        sets: [
          { weight: '', reps: '60s per area', completed: false },
          { weight: '', reps: '60s per area', completed: false },
        ],
      },
    ],
  },
  'Chest & Triceps': {
    name: 'Chest & Triceps',
    exercises: [
      {
        name: 'Incline Bench Press',
        targetMuscles: 'Upper Chest, Front Delts',
        instructions: [
          'Set bench to 30 degree angle',
          'Grip bar slightly wider than shoulders',
          'Lower bar to upper chest',
          'Press bar up to starting position'
        ],
        sets: [
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false }
        ]
      },
      {
        name: 'Flat Dumbbell Press',
        targetMuscles: 'Mid Chest, Front Delts',
        instructions: [
          'Lie flat on bench',
          'Hold dumbbells at chest level',
          'Press up with natural arc',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false }
        ]
      },
      {
        name: 'Cable Flyes',
        targetMuscles: 'Chest, Shoulders',
        instructions: [
          'Stand between cable machines',
          'Slight forward lean',
          'Keep arms slightly bent',
          'Bring hands together in arc'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false }
        ]
      },
      {
        name: 'Tricep Pushdowns',
        targetMuscles: 'Triceps',
        instructions: [
          'Face cable machine',
          'Elbows at sides',
          'Extend arms fully',
          'Control the negative'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false }
        ]
      },
      {
        name: 'Overhead Tricep Extensions',
        targetMuscles: 'Triceps (Long Head)',
        instructions: [
          'Hold dumbbell overhead',
          'Keep elbows close',
          'Lower behind head',
          'Extend arms fully'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false }
        ]
      }
    ]
  },
  'Back & Biceps': {
    name: 'Back & Biceps',
    exercises: [
      {
        name: 'Pull-ups',
        targetMuscles: 'Back, Biceps',
        instructions: [
          'Wide grip on bar',
          'Pull chest to bar',
          'Focus on back contraction',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false }
        ]
      },
      {
        name: 'Barbell Rows',
        targetMuscles: 'Back, Lats, Rear Delts, Biceps',
        instructions: [
          'Stand with feet hip-width apart, grip barbell with overhand grip',
          'Hinge at hips, keep back straight and chest up',
          'Pull barbell to lower chest, squeezing shoulder blades',
          'Lower bar with control, keeping core tight',
          'Repeat for reps'
        ],
        sets: [
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false }
        ]
      },
      {
        name: 'Lat Pulldowns',
        targetMuscles: 'Lats, Biceps',
        instructions: [
          'Grip bar wide',
          'Lean back slightly',
          'Pull to upper chest',
          'Control the return'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false }
        ]
      },
      {
        name: 'Bicep Curls',
        targetMuscles: 'Biceps',
        instructions: [
          'Stand with dumbbells',
          'Keep elbows at sides',
          'Curl with control',
          'Full range of motion'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false }
        ]
      },
      {
        name: 'Hammer Curls',
        targetMuscles: 'Biceps, Forearms',
        instructions: [
          'Neutral grip',
          'Keep elbows still',
          'Curl to shoulders',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false }
        ]
      }
    ]
  },
  'Legs': {
    name: 'Legs',
    exercises: [
      {
        name: 'Squats',
        targetMuscles: 'Quads, Glutes',
        instructions: [
          'Feet shoulder width',
          'Keep chest up',
          'Break at hips and knees',
          'Drive through heels'
        ],
        sets: [
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false }
        ]
      },
      {
        name: 'Romanian Deadlifts',
        targetMuscles: 'Hamstrings, Lower Back',
        instructions: [
          'Soft knee bend',
          'Hinge at hips',
          'Bar close to legs',
          'Feel hamstring stretch'
        ],
        sets: [
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false }
        ]
      },
      {
        name: 'Leg Press',
        targetMuscles: 'Quads, Hamstrings',
        instructions: [
          'Feet shoulder width',
          'Lower with control',
          'Do not lock knees',
          'Push through heels'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false }
        ]
      },
      {
        name: 'Leg Curls',
        targetMuscles: 'Hamstrings',
        instructions: [
          'Lie face down',
          'Curl heels to glutes',
          'Hold peak contraction',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false }
        ]
      },
      {
        name: 'Calf Raises',
        targetMuscles: 'Calves',
        instructions: [
          'Stand on edge',
          'Full range of motion',
          'Hold at top',
          'Slow negative'
        ],
        sets: [
          { weight: '', reps: '15-20', completed: false },
          { weight: '', reps: '15-20', completed: false },
          { weight: '', reps: '15-20', completed: false }
        ]
      }
    ]
  },
  'Shoulders & Arms': {
    name: 'Shoulders & Arms',
    exercises: [
      {
        name: 'Overhead Press',
        targetMuscles: 'Shoulders, Triceps',
        instructions: [
          'Stand with feet planted',
          'Press overhead',
          'Keep core tight',
          'Control the descent'
        ],
        sets: [
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false },
          { weight: '', reps: '10-12', completed: false }
        ]
      },
      {
        name: 'Lateral Raises',
        targetMuscles: 'Side Delts',
        instructions: [
          'Stand with dumbbells',
          'Slight bend in elbows',
          'Raise to shoulder level',
          'Lower with control'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false }
        ]
      },
      {
        name: 'Face Pulls',
        targetMuscles: 'Rear Delts, Upper Back',
        instructions: [
          'Cable at head height',
          'Pull to face',
          'Lead with elbows',
          'Squeeze at back'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false }
        ]
      },
      {
        name: 'Bicep Curls',
        targetMuscles: 'Biceps',
        instructions: [
          'Stand with dumbbells',
          'Keep elbows at sides',
          'Full range of motion',
          'Squeeze at top'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false }
        ]
      },
      {
        name: 'Tricep Extensions',
        targetMuscles: 'Triceps',
        instructions: [
          'Lie on bench',
          'Hold dumbbells overhead',
          'Lower behind head',
          'Extend arms fully'
        ],
        sets: [
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false },
          { weight: '', reps: '12-15', completed: false }
        ]
      }
    ]
  },
  'power-clean': {
    name: 'Power Clean',
    targetMuscles: 'Full Body, Back, Shoulders, Legs',
    instructions: [
      'Stand with feet hip-width apart, barbell over mid-foot',
      'Grip bar just outside legs, back flat, chest up',
      'Pull bar explosively from floor, extending hips and knees',
      'Shrug shoulders and pull bar up, dropping under to catch on shoulders',
      'Stand up fully with bar on shoulders'
    ]
  },
  'push-press': {
    name: 'Push Press',
    targetMuscles: 'Shoulders, Triceps, Legs',
    instructions: [
      'Stand with barbell at shoulder height, feet shoulder-width apart',
      'Dip knees slightly, then drive up explosively',
      'Press bar overhead to full extension',
      'Lower bar back to shoulders with control'
    ]
  },
  'box-jump': {
    name: 'Box Jump',
    targetMuscles: 'Legs, Glutes, Core',
    instructions: [
      'Stand in front of box with feet shoulder-width apart',
      'Bend knees and swing arms back',
      'Explosively jump onto box, landing softly',
      'Stand up fully, then step down carefully'
    ]
  },
  'chin-up': {
    name: 'Chin-Up',
    targetMuscles: 'Back, Biceps',
    instructions: [
      'Grip bar with palms facing you, hands shoulder-width apart',
      'Hang with arms fully extended',
      'Pull chin above bar, squeezing back and biceps',
      'Lower with control to starting position'
    ]
  },
  'farmer\'s-walk': {
    name: "Farmer's Walk",
    targetMuscles: 'Grip, Shoulders, Core, Legs',
    instructions: [
      'Hold heavy dumbbells or kettlebells at sides',
      'Stand tall, shoulders back, core tight',
      'Walk forward for distance or time',
      'Keep posture upright throughout'
    ]
  },
  'cable-kickback': {
    name: 'Cable Kickback',
    targetMuscles: 'Glutes, Hamstrings',
    instructions: [
      'Attach ankle strap to low cable',
      'Stand facing machine, hold support',
      'Kick leg back, squeezing glute',
      'Return with control, repeat for reps'
    ]
  },
  'plank-variation': {
    name: 'Plank Variation',
    targetMuscles: 'Core, Shoulders',
    instructions: [
      'Assume plank position (forearm, side, or extended)',
      'Keep body in straight line',
      'Engage core and glutes',
      'Hold for desired time or switch variations'
    ]
  },
  'hanging-leg-raise': {
    name: 'Hanging Leg Raise',
    targetMuscles: 'Abs, Hip Flexors',
    instructions: [
      'Hang from pull-up bar, arms extended',
      'Keep legs straight, raise them to hip height or higher',
      'Lower with control',
      'Avoid swinging'
    ]
  },
  'battle-rope': {
    name: 'Battle Ropes',
    targetMuscles: 'Shoulders, Arms, Core',
    instructions: [
      'Hold rope ends with both hands',
      'Stand with knees slightly bent',
      'Move arms explosively to create waves',
      'Alternate or use both arms together'
    ]
  },
  'sled-push': {
    name: 'Sled Push',
    targetMuscles: 'Legs, Glutes, Core',
    instructions: [
      'Stand behind sled, hands on handles',
      'Lean forward, drive through legs to push sled',
      'Keep core tight and back flat',
      'Push for distance or time'
    ]
  },
  'burpee-pull-up': {
    name: 'Burpee Pull-Up',
    targetMuscles: 'Full Body, Back, Arms',
    instructions: [
      'Perform a burpee under a pull-up bar',
      'After jumping up, grab bar and do a pull-up',
      'Lower down, return to burpee position',
      'Repeat for reps'
    ]
  },
  'rowing-sprint': {
    name: 'Rowing Sprint',
    targetMuscles: 'Back, Legs, Cardio',
    instructions: [
      'Sit on rowing machine, feet strapped in',
      'Grip handle, drive with legs then pull with arms',
      'Row as fast as possible for set time or distance',
      'Maintain good form throughout'
    ]
  },
  'medicine-ball-slam': {
    name: 'Medicine Ball Slam',
    targetMuscles: 'Shoulders, Core, Arms',
    instructions: [
      'Stand holding medicine ball overhead',
      'Slam ball down to floor with force',
      'Squat to pick up and repeat'
    ]
  },
  'incline-barbell-press': {
    name: 'Incline Barbell Press',
    targetMuscles: 'Upper Chest, Shoulders, Triceps',
    instructions: [
      'Set bench to 30-45 degrees',
      'Grip bar slightly wider than shoulders',
      'Lower bar to upper chest',
      'Press bar up to starting position'
    ]
  },
  'pendlay-row': {
    name: 'Pendlay Row',
    targetMuscles: 'Back, Lats, Rear Delts',
    instructions: [
      'Stand with feet hip-width, barbell on floor',
      'Grip bar overhand, back parallel to ground',
      'Pull bar explosively to lower chest',
      'Lower bar to floor each rep'
    ]
  },
  'walking-lunge': {
    name: 'Walking Lunge',
    targetMuscles: 'Quads, Glutes, Hamstrings',
    instructions: [
      'Stand tall, step forward into lunge',
      'Lower until both knees are bent at 90 degrees',
      'Push through front heel, bring back foot forward',
      'Alternate legs as you walk'
    ]
  },
  'arnold-press': {
    name: 'Arnold Press',
    targetMuscles: 'Shoulders, Triceps',
    instructions: [
      'Sit or stand holding dumbbells at shoulder height, palms facing you',
      'Rotate palms outward as you press weights overhead',
      'Lower with control, rotating palms back in'
    ]
  },
  'nordic-hamstring-curl': {
    name: 'Nordic Hamstring Curl',
    targetMuscles: 'Hamstrings, Glutes',
    instructions: [
      'Kneel with ankles secured',
      'Lower torso forward slowly, keeping hips extended',
      'Catch yourself with hands if needed, pull back up with hamstrings'
    ]
  },
  'plank-jack': {
    name: 'Plank Jack',
    targetMuscles: 'Core, Shoulders, Legs',
    instructions: [
      'Start in plank position',
      'Jump feet out wide, then back together',
      'Keep core tight and back flat',
      'Repeat for reps or time'
    ]
  },
  'static-stretching': {
    name: 'Static Stretching',
    targetMuscles: 'Full Body',
    instructions: [
      'Hold each stretch for 20-60 seconds',
      'Do not bounce, relax into the stretch',
      'Breathe deeply and focus on target muscle',
      'Switch sides as needed'
    ]
  },
  'bicycle-crunch': {
    name: 'Bicycle Crunch',
    targetMuscles: 'Abs, Obliques',
    instructions: [
      'Lie on back, hands behind head',
      'Bring knees up, lift shoulders off floor',
      'Alternate bringing opposite elbow to knee, extending other leg',
      'Repeat in a pedaling motion'
    ]
  },
  'dip': {
    name: 'Dip',
    targetMuscles: 'Chest, Triceps, Shoulders',
    instructions: [
      'Grip parallel bars, arms straight',
      'Lower body until shoulders are below elbows',
      'Press back up to starting position',
      'Keep core tight throughout'
    ]
  },
  'dumbbell-press': {
    name: 'Dumbbell Press',
    targetMuscles: 'Chest, Shoulders, Triceps',
    instructions: [
      'Lie on bench with dumbbells at chest level',
      'Press weights up until arms are straight',
      'Lower with control to starting position'
    ]
  },
};

// Add a helper to generate a howTo string from instructions
function generateHowTo(instructions) {
  if (!instructions || instructions.length === 0) return '';
  return instructions.join(' ');
}

// Add howTo to every exercise in workoutData
Object.values(workoutData).forEach(workout => {
  if (Array.isArray(workout.exercises)) {
    workout.exercises.forEach(ex => {
      if (!ex.howTo) {
        ex.howTo = generateHowTo(ex.instructions);
      }
    });
  }
});

// Helper: get default info for common exercises
const defaultExerciseInfo = {
  'push-up': {
    name: 'Push-Up',
    targetMuscles: 'Chest, Shoulders, Triceps, Core',
    instructions: [
      'Start in a plank position with hands under shoulders',
      'Lower your body until your chest nearly touches the floor',
      'Push back up to starting position',
      'Keep your body straight throughout'
    ]
  },
  'sit-up': {
    name: 'Sit-Up',
    targetMuscles: 'Abdominals',
    instructions: [
      'Lie on your back with knees bent',
      'Cross arms over chest or place hands behind head',
      'Lift your torso toward your knees',
      'Lower back down with control'
    ]
  },
  'plank': {
    name: 'Plank',
    targetMuscles: 'Core, Shoulders',
    instructions: [
      'Start in forearm plank position',
      'Keep body in straight line',
      'Engage core and glutes',
      'Hold position for desired time'
    ]
  },
  'jumping jack': {
    name: 'Jumping Jack',
    targetMuscles: 'Full Body, Calves, Shoulders, Glutes',
    instructions: [
      'Stand upright with feet together and arms at your sides',
      'Jump feet out to the sides while raising arms overhead',
      'Jump back to starting position',
      'Repeat quickly for desired reps or time'
    ]
  },
  'lunge': {
    name: 'Lunge',
    targetMuscles: 'Quads, Glutes, Hamstrings',
    instructions: [
      'Stand tall with feet hip-width apart',
      'Step forward with one leg and lower your hips until both knees are bent at about 90 degrees',
      'Push back to starting position',
      'Alternate legs for each rep'
    ]
  },
  'crunch': {
    name: 'Crunch',
    targetMuscles: 'Abdominals',
    instructions: [
      'Lie on your back with knees bent and feet flat on the floor',
      'Place hands behind your head or across your chest',
      'Lift your shoulders off the floor, engaging your abs',
      'Lower back down with control'
    ]
  },
  'mountain climber': {
    name: 'Mountain Climber',
    targetMuscles: 'Core, Shoulders, Quads',
    instructions: [
      "Start in a high plank position",
      "Drive one knee toward your chest",
      "Switch legs quickly, alternating knees to chest",
      "Keep core tight and back flat throughout"
    ]
  },
  'burpee': {
    name: 'Burpee',
    targetMuscles: 'Glutes, Quads, Hamstrings, Core, Calves, Chest, Shoulders, Triceps',
    instructions: [
      "Stand with your feet shoulder-width apart, arms at your sides",
      "Drop into a squat position and place your hands on the floor in front of you",
      "Jump your feet back so you're in a high plank position",
      "Do a push-up, keeping your body straight and core tight",
      "Jump your feet forward to return to the squat position",
      "Explosively jump into the air, reaching your arms overhead",
      "Land softly and immediately go into the next rep."
    ]
  },
  // Add more as needed
};

const ActiveWorkoutScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const { updateStats, stats, incrementStat } = useTracking();
  const { settings } = useSettings();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [calories, setCalories] = useState(0);
  const [workout, setWorkout] = useState(null);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTime, setRestTime] = useState(90); // Default value
  const [currentRestTime, setCurrentRestTime] = useState(90); // Default value
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);
  const [showHowToModal, setShowHowToModal] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(null);
  const { userProfile } = useUser();

  // Initialize workout state based on params
  useEffect(() => {
    if (params.custom === 'true' && params.workout) {
      try {
        const parsed = JSON.parse(params.workout);
        setWorkout({
          name: parsed.name,
          exercises: parsed.exercises.map(ex => {
            // If ex is a string, it's just the exercise name
            if (typeof ex === 'string') {
              // Try to find matching exercise in workoutData
              let found = null;
              for (const workout of Object.values(workoutData)) {
                if (workout.exercises) {
                found = workout.exercises.find(e => e.name && e.name.toLowerCase() === ex.toLowerCase());
                if (found) break;
                }
              }
              // If found, use that exercise's data
              if (found) {
                return {
                  ...found,
                  sets: Array.from({ length: 3 }, () => ({
                    weight: '',
                    reps: found.sets[0].reps,
                    completed: false
                  }))
                };
              }
              // If not found, use default info or create basic exercise
              return {
                name: ex,
                targetMuscles: 'Full Body',
                instructions: ['No specific instructions available.'],
                sets: Array.from({ length: 3 }, () => ({
                  weight: '',
                  reps: '8-12',
                  completed: false
                }))
              };
            }
            // If ex is an object, use its data
            return {
              name: ex.name,
              targetMuscles: ex.targetMuscles || 'Full Body',
              instructions: ex.instructions || ['No specific instructions available.'],
              sets: Array.from({ length: parseInt(ex.sets) || 3 }, () => ({
                weight: '',
                reps: ex.reps || '8-12',
                completed: false
              }))
            };
          })
        });
      } catch (error) {
        console.error('Error parsing workout:', error);
        Alert.alert(
          'Error',
          'Failed to load workout. Please try again.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } else {
      // Handle predefined workouts
      const workoutName = params.type;
      if (workoutData[workoutName]) {
        setWorkout(workoutData[workoutName]);
      } else {
        console.error('Workout not found:', workoutName);
        Alert.alert(
          'Error',
          'Workout not found. Please try again.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    }
  }, [params.workout, params.custom, params.type]);

  // Initialize rest time from settings
  useEffect(() => {
    if (settings?.rest_time_seconds) {
      const newRestTime = parseInt(settings.rest_time_seconds);
      console.log('[ActiveWorkout] Setting rest time from settings:', newRestTime);
      setRestTime(newRestTime);
      setCurrentRestTime(newRestTime);
    }
  }, [settings?.rest_time_seconds]);

  // Rest timer countdown
  useEffect(() => {
    let timer;
    if (restTimerActive && currentRestTime > 0) {
      timer = setInterval(() => {
        setCurrentRestTime(prev => {
          if (prev <= 1) {
            setRestTimerActive(false);
            setShowRestTimer(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [restTimerActive, currentRestTime]);

  // Timer and calories tracking
  useEffect(() => {
    let timer;
    if (workout) {
      timer = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1;
          // Calculate calories burned (rough estimate: 5 calories per minute)
          const newCalories = Math.floor(newTime / 60 * 5);
          setCalories(newCalories);
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [workout]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSetComplete = (exerciseIndex, setIndex) => {
    const newWorkout = { ...workout };
    newWorkout.exercises[exerciseIndex].sets[setIndex].completed = true;
    setWorkout(newWorkout);
    
    // Use the current rest time from state
    setCurrentRestTime(restTime);
    setShowRestTimer(true);
    setRestTimerActive(true);
  };

  const resetWorkout = () => {
    const resetWorkoutData = { ...workout };
    resetWorkoutData.exercises.forEach(exercise => {
      exercise.sets.forEach(set => {
        set.completed = false;
      });
    });
    setWorkout(resetWorkoutData);
    setElapsedTime(0);
    setCalories(0);
  };

  const saveWorkoutLog = async () => {
    if (!user?.id) {
      console.error('No user found');
      return;
    }
    try {
      // Calculate completed sets and total weight
      let completedSets = 0;
      let totalWeight = 0;
      let exerciseNames = [];
      let exerciseCount = 0;
      // Process each exercise
      const exerciseData = workout.exercises.map(exercise => {
        exerciseCount++;
        exerciseNames.push(exercise.name);
        const sets = exercise.sets.map(set => {
          if (set.completed) {
            completedSets++;
            totalWeight += (set.weight || 0) * (set.reps || 0);
          }
          return {
            weight: set.weight || 0,
            reps: set.reps || 0,
            completed: set.completed || false
          };
        });
        return {
          name: exercise.name,
          targetMuscles: exercise.targetMuscles || [],
          sets: sets
        };
      });

      // First check if a record exists for today
      const { data: existingLog } = await supabase
        .from('user_workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', new Date().toISOString().split('T')[0])
        .single();

      if (existingLog) {
        // Update existing record
        const { error } = await supabase
          .from('user_workout_logs')
          .update({
            workout_name: workout.workout_name || workout.name,
            exercises: exerciseData,
            completed_sets: completedSets,
            exercise_count: exerciseCount,
            exercise_names: exerciseNames,
            total_weight: totalWeight,
            duration: elapsedTime,
            completed_at: new Date().toISOString()
          })
          .eq('id', existingLog.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('user_workout_logs')
          .insert({
            user_id: user.id,
            workout_name: workout.workout_name || workout.name,
            exercises: exerciseData,
            completed_sets: completedSets,
            exercise_count: exerciseCount,
            exercise_names: exerciseNames,
            total_weight: totalWeight,
            duration: elapsedTime,
            completed_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      // Update stats
      await updateStats(prev => ({
        ...prev,
        workouts: (prev.workouts || 0) + 1,
        minutes: (prev.minutes || 0) + Math.floor(elapsedTime / 60),
        today_workout_completed: true
      }));

      // Show success message
      Alert.alert(
        'Workout Completed',
        'Your workout has been saved successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert(
        'Error',
        'Failed to save your workout. Please try again.'
      );
    }
  };

  const handleFinish = async () => {
    setShowFinishConfirmation(true);
  };

  const confirmFinish = async () => {
    try {
      if (!user?.id) {
        console.error('No user found');
        return;
      }
      
      // Calculate stats
      let completedSets = 0;
      let totalWeight = 0;
      workout.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          if (set.completed) {
            completedSets++;
            if (set.weight) {
              const reps = parseInt(set.reps.split('-')[0]) || 0;
              const weight = parseFloat(set.weight) || 0;
              totalWeight += weight * reps;
            }
          }
        });
      });

      // Save workout log
      const { error } = await supabase
        .from('user_workout_logs')
        .insert({
          user_id: user.id,
          workout_name: workout.workout_name || workout.name,
          exercises: workout.exercises.map(exercise => ({
            name: exercise.name,
            targetMuscles: exercise.targetMuscles || [],
            sets: exercise.sets.map(set => ({
              weight: set.weight || 0,
              reps: set.reps || 0,
              completed: set.completed || false
            }))
          })),
          completed_sets: completedSets,
          exercise_count: workout.exercises.length,
          exercise_names: workout.exercises.map(ex => ex.name),
          total_weight: Math.round(totalWeight),
          duration: elapsedTime,
          completed_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving workout:', error);
        Alert.alert(
          'Error',
          'Failed to save your workout. Please try again.'
        );
        return;
      }

      // Update local stats
      await updateStats(prev => ({
        ...prev,
        workouts: (prev.workouts || 0) + 1,
        minutes: (prev.minutes || 0) + Math.floor(elapsedTime / 60),
        today_workout_completed: true
      }));

      // Reset workout and hide confirmation
      resetWorkout();
      setShowFinishConfirmation(false);
      
      // Navigate to summary with stats
      router.replace({
        pathname: '/(tabs)/workout-summary',
        params: {
          duration: elapsedTime,
          exerciseCount: workout.exercises.length,
          completedSets,
          totalWeight: Math.round(totalWeight),
          workoutName: workout.workout_name || workout.name,
          justCompleted: true
        }
      });
    } catch (error) {
      console.error('Error finishing workout:', error);
      Alert.alert(
        'Error',
        'There was a problem saving your workout. Please try again.',
        [{ text: 'OK', onPress: () => setShowFinishConfirmation(false) }]
      );
    }
  };

  const handleExit = () => {
    setShowExitConfirmation(true);
  };

  const skipRest = () => {
    setShowRestTimer(false);
    setRestTimerActive(false);
  };

  const toggleRestTimer = () => {
    setRestTimerActive(prev => !prev);
  };

  const handleWeightChange = (exerciseIndex, setIndex, weight) => {
    const newWorkout = { ...workout };
    newWorkout.exercises[exerciseIndex].sets[setIndex].weight = weight;
    setWorkout(newWorkout);
  };

  const handleHowToPress = (exercise) => {
    // Check if exercise has instructions, if not, try to find it in defaultExerciseInfo
    const exerciseInfo = exercise.instructions ? exercise : 
      defaultExerciseInfo[exercise.name.toLowerCase().replace(/\s+/g, '-')];
    
    if (exerciseInfo) {
      setCurrentExercise(exerciseInfo);
      setShowHowToModal(true);
    } else {
      // If no instructions found, show a message
      Alert.alert(
        'Instructions Not Available',
        'Sorry, instructions for this exercise are not available yet.',
        [{ text: 'OK' }]
      );
    }
  };

  // Add loading state at the top of the component
  if (!workout) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000'}}>
        <Text style={{color: '#00ffff', fontSize: 18}}>Loading workout...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleExit}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>{workout?.name}</Text>
          <TouchableOpacity 
            style={styles.finishButton}
            onPress={handleFinish}
          >
            <Text style={styles.finishButtonText}>Finish</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={20} color="#00ffff" />
            <Text style={styles.statText}>{formatTime(elapsedTime)}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flame-outline" size={20} color="#00ffff" />
            <Text style={styles.statText}>{Math.round(calories)} cal</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {workout?.exercises.map((exercise, exerciseIndex) => (
            <View key={exerciseIndex} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View>
                  <Text style={styles.exerciseName}>{exercise.name || 'Exercise'}</Text>
                  <TouchableOpacity
                    style={styles.howToButton}
                    onPress={() => handleHowToPress(exercise)}
                  >
                    <Text style={styles.howToButtonText}>How To</Text>
                  </TouchableOpacity>
                  <Text style={styles.targetMuscles}>
                    Target Muscles: {exercise.targetMuscles || 'N/A'}
                  </Text>
                </View>
              </View>

              {exercise.sets.map((set, setIndex) => (
                <View key={setIndex} style={styles.setRow}>
                  <Text style={styles.setNumber}>Set {setIndex + 1}</Text>
                  <View style={styles.setInputs}>
                    <View style={styles.weightInput}>
                      <TextInput
                        style={[
                          styles.input,
                          set.completed && styles.inputCompleted
                        ]}
                        placeholder="0"
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                        value={set.weight}
                        onChangeText={(text) => handleWeightChange(exerciseIndex, setIndex, text)}
                        editable={!set.completed}
                      />
                      <Text style={styles.inputLabel}>Weight (lbs)</Text>
                    </View>
                    <View style={styles.repsInput}>
                      <Text style={[
                        styles.repsText,
                        set.completed && styles.repsTextCompleted
                      ]}>{set.reps}</Text>
                      <Text style={styles.inputLabel}>Reps</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[
                      styles.checkButton,
                      set.completed && styles.checkButtonCompleted
                    ]}
                    onPress={() => !set.completed && handleSetComplete(exerciseIndex, setIndex)}
                  >
                    <Ionicons 
                      name={set.completed ? "checkmark" : "ellipse-outline"} 
                      size={24} 
                      color={set.completed ? "#000" : "#00ffff"} 
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>

        {/* Rest Timer Modal */}
        <Modal
          visible={showRestTimer}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.restTitle}>Rest Time</Text>
              <Text style={styles.timerText}>{formatTime(currentRestTime)}</Text>
              <View style={styles.restControls}>
                <TouchableOpacity onPress={toggleRestTimer}>
                  <Ionicons 
                    name={restTimerActive ? "pause" : "play"} 
                    size={32} 
                    color="#00ffff" 
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={skipRest}
              >
                <Text style={styles.skipButtonText}>Skip Rest</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Exit Confirmation Modal */}
        <Modal
          visible={showExitConfirmation}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="warning-outline" size={40} color="#ff4444" />
              </View>
              <Text style={styles.modalTitle}>Exit Workout?</Text>
              <Text style={styles.modalText}>
                Your progress will be lost if you exit now.{'\n'}
                Are you sure you want to leave?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowExitConfirmation(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Stay</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={() => {
                    setShowExitConfirmation(false);
                    resetWorkout();
                    router.replace('/(tabs)/workout');
                  }}
                >
                  <Text style={styles.confirmButtonText}>Exit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Finish Confirmation Modal */}
        <Modal
          visible={showFinishConfirmation}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="checkmark-circle-outline" size={40} color="#00ffff" />
              </View>
              <Text style={styles.modalTitle}>Finish Workout?</Text>
              <Text style={styles.modalText}>
                Great job! Ready to complete this workout?{'\n'}
                Your progress will be saved.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowFinishConfirmation(false)}
                >
                  <Text style={styles.cancelButtonText}>Continue</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmFinish}
                >
                  <Text style={styles.confirmButtonText}>Finish</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* How To Modal */}
        <Modal
          visible={showHowToModal}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.howToModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{currentExercise?.name}</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowHowToModal(false)}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.instructionsContainer}>
                <Text style={styles.targetMusclesTitle}>Target Muscles:</Text>
                <Text style={styles.targetMusclesText}>{currentExercise?.targetMuscles}</Text>
                
                <Text style={styles.instructionsTitle}>Instructions:</Text>
                {currentExercise?.instructions ? (
                  typeof currentExercise.instructions === 'string' ? (
                    <Text style={styles.instructionText}>{currentExercise.instructions}</Text>
                  ) : Array.isArray(currentExercise.instructions) ? (
                    currentExercise.instructions.map((instruction, index) => (
                      <View key={index} style={styles.instructionStep}>
                        <Text style={styles.stepNumber}>{index + 1}.</Text>
                        <Text style={styles.instructionText}>{instruction}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.instructionText}>No instructions available.</Text>
                  )
                ) : (
                  <Text style={styles.instructionText}>No instructions available.</Text>
                )}
              </View>
            </View>
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#000000',
    zIndex: 1,
  },
  closeButton: {
    padding: 8,
    zIndex: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  finishButton: {
    backgroundColor: '#00ffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: 5,
  },
  finishButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    color: '#00ffff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  exerciseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  exerciseHeader: {
    marginBottom: 20,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  howToButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  howToButtonText: {
    color: '#00ffff',
    fontSize: 14,
  },
  targetMuscles: {
    color: '#666',
    fontSize: 14,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  setNumber: {
    width: 60,
    color: '#fff',
    fontSize: 14,
  },
  setInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 15,
  },
  weightInput: {
    flex: 1,
  },
  repsInput: {
    flex: 1,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 10,
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  inputCompleted: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    color: '#00ffff',
  },
  repsText: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 10,
    color: '#fff',
    textAlign: 'center',
  },
  repsTextCompleted: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    color: '#00ffff',
  },
  inputLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  checkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#00ffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  checkButtonCompleted: {
    backgroundColor: '#00ffff',
  },
  restTimer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  restTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  restControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
    marginBottom: 20,
  },
  skipButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  skipButtonText: {
    color: '#00ffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  confirmButton: {
    backgroundColor: '#00ffff',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  howToModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  instructionsContainer: {
    marginTop: 20,
  },
  targetMusclesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  targetMusclesText: {
    fontSize: 14,
    color: '#00ffff',
    marginBottom: 15,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  stepNumber: {
    fontSize: 14,
    color: '#00ffff',
    marginRight: 5,
    minWidth: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00ffff',
    marginVertical: 20,
  },
});

export default ActiveWorkoutScreen; 