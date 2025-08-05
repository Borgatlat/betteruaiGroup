import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function EditWorkoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workout, setWorkout] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [exerciseCount, setExerciseCount] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchWorkout();
  }, [id]);

  const fetchWorkout = async () => {
    try {
      const { data, error } = await supabase
        .from('user_workout_logs')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setWorkout(data);
      setName(data.workout_name || '');
      setDescription(data.description || '');
      setDuration(data.duration?.toString() || '');
      setExerciseCount(data.exercise_count?.toString() || '');
      setPhotoUrl(data.photo_url || null);
    } catch (error) {
      console.error('Error fetching workout:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photos to add workout photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || !result.assets[0]?.uri) return;

      setUploading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: result.assets[0].uri,
        type: 'image/jpeg',
        name: 'workout.jpg',
      });
      formData.append('upload_preset', 'profilepics');
      const cloudinaryUrl = 'https://api.cloudinary.com/v1_1/derqwaq9h/image/upload';
      
      const response = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      if (!data.secure_url) throw new Error('Upload failed');
      
      setPhotoUrl(data.secure_url);
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    try {
      setUploading(true);
      const { error } = await supabase
        .from('user_workout_logs')
        .update({ photo_url: null })
        .eq('id', id);

      if (error) throw error;
      setPhotoUrl(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      Alert.alert('Error', 'Failed to delete photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        workout_name: name,
        description: description,
        duration: duration ? parseInt(duration) : null,
        exercise_count: exerciseCount ? parseInt(exerciseCount) : null,
        photo_url: photoUrl,
      };

      const { error } = await supabase
        .from('user_workout_logs')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      router.back();
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#00ffff" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#00ffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Workout</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Workout Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter workout name"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add a description..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="0"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Exercise Count</Text>
            <TextInput
              style={styles.input}
              value={exerciseCount}
              onChangeText={setExerciseCount}
              placeholder="0"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Workout Photo</Text>
          <TouchableOpacity 
            style={styles.photoButton}
            onPress={handlePhotoUpload}
            disabled={uploading}
          >
            {photoUrl ? (
              <View style={styles.photoContainer}>
                <Image 
                  source={{ uri: photoUrl }} 
                  style={styles.workoutPhoto}
                  resizeMode="cover"
                />
                <View style={styles.photoOverlay}>
                  <TouchableOpacity 
                    style={styles.photoActionButton}
                    onPress={handlePhotoUpload}
                  >
                    <Ionicons name="camera" size={24} color="#fff" />
                    <Text style={styles.photoActionText}>Change Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.photoActionButton, styles.deleteButton]}
                    onPress={handleDeletePhoto}
                    disabled={uploading}
                  >
                    <Ionicons name="trash" size={24} color="#fff" />
                    <Text style={styles.photoActionText}>
                      {uploading ? 'Deleting...' : 'Delete Photo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                {uploading ? (
                  <ActivityIndicator color="#00ffff" size="large" />
                ) : (
                  <>
                    <Ionicons name="camera" size={32} color="#00ffff" />
                    <Text style={styles.photoButtonText}>Add Photo</Text>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#111" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ffff',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#00ffff',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#00ffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#111',
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoSection: {
    marginBottom: 24,
  },
  photoButton: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    marginTop: 8,
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
  },
  workoutPhoto: {
    width: '100%',
    height: '100%',
  },
  photoButtonText: {
    color: '#00ffff',
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#00ffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  photoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 0, 85, 0.2)',
  },
  photoActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
}); 