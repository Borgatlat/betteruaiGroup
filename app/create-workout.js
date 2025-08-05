import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';

// Organized exercise categories for better UX
const exerciseCategories = {
  'Chest': ['Bench Press', 'Incline Bench Press', 'Dumbbell Flyes', 'Push-Up', 'Chest Press Machine', 'Decline Bench Press'],
  'Back': ['Pull-Up', 'Chin-Up', 'Barbell Row', 'Dumbbell Row', 'Lat Pulldown', 'Seated Cable Row', 'T-Bar Row'],
  'Shoulders': ['Shoulder Press', 'Overhead Press', 'Lateral Raise', 'Front Raise', 'Rear Delt Fly', 'Arnold Press'],
  'Arms': ['Bicep Curl', 'Hammer Curl', 'Tricep Dip', 'Tricep Pushdown', 'Skullcrusher', 'Preacher Curl', 'Concentration Curl'],
  'Legs': ['Squat', 'Front Squat', 'Deadlift', 'Romanian Deadlift', 'Leg Press', 'Lunge', 'Leg Extension', 'Leg Curl', 'Calf Raise', 'Bulgarian Split Squat'],
  'Core': ['Plank', 'Russian Twist', 'Leg Raise', 'Cable Crunch', 'Bicycle Crunch', 'Mountain Climber', 'Ab Wheel Rollout'],
  'Glutes': ['Hip Thrust', 'Glute Bridge', 'Donkey Kicks', 'Fire Hydrants', 'Cable Kickbacks'],
  'Cardio': ['Burpees', 'Jump Squat', 'High Knees', 'Box Jump', 'Battle Ropes', 'Mountain Climbers', 'Jumping Jacks']
};

