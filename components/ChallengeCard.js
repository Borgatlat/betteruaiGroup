import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { PremiumAvatar } from '../app/components/PremiumAvatar';

const ChallengeCard = ({ 
  challenge, 
  onJoin, 
  onLeave, 
  onViewDetails,
  isJoined = false,
  userProgress = null,
  participants = [],
  showProgress = true
}) => {
  const { userProfile } = useUser();
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Calculate challenge progress
  const calculateProgress = () => {
    try {
      if (!userProgress) return 0;
      
      const { current, target } = userProgress;
      if (target === 0) return 0;
      
      return Math.min((current / target) * 100, 100);
    } catch (error) {
      console.error('Error calculating progress:', error);
      return 0;
    }
  };

  // Get challenge type icon
  const getChallengeIcon = (type) => {
    const icons = {
      'workout': 'fitness',
      'mental': 'brain',
      'run': 'walk',
      'nutrition': 'nutrition',
      'sleep': 'moon',
      'social': 'people',
      'learning': 'school',
      'creativity': 'brush'
    };
    return icons[type] || 'trophy';
  };

  // Get challenge difficulty color
  const getDifficultyColor = (difficulty) => {
    const colors = {
      'easy': '#00ff99',
      'medium': '#ffaa00',
      'hard': '#ff0055',
      'expert': '#ff00ff'
    };
    return colors[difficulty] || '#00ffff';
  };

  // Get time remaining
  const getTimeRemaining = () => {
    try {
      const now = new Date();
      const endDate = new Date(challenge.end_date);
      const diff = endDate - now;
      
      if (diff <= 0) return 'Ended';
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) return `${days}d ${hours}h left`;
      if (hours > 0) return `${hours}h left`;
      return 'Ending soon';
    } catch (error) {
      console.error('Error calculating time remaining:', error);
      return 'Unknown';
    }
  };

  // Handle join/leave challenge
  const handleToggleParticipation = async () => {
    if (!userProfile?.id) {
      Alert.alert('Error', 'Please log in to join challenges');
      return;
    }

    if (isJoined) {
      setIsLeaving(true);
      try {
        const { error } = await supabase
          .from('challenge_participants')
          .delete()
          .eq('challenge_id', challenge.id)
          .eq('user_id', userProfile.id);

        if (error) throw error;
        
        onLeave?.(challenge.id);
        // Don't show success alert for leaving, just do it silently
      } catch (error) {
        console.error('Error leaving challenge:', error);
        Alert.alert('Error', 'Failed to leave challenge. Please try again.');
      } finally {
        setIsLeaving(false);
      }
    } else {
      setIsJoining(true);
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
        
        onJoin?.(challenge.id);
        Alert.alert('Success', 'Joined challenge successfully!');
      } catch (error) {
        console.error('Error joining challenge:', error);
        Alert.alert('Error', 'Failed to join challenge. Please try again.');
      } finally {
        setIsJoining(false);
      }
    }
  };

  const progress = calculateProgress();
  const timeRemaining = getTimeRemaining();

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onViewDetails?.(challenge)}
      activeOpacity={0.8}
    >
      {/* Challenge Header */}
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Ionicons 
            name={getChallengeIcon(challenge.type)} 
            size={20} 
            color="#00ffff" 
          />
          <Text style={styles.typeText}>{challenge.type.toUpperCase()}</Text>
        </View>
        
        <View style={styles.difficultyContainer}>
          <View 
            style={[
              styles.difficultyBadge, 
              { backgroundColor: getDifficultyColor(challenge.difficulty) }
            ]}
          >
            <Text style={styles.difficultyText}>{challenge.difficulty}</Text>
          </View>
        </View>
      </View>

      {/* Challenge Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{challenge.title}</Text>
        <Text style={styles.description}>{challenge.description}</Text>
        
        {/* Challenge Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Ionicons name="trophy" size={16} color="#ffaa00" />
            <Text style={styles.statText}>{challenge.reward_points} pts</Text>
          </View>
          
          <View style={styles.stat}>
            <Ionicons name="people" size={16} color="#00ffff" />
            <Text style={styles.statText}>{participants.length} joined</Text>
          </View>
          
          <View style={styles.stat}>
            <Ionicons name="time" size={16} color="#ff0055" />
            <Text style={styles.statText}>{timeRemaining}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        {showProgress && isJoined && userProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>Your Progress</Text>
              <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progress}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressDetails}>
              {userProgress.current} / {userProgress.target} {challenge.unit}
            </Text>
          </View>
        )}

        {/* Participants Preview */}
        {participants.length > 0 && (
          <View style={styles.participantsContainer}>
            <Text style={styles.participantsTitle}>Participants</Text>
            <View style={styles.participantsList}>
              {participants.slice(0, 3).map((participant, index) => (
                <PremiumAvatar
                  key={participant.id}
                  size={30}
                  source={participant.avatar_url ? { uri: participant.avatar_url } : null}
                  isPremium={participant.is_premium}
                  username={participant.username}
                  style={[
                    styles.participantAvatar,
                    { zIndex: participants.length - index }
                  ]}
                />
              ))}
              {participants.length > 3 && (
                <View style={styles.moreParticipants}>
                  <Text style={styles.moreParticipantsText}>+{participants.length - 3}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[
          styles.actionButton,
          isJoined ? styles.leaveButton : styles.joinButton,
          (isJoining || isLeaving) && styles.disabledButton
        ]}
        onPress={handleToggleParticipation}
        disabled={isJoining || isLeaving}
      >
        <Ionicons 
          name={isJoined ? 'exit' : 'add'} 
          size={18} 
          color={isJoined ? '#ff0055' : '#fff'} 
        />
        <Text style={[
          styles.actionButtonText,
          isJoined ? styles.leaveButtonText : styles.joinButtonText
        ]}>
          {isJoining ? 'Joining...' : 
           isLeaving ? 'Leaving...' : 
           isJoined ? 'Leave Challenge' : 'Join Challenge'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 1,
  },
  typeText: {
    color: '#00ffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
    flexShrink: 1,
  },
  difficultyContainer: {
    alignItems: 'flex-end',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  content: {
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 22,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
    minWidth: 60,
  },
  statText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    flexShrink: 1,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercentage: {
    color: '#00ff99',
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00ff99',
    borderRadius: 4,
  },
  progressDetails: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  participantsContainer: {
    marginBottom: 16,
  },
  participantsTitle: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  participantsList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatar: {
    marginRight: -8,
  },
  moreParticipants: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  moreParticipantsText: {
    color: '#00ffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minHeight: 44,
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
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
    flexShrink: 1,
  },
  joinButtonText: {
    color: '#000',
  },
  leaveButtonText: {
    color: '#ff0055',
  },
});

export default ChallengeCard; 