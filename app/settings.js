import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, TextInput, Modal, Linking, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUnits } from '../context/UnitsContext';
import { useTracking } from '../context/TrackingContext';
import { useUser } from '../context/UserContext';
import PremiumFeature from './components/PremiumFeature';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';
import { useSettings } from '../context/SettingsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SettingsScreen = () => {
  const router = useRouter();
  const { signOut, isPremium } = useAuth();
  const { useImperial, toggleUnits } = useUnits();
  const { calories, water, updateGoal } = useTracking();
  const insets = useSafeAreaInsets(); // Hook to get device-specific safe area insets
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleBackToProfile = () => {
    router.replace('/(tabs)/profile');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleGoalEdit = async (type, value) => {
    try {
      // For water, allow up to 1 decimal place
      const numValue = type === 'water' 
        ? parseFloat(parseFloat(value).toFixed(1))
        : parseInt(value);
        
      if (isNaN(numValue) || numValue <= 0) {
        Alert.alert('Invalid Value', 'Please enter a valid number greater than 0');
        return;
      }

      await updateGoal(type, numValue);
      setEditingField(null);
      setEditValue('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update goal');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBackToProfile}
        >
          <Ionicons name="chevron-back" size={24} color="#00ffff" />
          <Text style={styles.backButtonText}>Back to Profile</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Go Premium button for free users */}
      {!isPremium && (
        <TouchableOpacity
          style={{
            backgroundColor: '#00ffff',
            borderRadius: 10,
            padding: 14,
            alignItems: 'center',
            marginBottom: 20,
            marginHorizontal: 20,
          }}
          onPress={() => router.push('/purchase-subscription')}
        >
          <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 18 }}>Go Premium</Text>
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Use Imperial Units</Text>
            <Switch
              value={useImperial}
              onValueChange={toggleUnits}
              trackColor={{ false: '#333', true: '#00ffff50' }}
              thumbColor={useImperial ? '#00ffff' : '#666'}
            />
          </View>

          <View style={[styles.settingRow, styles.settingRowWithBorder, { flexDirection: 'column', alignItems: 'flex-start' }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Calorie Goal</Text>
                <Text style={styles.settingValue}>{calories.goal} cal</Text>
              </View>
              <View style={{ position: 'relative', width: 35, height: 35 }}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    if (isPremium) {
                      setEditingField('calorie_goal');
                      setEditValue(calories.goal.toString());
                    }
                  }}
                  disabled={!isPremium}
                >
                  <Ionicons name="pencil" size={20} color="#00ffff" />
                </TouchableOpacity>
                {!isPremium && (
                  <View style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    borderRadius: 17.5,
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    pointerEvents: 'auto',
                  }}>
                    <Ionicons name="lock-closed" size={28} color="#fff" style={{ opacity: 0.85 }} />
                  </View>
                )}
              </View>
            </View>
            {!isPremium && (
              <Text style={{ color: '#ff4444', fontSize: 13, textAlign: 'center', marginTop: 8, alignSelf: 'center', width: '100%', fontWeight: '500', letterSpacing: 0.1 }}>
                Upgrade to Premium in the settings
              </Text>
            )}
          </View>

          <View style={[styles.settingRow, styles.settingRowWithBorder, { flexDirection: 'column', alignItems: 'flex-start' }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Water Goal</Text>
                <Text style={styles.settingValue}>{water.goal} L</Text>
              </View>
              <View style={{ position: 'relative', width: 35, height: 35 }}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    if (isPremium) {
                      setEditingField('water_goal');
                      setEditValue(water.goal.toString());
                    }
                  }}
                  disabled={!isPremium}
                >
                  <Ionicons name="pencil" size={20} color="#00ffff" />
                </TouchableOpacity>
                {!isPremium && (
                  <View style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    borderRadius: 17.5,
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    pointerEvents: 'auto',
                  }}>
                    <Ionicons name="lock-closed" size={28} color="#fff" style={{ opacity: 0.85 }} />
                  </View>
                )}
              </View>
            </View>
            {!isPremium && (
              <Text style={{ color: '#ff4444', fontSize: 13, textAlign: 'center', marginTop: 8, alignSelf: 'center', width: '100%', fontWeight: '500', letterSpacing: 0.1 }}>
                Upgrade to Premium in the settings
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.settingButton}
              onPress={handleSignOut}
            >
              <Text style={styles.dangerText}>Sign Out</Text>
              <Ionicons name="log-out-outline" size={20} color="#ff4444" />
            </TouchableOpacity>
        </View>
      </View>

      {editingField && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setEditingField(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingField === 'calorie_goal' ? 'Edit Calorie Goal' : 'Edit Water Goal'}
              </Text>
              <View style={styles.modalInputContainer}>
                <TextInput
                  style={styles.modalInput}
                  value={editValue}
                  onChangeText={setEditValue}
                  keyboardType="decimal-pad"
                  placeholder={editingField === 'calorie_goal' ? 'Enter calorie goal' : 'Enter water goal'}
                  placeholderTextColor="#666"
                />
                <Text style={styles.modalInputLabel}>
                  {editingField === 'calorie_goal' ? 'calories' : 'L'}
                </Text>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setEditingField(null);
                    setEditValue('');
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={() => handleGoalEdit(
                    editingField === 'calorie_goal' ? 'calories' : 'water',
                    editValue
                  )}
                >
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  backButtonText: {
    color: '#00ffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: 'rgba(0, 255, 255, 0.03)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.3,
  },
  settingValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  editButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  dangerText: {
    fontSize: 16,
    color: '#ff4444',
    letterSpacing: 0.3,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalInput: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  modalInputLabel: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  saveButton: {
    backgroundColor: '#00ffff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingRowWithBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 10,
    paddingTop: 20,
  },
});

export default SettingsScreen; 