const CreateWorkoutScreen = () => {
  const router = useRouter();
  const [workoutName, setWorkoutName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Chest');
  const { isPremium } = useUser();

  const toggleExercise = (exercise) => {
    try {
      if (selectedExercises.some(e => e.name === exercise)) {
        setSelectedExercises(selectedExercises.filter(e => e.name !== exercise));
      } else {
        setSelectedExercises([...selectedExercises, { name: exercise, sets: '3', reps: '10' }]);
      }
    } catch (err) {
      console.error('toggleExercise error:', err);
    }
  };

  const updateExerciseField = (exercise, field, value) => {
    try {
      setSelectedExercises(selectedExercises.map(e =>
        e.name === exercise ? { ...e, [field]: value } : e
      ));
    } catch (err) {
      console.error('updateExerciseField error:', err);
    }
  };

  const handleSave = async () => {
    try {
      if (!workoutName.trim()) {
        Alert.alert('Please enter a workout name.');
        return;
      }
      if (selectedExercises.length === 0) {
        Alert.alert('Please select at least one exercise.');
        return;
      }
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');
      const { error } = await supabase
        .from('workouts')
        .insert([
          {
            profile_id: user.id,
            workout_name: workoutName,
            exercises: selectedExercises,
          },
        ]);
      if (error) throw error;
      Alert.alert('Workout saved!');
      router.replace('/(tabs)/workout');
    } catch (err) {
      console.error('handleSave error:', err);
      Alert.alert('Error', err.message || 'Failed to save workout.');
    } finally {
      setSaving(false);
    }
  };

  const removeExercise = (exerciseName) => {
    setSelectedExercises(selectedExercises.filter(e => e.name !== exerciseName));
  };

  return (
    <View style={styles.screenContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.exitButton} onPress={() => router.replace('/(tabs)/workout')}>
          <Ionicons name="close" size={24} color="#00ffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Workout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Workout Name Input */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Workout Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter workout name..."
            placeholderTextColor="#666"
            value={workoutName}
            onChangeText={setWorkoutName}
          />
        </View>

        {/* Selected Exercises Summary */}
        {selectedExercises.length > 0 && (
          <View style={styles.selectedSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Selected Exercises ({selectedExercises.length})</Text>
              <TouchableOpacity onPress={() => setSelectedExercises([])}>
                <Text style={styles.clearText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.selectedExercises}>
              {selectedExercises.map((exercise, index) => (
                <View key={exercise.name} style={styles.selectedExerciseCard}>
                  <View style={styles.selectedExerciseInfo}>
                    <Text style={styles.selectedExerciseName}>{exercise.name}</Text>
                    <View style={styles.setsRepsContainer}>
                      <TextInput
                        style={styles.setsRepsInput}
                        value={exercise.sets}
                        onChangeText={val => updateExerciseField(exercise.name, 'sets', val)}
                        keyboardType="numeric"
                        placeholder="3"
                        placeholderTextColor="#666"
                      />
                      <Text style={styles.setsRepsText}>sets</Text>
                      <TextInput
                        style={styles.setsRepsInput}
                        value={exercise.reps}
                        onChangeText={val => updateExerciseField(exercise.name, 'reps', val)}
                        keyboardType="numeric"
                        placeholder="10"
                        placeholderTextColor="#666"
                      />
                      <Text style={styles.setsRepsText}>reps</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => removeExercise(exercise.name)}
                  >
                    <Ionicons name="close-circle" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Exercise Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Choose Exercises</Text>
          
          {/* Category Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryTabs}
            contentContainerStyle={styles.categoryTabsContent}
          >
            {Object.keys(exerciseCategories).map((category) => (
              <TouchableOpacity
                key={category}
                style={[styles.categoryTab, activeCategory === category && styles.categoryTabActive]}
                onPress={() => setActiveCategory(category)}
              >
                <Text style={[styles.categoryTabText, activeCategory === category && styles.categoryTabTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Exercises in Selected Category */}
          <View style={styles.exercisesGrid}>
            {exerciseCategories[activeCategory].map((exercise) => {
              const selected = selectedExercises.some(e => e.name === exercise);
              return (
                <TouchableOpacity
                  key={exercise}
                  style={[styles.exerciseCard, selected && styles.exerciseCardSelected]}
                  onPress={() => toggleExercise(exercise)}
                >
                  <View style={styles.exerciseCardContent}>
                    <Text style={[styles.exerciseCardText, selected && styles.exerciseCardTextSelected]}>
                      {exercise}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={20} color="#00ffff" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Premium Message */}
        {!isPremium && (
          <View style={styles.premiumMessage}>
            <Ionicons name="lock-closed" size={20} color="#ff4444" />
            <Text style={styles.premiumText}>Upgrade to Premium to create custom workouts!</Text>
          </View>
        )}

        {/* Save Button */}
        <View style={styles.saveSection}>
          <TouchableOpacity
            style={[styles.saveButton, !isPremium && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!isPremium || saving}
          >
            {saving ? (
              <View style={styles.loadingContainer}>
                <Ionicons name="hourglass-outline" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Saving...</Text>
              </View>
            ) : (
              <View style={styles.saveButtonContent}>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Workout</Text>
                {!isPremium && (
                  <Ionicons name="lock-closed" size={20} color="#fff" style={{ marginLeft: 8 }} />
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  exitButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#00ffff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    borderRadius: 15,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedSection: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  clearText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedExercises: {
    gap: 10,
  },
  selectedExerciseCard: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  selectedExerciseInfo: {
    flex: 1,
  },
  selectedExerciseName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  setsRepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setsRepsInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    borderRadius: 8,
    padding: 6,
    fontSize: 14,
    textAlign: 'center',
    width: 50,
  },
  setsRepsText: {
    color: '#666',
    fontSize: 14,
  },
  removeButton: {
    padding: 5,
  },
  categoriesSection: {
    marginBottom: 30,
  },
  categoryTabs: {
    marginBottom: 20,
  },
  categoryTabsContent: {
    paddingHorizontal: 5,
  },
  categoryTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryTabActive: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    borderColor: '#00ffff',
  },
  categoryTabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryTabTextActive: {
    color: '#00ffff',
  },
  exercisesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  exerciseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    minWidth: '48%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  exerciseCardSelected: {
    backgroundColor: 'rgba(0, 255, 255, 0.15)',
    borderColor: '#00ffff',
  },
  exerciseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseCardText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  exerciseCardTextSelected: {
    color: '#00ffff',
  },
  premiumMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  premiumText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveSection: {
    marginBottom: 30,
  },
  saveButton: {
    backgroundColor: '#00ffff',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.7,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default CreateWorkoutScreen; 