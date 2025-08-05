import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Animated,
  Dimensions,
  Share,
  Vibration
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import { PremiumAvatar } from '../app/components/PremiumAvatar';
import { getChallengeLeaderboard, updateProgress } from '../utils/challengeRecommendationEngine';

const { width, height } = Dimensions.get('window');

const ChallengeDetails = ({ challenge, visible, onClose, onJoin, onLeave }) => {
  const { userProfile } = useUser();
  const [isJoined, setIsJoined] = useState(false);
  const [userProgress, setUserProgress] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  // Animation values
  const slideAnim = useState(new Animated.Value(height))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Load challenge data
  useEffect(() => {
    if (visible && challenge) {
      loadChallengeData();
      animateIn();
    }
  }, [visible, challenge]);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const loadChallengeData = async () => {
    if (!challenge || !userProfile) return;

    setLoading(true);
    try {
      // Check if user is participating
      const { data: participation } = await supabase
        .from('challenge_participants')
        .select('*')
        .eq('challenge_id', challenge.id)
        .eq('user_id', userProfile.id)
        .single();

      setIsJoined(!!participation);
      setUserProgress(participation?.progress || 0);

      // Load leaderboard
      const leaderboardData = await getChallengeLeaderboard(challenge.id, 20);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error loading challenge data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChallenge = async () => {
    if (!userProfile?.id) {
      Alert.alert('Error', 'Please log in to join challenges');
      return;
    }

    Vibration.vibrate(50);
    setLoading(true);

    try {
      const { error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challenge.id,
          user_id: userProfile.id,
          joined_at: new Date().toISOString(),
          progress: 0
        });

      if (error) throw error;

      setIsJoined(true);
      setUserProgress(0);
      onJoin?.(challenge.id);
      Alert.alert('Success', `You joined "${challenge.title}"!`);
    } catch (error) {
      console.error('Error joining challenge:', error);
      Alert.alert('Error', 'Failed to join challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveChallenge = async () => {
    Vibration.vibrate(50);
    setLoading(true);

    try {
      const { error } = await supabase
        .from('challenge_participants')
        .delete()
        .eq('challenge_id', challenge.id)
        .eq('user_id', userProfile.id);

      if (error) throw error;

      setIsJoined(false);
      setUserProgress(0);
      onLeave?.(challenge.id);
      Alert.alert('Success', 'You left the challenge');
    } catch (error) {
      console.error('Error leaving challenge:', error);
      Alert.alert('Error', 'Failed to leave challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async (newProgress) => {
    if (!isJoined || !userProfile) return;

    try {
      const success = await updateProgress(userProfile.id, challenge.id, newProgress);
      if (success) {
        setUserProgress(newProgress);
        loadChallengeData(); // Refresh leaderboard
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me in the "${challenge.title}" challenge on BetterU! ${challenge.description}`,
        title: challenge.title,
      });
    } catch (error) {
      console.error('Error sharing challenge:', error);
    }
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      'easy': '#00ff99',
      'medium': '#ffaa00',
      'hard': '#ff0055',
      'expert': '#ff00ff'
    };
    return colors[difficulty] || '#00ffff';
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const endDate = new Date(challenge.end_date);
    const diff = endDate - now;
    
    if (diff <= 0) return { text: 'Ended', urgent: false };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return { text: `${days}d ${hours}h left`, urgent: days <= 1 };
    if (hours > 0) return { text: `${hours}h left`, urgent: hours <= 6 };
    return { text: 'Ending soon', urgent: true };
  };

  const calculateProgress = () => {
    if (!userProgress || !challenge.target) return 0;
    return Math.min((userProgress / challenge.target) * 100, 100);
  };

  const timeRemaining = getTimeRemaining();
  const progress = calculateProgress();
  const difficultyColor = getDifficultyColor(challenge.difficulty);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={animateOut}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backdrop} onPress={animateOut} />
        
        <Animated.View 
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={animateOut}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color="#00ffff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Challenge Info */}
            <View style={styles.challengeInfo}>
              <View style={styles.challengeHeader}>
                <View style={styles.typeContainer}>
                  <Ionicons name="trophy" size={20} color="#00ffff" />
                  <Text style={styles.typeText}>{challenge.type.toUpperCase()}</Text>
                </View>
                
                <View style={styles.difficultyContainer}>
                  <View style={[styles.difficultyDot, { backgroundColor: difficultyColor }]} />
                  <Text style={styles.difficultyText}>{challenge.difficulty}</Text>
                </View>
              </View>

              <Text style={styles.title}>{challenge.title}</Text>
              <Text style={styles.description}>{challenge.description}</Text>

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.stat}>
                  <Ionicons name="trophy" size={16} color="#00ffff" />
                  <Text style={styles.statValue}>{challenge.reward_points}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
                
                <View style={styles.stat}>
                  <Ionicons name="people" size={16} color="#00ffff" />
                  <Text style={styles.statValue}>{leaderboard.length}</Text>
                  <Text style={styles.statLabel}>Participants</Text>
                </View>
                
                <View style={styles.stat}>
                  <Ionicons name="time" size={16} color={timeRemaining.urgent ? "#ff0055" : "#00ffff"} />
                  <Text style={[styles.statValue, timeRemaining.urgent && styles.urgentText]}>
                    {timeRemaining.text}
                  </Text>
                  <Text style={styles.statLabel}>Time Left</Text>
                </View>
              </View>

              {/* Progress Section */}
              {isJoined && (
                <View style={styles.progressSection}>
                  <Text style={styles.progressTitle}>Your Progress</Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${progress}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {userProgress} / {challenge.target} {challenge.unit}
                  </Text>
                  
                  {/* Quick Progress Buttons */}
                  <View style={styles.progressButtons}>
                    <TouchableOpacity
                      style={styles.progressButton}
                      onPress={() => handleUpdateProgress(Math.max(0, userProgress - 1))}
                    >
                      <Ionicons name="remove" size={16} color="#ff0055" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.progressButton}
                      onPress={() => handleUpdateProgress(userProgress + 1)}
                    >
                      <Ionicons name="add" size={16} color="#00ff99" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'details' && styles.activeTab]}
                onPress={() => setActiveTab('details')}
              >
                <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
                  Details
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.tab, activeTab === 'leaderboard' && styles.activeTab]}
                onPress={() => setActiveTab('leaderboard')}
              >
                <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>
                  Leaderboard
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === 'details' ? (
              <View style={styles.detailsContent}>
                <Text style={styles.sectionTitle}>Challenge Details</Text>
                <Text style={styles.detailsText}>
                  Target: {challenge.target} {challenge.unit}
                </Text>
                <Text style={styles.detailsText}>
                  Duration: {challenge.duration_days} days
                </Text>
                <Text style={styles.detailsText}>
                  Created: {new Date(challenge.created_at).toLocaleDateString()}
                </Text>
              </View>
            ) : (
              <View style={styles.leaderboardContent}>
                <Text style={styles.sectionTitle}>Leaderboard</Text>
                {leaderboard.map((entry, index) => (
                  <View key={entry.user.id} style={styles.leaderboardEntry}>
                    <View style={styles.rankContainer}>
                      <Text style={styles.rankText}>{entry.rank}</Text>
                    </View>
                    
                    <PremiumAvatar user={entry.user} size={40} />
                    
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryName}>{entry.user.username}</Text>
                      <Text style={styles.entryProgress}>
                        {entry.progress} / {challenge.target} {challenge.unit}
                      </Text>
                    </View>
                    
                    <View style={styles.entryScore}>
                      <Text style={styles.scoreText}>
                        {Math.round((entry.progress / challenge.target) * 100)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Action Button */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isJoined ? styles.leaveButton : styles.joinButton,
                loading && styles.disabledButton
              ]}
              onPress={isJoined ? handleLeaveChallenge : handleJoinChallenge}
              disabled={loading}
            >
              <Text style={[
                styles.actionButtonText,
                isJoined && styles.leaveButtonText
              ]}>
                {loading ? 'Loading...' : isJoined ? 'Leave Challenge' : 'Join Challenge'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  closeButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 20,
  },
  challengeInfo: {
    marginBottom: 20,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeText: {
    color: '#00ffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00ffff',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  urgentText: {
    color: '#ff0055',
  },
  progressSection: {
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00ffff',
    borderRadius: 4,
  },
  progressText: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  progressButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#00ffff',
  },
  tabText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#00ffff',
  },
  detailsContent: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  detailsText: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 8,
  },
  leaderboardContent: {
    marginBottom: 20,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  rankContainer: {
    width: 30,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00ffff',
  },
  entryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  entryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  entryProgress: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  entryScore: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00ff99',
  },
  actionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButton: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  joinButton: {
    backgroundColor: '#00ffff',
  },
  leaveButton: {
    backgroundColor: 'rgba(255, 0, 85, 0.1)',
    borderWidth: 1,
    borderColor: '#ff0055',
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  leaveButtonText: {
    color: '#ff0055',
  },
});

export default ChallengeDetails; 