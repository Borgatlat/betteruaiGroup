"use client";

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTracking } from '../../context/TrackingContext';
import { supabase } from '../../lib/supabase';
import MoodGraph from '../components/MoodGraph';
import MentalSessionSummary from '../components/MentalSessionSummary';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const mentalSessions = {
  meditation: [
    {
      id: 'beginner_meditation',
      title: 'Beginner Meditation',
      duration: 10,
      description: 'A gentle introduction to meditation practices',
      steps: [
        'Find a comfortable seated position',
        'Close your eyes and take a few deep breaths',
        'Focus on your breath, noticing the sensation of air moving in and out',
        'When your mind wanders, gently bring your attention back to your breath',
        'Continue for the duration of the session'
      ]
    },
    {
      id: 'body_scan',
      title: 'Body Scan',
      duration: 15,
      description: 'A relaxing body awareness meditation',
      steps: [
        'Lie down in a comfortable position',
        'Bring awareness to your breath',
        'Gradually scan your body from toes to head',
        'Release tension in each part of your body',
        'Stay present with any sensations you notice'
      ]
    },
    {
      id: 'mindful_awareness',
      title: 'Mindful Awareness',
      duration: 20,
      description: 'Develop present moment awareness',
      steps: [
        'Find a quiet space and sit comfortably',
        'Focus on the present moment',
        'Notice thoughts without judgment',
        'Return attention to your breath',
        'Practice accepting each moment as it comes'
      ]
    }
  ],
  breathing: [
    {
      id: 'box_breathing',
      title: 'Box Breathing',
      duration: 5,
      description: 'A simple technique to calm your nervous system (also called Four-Square Breathing)',
      benefits: [
        'Stress reduction',
        'Improved focus',
        'Better oxygen exchange'
      ],
      steps: [
        'Inhale for 4 counts',
        'Hold for 4 counts',
        'Exhale for 4 counts',
        'Hold for 4 counts',
        'Repeat the cycle'
      ]
    },
    {
      id: '478_breathing',
      title: '4-7-8 Breathing',
      duration: 8,
      description: 'A breathing pattern to help you fall asleep',
      benefits: [
        'Better sleep',
        'Reduced anxiety',
        'Calming effect'
      ],
      steps: [
        'Inhale for 4 counts',
        'Hold for 7 counts',
        'Exhale for 8 counts',
        'Repeat the cycle'
      ]
    },
    {
      id: 'alternate_nostril',
      title: 'Alternate Nostril Breathing',
      duration: 5,
      description: 'Balances left and right brain, reduces stress, and boosts focus (Nadi Shodhana)',
      benefits: [
        'Mental clarity',
        'Stress relief',
        'Enhanced focus'
      ],
      steps: [
        'Close right nostril, inhale left',
        'Close left nostril, exhale right',
        'Inhale right nostril',
        'Close right, exhale left',
        'Repeat the cycle'
      ]
    }
  ]
};

const moodOptions = [
  { value: 'great', icon: 'sunny', color: '#FFD700' },
  { value: 'good', icon: 'partly-sunny', color: '#98FB98' },
  { value: 'okay', icon: 'cloud', color: '#87CEEB' },
  { value: 'bad', icon: 'rainy', color: '#A9A9A9' },
  { value: 'awful', icon: 'thunderstorm', color: '#FF6B6B' }
];

const MentalScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { updateMood, incrementStat, mood } = useTracking();
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionInProgress, setSessionInProgress] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [moodHistory, setMoodHistory] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const insets = useSafeAreaInsets(); // Hook to get device-specific safe area insets

  useEffect(() => {
    fetchMoodHistory();
  }, []);

  const fetchMoodHistory = async () => {
    try {
      if (!user) return;

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('mood_tracking')
        .select('*')
        .eq('profile_id', user.id)
        .gte('date', sevenDaysAgo.toISOString())
        .lte('date', now.toISOString())
        .order('date', { ascending: true });

      if (error) throw error;

      // Get the latest mood for each day
      const latestMoods = {};
      data?.forEach(mood => {
        const dateKey = new Date(mood.date).toISOString().split('T')[0];
        if (!latestMoods[dateKey] || new Date(mood.date) > new Date(latestMoods[dateKey].date)) {
          latestMoods[dateKey] = mood;
        }
      });

      // Convert to array and sort by date
      const sortedMoods = Object.values(latestMoods).sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );

      console.log('Fetched mood history:', sortedMoods);
      setMoodHistory(sortedMoods);
    } catch (error) {
      console.error('Error fetching mood history:', error);
    }
  };

  const handleMoodSelect = async (mood) => {
    try {
      if (!user) return;

      const now = new Date();

      // Always insert a new mood entry
      const { error: insertError } = await supabase
        .from('mood_tracking')
        .insert({
          profile_id: user.id,
          mood: mood,
          date: now.toISOString()
        });

      if (insertError) throw insertError;

      // Update local state and AsyncStorage
      await updateMood(mood);
      
      // Fetch updated mood history immediately
      await fetchMoodHistory();
      
      setShowMoodModal(false);
      Alert.alert('Mood Updated', `You're feeling ${mood} today. Taking care of your mental health is important!`);
    } catch (error) {
      console.error('Error logging mood:', error);
      Alert.alert('Error', 'Failed to log mood');
    }
  };

  const startSession = (session) => {
    router.push({
      pathname: '/active-mental-session',
      params: {
        id: session.id,
        title: session.title,
        duration: session.duration,
        description: session.description,
        steps: JSON.stringify(session.steps),
        session_type: session.type || 'meditation'
      }
    });
  };

  const handleSessionComplete = async () => {
    try {
      if (!user) return;

      // Save detailed log
      const { error: logError } = await supabase
        .from('mental_session_logs')
        .insert({
          profile_id: user.id,
          session_name: selectedSession.title,
          session_type: selectedSession.id,
          duration: selectedSession.duration,
          completed_at: new Date().toISOString()
        });

      if (logError) throw logError;

      // Increment mental sessions count
      await incrementStat('mentalSessions');
      
      setShowSessionModal(false);
      setSelectedSession(null);
      setSessionInProgress(false);
      Alert.alert('Session Complete', 'Great job completing your mental wellness session!');
    } catch (error) {
      console.error('Error saving session:', error);
      Alert.alert('Error', 'Failed to save session');
    }
  };

  const handleFinishSession = () => {
    if (activeSession) {
      router.push({
        pathname: '/mental-session-summary',
        params: {
          sessionType: activeSession.session_type,
          duration: activeSession.duration,
        },
      });
    }
  };

  const handleSaveSession = async (sessionData) => {
    try {
      if (!user) return;

      // Save detailed log
      const { error: logError } = await supabase
        .from('mental_session_logs')
        .insert({
            profile_id: user.id,
          session_name: sessionData.type === 'meditation' ? 'Meditation Session' : 'Breathing Exercise',
          session_type: sessionData.type,
            duration: sessionData.duration,
            calmness_level: sessionData.calmnessLevel,
            notes: sessionData.notes,
          completed_at: new Date().toISOString()
        });

      if (logError) throw logError;

      // Update stats
      await incrementStat('mental_sessions');
      
      return true;
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  };

  const categories = [
    {
      id: 'breathing',
      title: 'Breathing Exercises',
      icon: 'leaf',
      color: '#4CAF50',
      description: 'Calm your mind with guided breathing techniques',
      exercises: [
        {
          id: 'box-breathing',
          title: 'Box Breathing',
          duration: 5,
          session_type: 'breathing',
          description: 'A simple but powerful breathing technique used by Navy SEALs',
          steps: JSON.stringify([
            'Breathe in slowly for 4 counts',
            'Hold your breath for 4 counts',
            'Exhale slowly for 4 counts',
            'Hold empty lungs for 4 counts',
          ])
        },
        {
          id: '478-breathing',
          title: '4-7-8 Breathing',
          duration: 5,
          session_type: 'breathing',
          description: 'A relaxing breath pattern to reduce anxiety',
          steps: JSON.stringify([
            'Breathe in quietly through your nose for 4 counts',
            'Hold your breath for 7 counts',
            'Exhale forcefully through the mouth for 8 counts',
            'Repeat the cycle',
          ])
        }
      ]
    },
    {
      id: 'meditation',
      title: 'Meditation',
      icon: 'moon',
      color: '#9C27B0',
      description: 'Find peace with guided meditation sessions',
      exercises: [
        {
          id: 'body-scan',
          title: 'Body Scan',
          duration: 10,
          session_type: 'meditation',
          description: 'Progressive relaxation through body awareness',
          steps: JSON.stringify([
            'Focus on your breath',
            'Notice sensations in your feet',
            'Move attention up through your legs',
            'Continue scanning up through your body',
            'Notice any areas of tension',
            'Release tension with each exhale',
          ])
        },
        {
          id: 'mindful-meditation',
          title: 'Mindful Meditation',
          duration: 10,
          session_type: 'meditation',
          description: 'Present moment awareness practice',
          steps: JSON.stringify([
            'Find a comfortable position',
            'Focus on your natural breath',
            'Notice thoughts without judgment',
            'Gently return focus to breath',
            'Expand awareness to sounds',
            'Include bodily sensations',
          ])
        }
      ]
    },
    {
      id: 'stress-relief',
      title: 'Stress Relief',
      icon: 'water',
      color: '#2196F3',
      description: 'Quick exercises to reduce stress and anxiety',
      exercises: [
        {
          id: 'progressive-relaxation',
          title: 'Progressive Relaxation',
          duration: 8,
          session_type: 'stress-relief',
          description: 'Release physical tension through muscle relaxation',
          steps: JSON.stringify([
            'Tense your feet for 5 seconds',
            'Release and feel the relaxation',
            'Move to your calves',
            'Continue with each muscle group',
            'Notice the feeling of relaxation',
            'Breathe deeply and slowly',
          ])
        },
        {
          id: 'visualization',
          title: 'Peaceful Place',
          duration: 8,
          session_type: 'stress-relief',
          description: 'Visualize a calm and peaceful place',
          steps: JSON.stringify([
            'Close your eyes gently',
            'Imagine a peaceful place',
            'Notice the colors and shapes',
            'Add sounds to your scene',
            'Feel the temperature',
            'Immerse in the peaceful feeling',
          ])
        }
      ]
    }
  ];

  const handleCategoryPress = (category) => {
    router.push({
      pathname: '/category-exercises',
      params: {
        title: category.title,
        exercises: JSON.stringify(category.exercises),
        color: category.color
      }
    });
  };

  // Add useEffect to refresh mood history when mood changes
  useEffect(() => {
    if (mood) {
      fetchMoodHistory();
    }
  }, [mood]);

  if (showSummary) {
    return (
      <MentalSessionSummary 
        sessionData={currentSession}
        onSave={handleSaveSession}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: Math.max(20, insets.bottom + 20) }}>
      <Text style={styles.title}>Mental Wellness</Text>
      
      <TouchableOpacity
        style={styles.sessionLogButton}
        onPress={() => router.push('/mental-session-log')}
      >
        <Ionicons name="time-outline" size={24} color="#fff" />
        <Text style={styles.sessionLogButtonText}>Session History</Text>
      </TouchableOpacity>

      {activeSession ? (
        <View style={styles.activeSessionContainer}>
          <Text style={styles.activeSessionTitle}>
            {activeSession.session_type === 'meditation' ? 'Meditation' : 'Breathing Exercise'}
          </Text>
          <Text style={styles.timer}>{formatTime(remainingTime)}</Text>
          <TouchableOpacity
            style={styles.finishButton}
            onPress={handleFinishSession}
          >
            <Text style={styles.finishButtonText}>Finish Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose your practice</Text>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryCard, { backgroundColor: `${category.color}15` }]}
                onPress={() => handleCategoryPress(category)}
              >
                <View style={[styles.iconContainer, { backgroundColor: category.color }]}>
                  <Ionicons name={category.icon} size={24} color="#fff" />
                </View>
                <View style={styles.categoryContent}>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={category.color} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Mood Tracking */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How are you feeling today?</Text>
            <TouchableOpacity 
              style={styles.moodButton}
              onPress={() => setShowMoodModal(true)}
            >
              <Text style={styles.moodButtonText}>Track Your Mood</Text>
              <Ionicons name="add-circle-outline" size={24} color="#00ffff" />
            </TouchableOpacity>

            {/* Mood Graph */}
            <MoodGraph moodHistory={moodHistory} />

            {/* Mood History */}
            <View style={styles.moodHistory}>
              <View style={styles.moodHistoryHeader}>
                <Text style={styles.moodHistoryTitle}>Recent Moods</Text>
                <TouchableOpacity onPress={() => router.push('/mood-history')}>
                  <Text style={styles.seeMoreText}>See More</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.moodHistoryList}
              >
                {moodHistory.map((entry, index) => (
                  <View key={index} style={styles.moodHistoryItem}>
                    <Ionicons 
                      name={moodOptions.find(m => m.value === entry.mood)?.icon || 'help-circle'} 
                      size={24} 
                      color={moodOptions.find(m => m.value === entry.mood)?.color || '#fff'} 
                    />
                    <Text style={styles.moodHistoryDate}>
                      {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Mental Health Resources */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mental Health Resources</Text>
            <TouchableOpacity style={styles.resourceCard} onPress={() => Linking.openURL('https://www.who.int/news-room/fact-sheets/detail/adolescent-mental-health')}>
              <Ionicons name="document-text" size={24} color="#00ffff" />
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>Mental Health Articles</Text>
                <Text style={styles.resourceDescription}>Read expert articles on mental wellness topics</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.resourceCard} onPress={() => Linking.openURL('https://www.samhsa.gov/')}>
              <Ionicons name="call" size={24} color="#ff4444" />
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>Crisis Support</Text>
                <Text style={styles.resourceDescription}>Access emergency mental health resources</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.resourceCard} onPress={() => Linking.openURL('https://www.psychologytoday.com/us/therapists')}>
              <Ionicons name="people" size={24} color="#44ff44" />
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>Find a Therapist</Text>
                <Text style={styles.resourceDescription}>Connect with mental health professionals</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Mood Selection Modal */}
      <Modal
        visible={showMoodModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>How are you feeling?</Text>
            <View style={styles.moodOptions}>
              {moodOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.moodOption}
                  onPress={() => handleMoodSelect(option.value)}
                >
                  <Ionicons name={option.icon} size={40} color={option.color} />
                  <Text style={styles.moodOptionText}>
                    {option.value.charAt(0).toUpperCase() + option.value.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowMoodModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 60,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 255, 255, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
  },
  moodButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.03)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  moodButtonText: {
    color: '#00ffff',
    fontSize: 16,
    fontWeight: '600',
  },
  moodHistory: {
    marginTop: 20,
  },
  moodHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  moodHistoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  seeMoreText: {
    color: '#00ffff',
    fontSize: 14,
  },
  moodHistoryList: {
    flexDirection: 'row',
  },
  moodHistoryItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  moodHistoryDate: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  resourceContent: {
    flex: 1,
    marginLeft: 15,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#666',
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
    padding: 20,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  moodOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  moodOption: {
    alignItems: 'center',
    margin: 10,
  },
  moodOptionText: {
    color: '#fff',
    marginTop: 5,
  },
  modalCloseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
  },
  stepsContainer: {
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  stepText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  startSessionButton: {
    backgroundColor: '#00ffff',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  startSessionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeSessionButton: {
    backgroundColor: '#44ff44',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  completeSessionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  finishButton: {
    backgroundColor: '#00ffff',
    padding: 8,
    borderRadius: 5,
    marginLeft: 'auto',
  },
  finishButtonText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  sessionLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sessionLogButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  activeSessionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  activeSessionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00ffff',
    marginBottom: 20,
  },
});

export default MentalScreen; 