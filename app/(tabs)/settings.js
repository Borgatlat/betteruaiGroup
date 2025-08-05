import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, TextInput, Modal, Linking, ScrollView, Platform, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUnits } from '../../context/UnitsContext';
import { useTracking } from '../../context/TrackingContext';
import { useUser } from '../../context/UserContext';
import PremiumFeature from '../components/PremiumFeature';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../context/SettingsContext';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const STREAK_NOTIFICATION_ID_KEY = 'streakNotificationId';

const SettingsScreen = () => {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { isPremium } = useUser();
  const { useImperial, toggleUnits } = useUnits();
  const { calories, water, updateGoal } = useTracking();
  const { settings, updateSettings } = useSettings();
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date(0, 0, 0, 8, 0)); // 8:00 am default
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [restTimeSeconds, setRestTimeSeconds] = useState(60);
  const [showRestPicker, setShowRestPicker] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [subscription, setSubscription] = useState(null);

  console.warn('[SettingsScreen] isPremium:', isPremium);

  // Load saved settings on mount
  useEffect(() => {
    (async () => {
      try {
        const reminders = await AsyncStorage.getItem('daily_reminders');
        if (reminders !== null) setNotificationsEnabled(JSON.parse(reminders));
        const rest = await AsyncStorage.getItem('rest_time_seconds');
        if (rest !== null) setRestTimeSeconds(Number(rest));
      } catch (e) {}
    })();
  }, []);

  // Load subscription data
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user?.id)
          .eq('status', 'active')
          .single();

        if (error) {
          console.error('Error loading subscription:', error);
          return;
        }

        setSubscription(data);
      } catch (error) {
        console.error('Error in loadSubscription:', error);
      }
    };

    if (user?.id) {
      loadSubscription();
    }
  }, [user?.id]);

  // Save settings when changed
  const handleSettingsChange = async (key, value) => {
    try {
      if (key === 'daily_reminders') {
        setNotificationsEnabled(value);
        await AsyncStorage.setItem('daily_reminders', JSON.stringify(value));
      } else if (key === 'rest_time_seconds') {
        setRestTimeSeconds(value);
        await AsyncStorage.setItem('rest_time_seconds', value.toString());
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  // Handle rest time change
  const handleRestTimeChange = async (seconds) => {
    try {
      setRestTimeSeconds(seconds);
      // Update in settings context
      const settingsResult = await updateSettings({ rest_time_seconds: seconds });
      if (!settingsResult.success) {
        throw new Error(settingsResult.error || 'Failed to update settings');
      }
      // Also save to AsyncStorage directly as backup
      await AsyncStorage.setItem('rest_time_seconds', seconds.toString());
    } catch (error) {
      console.error('Error updating rest time:', error);
      Alert.alert('Error', 'Failed to update rest time. Please try again.');
    }
  };

  // Handle notifications toggle
  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Enable notifications in your device settings.');
        return;
      }
      setNotificationsEnabled(true);
      await handleSettingsChange('daily_reminders', true);
      // await scheduleStreakNotification();
    } else {
      setNotificationsEnabled(false);
      await handleSettingsChange('daily_reminders', false);
      // Cancel streak notification when disabling
      const existingId = await AsyncStorage.getItem(STREAK_NOTIFICATION_ID_KEY);
      if (existingId) {
        await Notifications.cancelScheduledNotificationAsync(existingId);
      }
    }
  };

  // Handle units toggle
  const handleToggleUnits = async () => {
    const newValue = !useImperial;
    await toggleUnits(newValue);
  };

  const handleBackToProfile = () => {
    router.replace('/(tabs)/profile');
  };

  const handleSubscriptionManagement = async () => {
    if (isPremium) {
      // For premium users, open Apple's subscription management page
      try {
        const supported = await Linking.canOpenURL('https://apps.apple.com/account/subscriptions');
        if (supported) {
          await Linking.openURL('https://apps.apple.com/account/subscriptions');
        } else {
          Alert.alert(
            'Subscription Management',
            'To manage your subscription:\n\n1. Open the App Store\n2. Tap your profile icon\n3. Tap "Subscriptions"\n4. Find BetterU and manage your subscription',
            [
              { text: 'Open App Store', onPress: () => Linking.openURL('https://apps.apple.com') },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }
      } catch (error) {
        console.error('Error opening subscription management:', error);
        Alert.alert(
          'Subscription Management',
          'To manage your subscription:\n\n1. Open the App Store\n2. Tap your profile icon\n3. Tap "Subscriptions"\n4. Find BetterU and manage your subscription',
          [{ text: 'OK' }]
        );
      }
    } else {
      // For non-premium users, go to purchase screen
      router.push('/purchase-subscription');
    }
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
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) {
        Alert.alert('Invalid Value', 'Please enter a valid number greater than 0');
        return;
      }

      // Update in tracking context
      const result = await updateGoal(type, numValue);
      if (!result) {
        throw new Error('Failed to update goal in tracking context');
      }

      // Update in settings context
      const settingKey = type === 'calories' ? 'calorie_goal' : 'water_goal_ml';
      const settingsResult = await updateSettings({ [settingKey]: numValue });
      
      if (!settingsResult.success) {
        throw new Error(settingsResult.error || 'Failed to update settings');
      }

      // Save to AsyncStorage directly as backup
      const storageKey = type === 'calories' ? 'calorie_goal' : 'water_goal_ml';
      await AsyncStorage.setItem(storageKey, numValue.toString());
      
      setEditingField(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating goal:', error);
      Alert.alert('Error', 'Failed to update goal. Please try again.');
    }
  };

  // Helper to format rest time
  const formatRestTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Schedules a daily streak notification at 6pm
  const scheduleStreakNotification = async () => {
    try {
      // Cancel any existing streak notification
      const existingId = await AsyncStorage.getItem(STREAK_NOTIFICATION_ID_KEY);
      if (existingId) {
        await Notifications.cancelScheduledNotificationAsync(existingId);
      }

      if (!notificationsEnabled) return;

      // Schedule for 6pm every day
      const trigger = {
        hour: 18,
        minute: 0,
        repeats: true,
      };

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'BetterU Streak Reminder',
          body: 'Don\'t forget to complete your daily workout and mental session to keep your streak alive!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
      });
      await AsyncStorage.setItem(STREAK_NOTIFICATION_ID_KEY, id);
      console.log('Scheduled streak notification with ID:', id);
    } catch (error) {
      console.error('Error scheduling streak notification:', error);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBackToProfile}
        >
          <Ionicons name="chevron-back" size={24} color="#00ffff" />
          <Text style={styles.backButtonText}>Back to Profile</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Subscription Management button */}
      <TouchableOpacity
        style={styles.premiumButton}
        onPress={handleSubscriptionManagement}
      >
        <View style={styles.premiumButtonContent}>
          <Ionicons 
            name={isPremium ? "settings-outline" : "diamond-outline"} 
            size={20} 
            color={isPremium ? "#000" : "#000"} 
            style={{ marginRight: 8 }}
          />
          <Text style={styles.premiumButtonText}>
            {isPremium ? 'Manage Subscription' : 'Go Premium'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Subscription Status Section */}
      {isPremium && subscription && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Plan Type</Text>
                <Text style={styles.settingValue}>
                  {subscription.plan_type === 'monthly' ? 'Monthly' : 'Yearly'}
                </Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Subscription Management Info for Premium Users */}
      {isPremium && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription Management</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={20} color="#00ffff" />
              <Text style={styles.infoText}>
                Tap "Manage Subscription" above to access Apple's subscription settings where you can cancel, change plans, or update payment methods.
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Use Imperial Units</Text>
            <Switch
              value={useImperial}
              onValueChange={handleToggleUnits}
              trackColor={{ false: '#333', true: '#00ffff50' }}
              thumbColor={useImperial ? '#00ffff' : '#666'}
            />
          </View>

          <View style={[styles.settingRow, styles.settingRowWithBorder]}> 
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Calorie Goal</Text>
              <Text style={styles.settingValue}>{calories.goal} cal</Text>
            </View>
            <View style={styles.editButtonContainer}>
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
                <View style={styles.lockOverlay}>
                  <Ionicons name="lock-closed" size={28} color="#fff" style={{ opacity: 0.85 }} />
                </View>
              )}
            </View>
          </View>

          <View style={[styles.settingRow, styles.settingRowWithBorder]}> 
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Water Goal</Text>
              <Text style={styles.settingValue}>{water.goal} L</Text>
            </View>
            <View style={styles.editButtonContainer}>
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
                <View style={styles.lockOverlay}>
                  <Ionicons name="lock-closed" size={28} color="#fff" style={{ opacity: 0.85 }} />
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reminders</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Daily Workout & Mental Reminder</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#333', true: '#00ffff50' }}
              thumbColor={notificationsEnabled ? '#00ffff' : '#666'}
            />
          </View>
          {notificationsEnabled && (
            <>
              <TouchableOpacity
                style={{ marginTop: 10, alignItems: 'center' }}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={{ color: '#00ffff', fontWeight: 'bold', fontSize: 16 }}>
                  Reminder Time: {reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  marginTop: 16,
                  backgroundColor: '#00ffff',
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#00ffff',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 2,
                }}
                onPress={async () => {
                  const id = await Notifications.scheduleNotificationAsync({
                    content: {
                      title: 'Test Notification',
                      body: 'This is a test notification from BetterU!',
                      sound: true,
                    },
                    trigger: null,
                  });
                  console.log('Test notification scheduled with ID:', id);
                  Alert.alert('Notification Sent', 'Check your device notifications.');
                }}
              >
                <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>Test Send Notification</Text>
              </TouchableOpacity>
            </>
          )}
          {showTimePicker && (
            <DateTimePicker
              value={reminderTime}
              mode="time"
              is24Hour={false}
              display="spinner"
              textColor="#fff"
              onChange={(event, selectedDate) => {
                setShowTimePicker(false);
                if (event.type === 'set' && selectedDate) {
                  setReminderTime(selectedDate);
                }
              }}
            />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workout Preferences</Text>
        <View style={styles.card}>
          <View style={styles.modernSettingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Rest Time Between Sets</Text>
              <View style={styles.modernValueContainer}>
                <Ionicons name="timer-outline" size={16} color="#00ffff" style={{ marginRight: 8 }} />
                <Text style={styles.modernSettingValue}>{formatRestTime(restTimeSeconds)}</Text>
              </View>
            </View>
            <View style={styles.modernEditButtonContainer}>
              <TouchableOpacity
                style={styles.modernEditButton}
                onPress={() => {
                  if (!isPremium) {
                    Alert.alert(
                      'Premium Feature',
                      'Upgrade to Premium to customize your rest timer!',
                      [{ text: 'OK' }]
                    );
                    return;
                  }
                  setShowRestPicker(true);
                }}
                disabled={!isPremium}
              >
                <Ionicons name="pencil" size={18} color="#00ffff" />
              </TouchableOpacity>
              {!isPremium && (
                <View style={styles.modernLockOverlay}>
                  <View style={styles.modernLockContainer}>
                    <Ionicons name="lock-closed" size={20} color="#fff" />
                  </View>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.settingValue}>
            {isPremium 
              ? "This rest time will be used for all workouts."
              : "Upgrade to Premium to customize your rest timer."
            }
          </Text>
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
          
          <TouchableOpacity 
            style={[styles.settingButton, { marginTop: 16, backgroundColor: 'rgba(255, 68, 68, 0.1)' }]}
            onPress={() => {
              Alert.alert(
                'Delete Account',
                'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => setShowPasswordModal(true)
                  }
                ]
              );
            }}
          >
            <Text style={[styles.dangerText, { color: '#ff4444' }]}>Delete Account</Text>
            <Ionicons name="trash-outline" size={20} color="#ff4444" />
          </TouchableOpacity>
          
          {/* Feedback Button */}
          <TouchableOpacity
            style={[styles.settingButton, { marginTop: 16, backgroundColor: '#00ffff20', borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => Linking.openURL('https://docs.google.com/forms/d/e/1FAIpQLScqC-Un8Nisy7W1iGYTIvjUmMr4iZyEMLJ-hfv53OsNvzHmfg/viewform?usp=dialog')}
          >
            <Ionicons name="chatbox-ellipses-outline" size={20} color="#00ffff" style={{ marginRight: 8 }} />
            <Text style={{ color: '#00ffff', fontWeight: 'bold', fontSize: 16 }}>Send Feedback</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Legal Section - Separate from Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.card}>
          <View style={styles.legalLinksContainer}>
            <TouchableOpacity 
              style={styles.legalLink}
              onPress={() => Linking.openURL('https://www.betteruai.com/terms-of-service')}
            >
              <View style={styles.legalLinkContent}>
                <Ionicons name="document-text-outline" size={20} color="#00ffff" />
                <Text style={styles.legalLinkText}>Terms of Service</Text>
              </View>
              <Ionicons name="open-outline" size={16} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.legalLink}
              onPress={() => Linking.openURL('https://www.betteruai.com/privacy-policy')}
            >
              <View style={styles.legalLinkContent}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#00ffff" />
                <Text style={styles.legalLinkText}>Privacy Policy</Text>
              </View>
              <Ionicons name="open-outline" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {editingField && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setEditingField(null)}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { alignItems: 'center', padding: 20 }]}>
              <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingField === 'calorie_goal' ? 'Edit Calorie Goal' : 'Edit Water Goal'}
              </Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setEditingField(null)}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={parseInt(editValue)}
                  onValueChange={(value) => setEditValue(value.toString())}
                  style={{ width: 200, color: '#fff', backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#222' }}
                  itemStyle={{ color: '#fff', fontSize: 22 }}
                >
                  {editingField === 'calorie_goal' ? (
                    // Calorie options from 1000 to 5000 in steps of 100
                    [...Array(41)].map((_, i) => {
                      const value = 1000 + (i * 100);
                      return <Picker.Item key={value} label={`${value} cal`} value={value} />;
                    })
                  ) : (
                    // Water options from 1L to 5L in steps of 0.5L
                    [...Array(9)].map((_, i) => {
                      const value = 1 + (i * 0.5);
                      return <Picker.Item key={value} label={`${value} L`} value={value} />;
                    })
                  )}
                </Picker>
              </View>
                <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { marginTop: 20, width: '100%' }]} 
                onPress={() => {
                  handleGoalEdit(
                    editingField === 'calorie_goal' ? 'calories' : 'water',
                    editValue
                  );
                  setEditingField(null);
                }}
                >
                <Text style={[styles.buttonText, { color: '#000' }]}>Save</Text>
                </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <Modal visible={showRestPicker} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { alignItems: 'center', padding: 20 }]}> 
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Rest Time</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowRestPicker(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={restTimeSeconds}
                onValueChange={handleRestTimeChange}
                style={{ width: 200, color: '#fff', backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#222' }}
                itemStyle={{ color: '#fff', fontSize: 22 }}
              >
                {[...Array(19)].map((_, i) => {
                  const val = 30 + i * 15;
                  return <Picker.Item key={val} label={formatRestTime(val)} value={val} />;
                })}
              </Picker>
            </View>
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton, { marginTop: 20, width: '100%' }]} 
              onPress={() => setShowRestPicker(false)}
            >
              <Text style={[styles.buttonText, { color: '#000' }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modern Password Confirmation Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowPasswordModal(false);
          setPassword('');
        }}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modernModalContent}>
            {/* Warning Icon */}
            <View style={styles.warningIconContainer}>
              <Ionicons name="warning" size={32} color="#ff4444" />
            </View>
            
            {/* Header */}
            <View style={styles.modernModalHeader}>
              <Text style={styles.modernModalTitle}>Delete Account</Text>
              <TouchableOpacity
                style={styles.modernCloseButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                }}
              >
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            
            {/* Warning Message */}
            <View style={styles.warningMessage}>
              <Text style={styles.warningTitle}>This action cannot be undone</Text>
              <Text style={styles.warningText}>
                Deleting your account will permanently remove all your data, including:
              </Text>
              <View style={styles.warningList}>
                <View style={styles.warningItem}>
                  <Ionicons name="remove-circle" size={16} color="#ff4444" />
                  <Text style={styles.warningItemText}>Workout history and progress</Text>
                </View>
                <View style={styles.warningItem}>
                  <Ionicons name="remove-circle" size={16} color="#ff4444" />
                  <Text style={styles.warningItemText}>Personal records and achievements</Text>
                </View>
                <View style={styles.warningItem}>
                  <Ionicons name="remove-circle" size={16} color="#ff4444" />
                  <Text style={styles.warningItemText}>Subscription and premium status</Text>
                </View>
                <View style={styles.warningItem}>
                  <Ionicons name="remove-circle" size={16} color="#ff4444" />
                  <Text style={styles.warningItemText}>Profile and settings</Text>
                </View>
              </View>
            </View>
            
            {/* Password Input */}
            <View style={styles.passwordSection}>
              <Text style={styles.passwordLabel}>Enter your password to confirm</Text>
              <TextInput
                style={styles.modernInput}
                placeholder="Your password"
                placeholderTextColor="#666"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
              />
            </View>
            
            {/* Action Buttons */}
            <View style={styles.modernButtonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                }}
                disabled={isDeleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  { opacity: isDeleting ? 0.7 : 1 }
                ]}
                onPress={async () => {
                  if (!password) {
                    Alert.alert('Error', 'Please enter your password');
                    return;
                  }
                  
                  setIsDeleting(true);
                  try {
                    // First verify the password
                    const { error: signInError } = await supabase.auth.signInWithPassword({
                      email: user.email,
                      password: password
                    });
                    
                    if (signInError) {
                      throw new Error('Invalid password');
                    }
                    
                    // If password is correct, proceed with account deletion
                    const { error: deleteError } = await supabase.rpc('delete_user_account');
                    if (deleteError) throw deleteError;
                    
                    await signOut();
                    router.replace('/(auth)/login');
                  } catch (error) {
                    console.error('Error:', error);
                    Alert.alert(
                      'Error',
                      error.message === 'Invalid password' 
                        ? 'Incorrect password. Please try again.'
                        : 'Failed to delete account. Please try again later.'
                    );
                  } finally {
                    setIsDeleting(false);
                    setShowPasswordModal(false);
                    setPassword('');
                  }
                }}
                disabled={isDeleting}
              >
                <View style={styles.deleteButtonContent}>
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="trash" size={18} color="#fff" />
                  )}
                  <Text style={styles.deleteButtonText}>
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 60,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  premiumButton: {
    backgroundColor: '#00ffff',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
    marginHorizontal: 20,
  },
  premiumButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
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
  editButtonContainer: {
    position: 'relative',
    width: 35,
    height: 35,
  },
  editButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockOverlay: {
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
  },
  settingRowWithBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 10,
    paddingTop: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 5,
  },
  pickerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 10,
    width: '100%',
    alignItems: 'center',
  },
  modalButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#00ffff',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  dangerText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  input: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    width: '100%',
    fontSize: 16,
  },
  modalText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  // Modern Modal Styles
  modernModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  warningIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modernModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modernModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  modernCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  warningMessage: {
    marginBottom: 24,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  warningList: {
    gap: 8,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningItemText: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },
  passwordSection: {
    marginBottom: 24,
  },
  passwordLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  modernInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modernButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ff4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modern Legal Section Styles
  legalLinksContainer: {
    backgroundColor: 'rgba(0, 255, 255, 0.03)',
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
    gap: 12,
  },
  legalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  legalLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legalLinkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  // Modern Rest Timer Styles
  modernSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
    marginBottom: 12,
  },
  modernValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  modernSettingValue: {
    color: '#00ffff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modernEditButtonContainer: {
    position: 'relative',
  },
  modernEditButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modernLockOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  modernLockContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export default SettingsScreen; 