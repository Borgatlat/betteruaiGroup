import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Alert, 
  Animated, 
  Dimensions,
  Share,
  Vibration,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { PremiumAvatar } from '../app/components/PremiumAvatar';

const { width } = Dimensions.get('window');

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
  const [showParticipants, setShowParticipants] = useState(false);
  
  // Animation values
  const scaleAnim = useState(new Animated.Value(1))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];
  const slideAnim = useState(new Animated.Value(0))[0];

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
      'creativity': 'brush',
      'streak': 'flame',
      'achievement': 'trophy',
      'group': 'people-circle',
      'daily': 'calendar',
      'weekly': 'calendar-outline',
      'monthly': 'calendar-clear'
    };
    return icons[type] || 'trophy';
  };

  // Get challenge badge for special challenges
  const getChallengeBadge = (challenge) => {
    if (challenge.is_featured) return { text: 'FEATURED', color: '#ffaa00', icon: 'star' };
    if (challenge.is_premium) return { text: 'PREMIUM', color: '#ff00ff', icon: 'diamond' };
    if (challenge.is_group) return { text: 'GROUP', color: '#00ff99', icon: 'people-circle' };
    if (challenge.is_streak) return { text: 'STREAK', color: '#ff0055', icon: 'flame' };
    return null;
  };

  // Get challenge status
  const getChallengeStatus = () => {
    if (!isJoined) return null;
    
    const progress = calculateProgress();
    if (progress >= 100) return { text: 'COMPLETED', color: '#00ff99', icon: 'checkmark-circle' };
    if (progress >= 75) return { text: 'ALMOST DONE', color: '#ffaa00', icon: 'time' };
    if (progress >= 50) return { text: 'HALFWAY', color: '#00ffff', icon: 'trending-up' };
    return { text: 'IN PROGRESS', color: '#888', icon: 'play' };
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

  // Get time remaining with urgency indicators
  const getTimeRemaining = () => {
    try {
      const now = new Date();
      const endDate = new Date(challenge.end_date);
      const diff = endDate - now;
      
      if (diff <= 0) return { text: 'Ended', urgent: false };
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) return { text: `${days}d ${hours}h left`, urgent: days <= 1 };
      if (hours > 0) return { text: `${hours}h left`, urgent: hours <= 6 };
      return { text: 'Ending soon', urgent: true };
    } catch (error) {
      console.error('Error calculating time remaining:', error);
      return { text: 'Unknown', urgent: false };
    }
  };

  // Animate card on press
  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Pulse animation for urgent challenges
  useEffect(() => {
    const timeRemaining = getTimeRemaining();
    if (timeRemaining.urgent && isJoined) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isJoined, challenge.end_date]);

  // Handle join/leave challenge with haptic feedback
  const handleToggleParticipation = async () => {
    if (!userProfile?.id) {
      Alert.alert('Error', 'Please log in to join challenges');
      return;
    }

    // Haptic feedback
    Vibration.vibrate(50);

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
        Alert.alert('Success', 'You left the challenge');
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
        Alert.alert('Success', `You joined "${challenge.title}"!`);
      } catch (error) {
        console.error('Error joining challenge:', error);
        Alert.alert('Error', 'Failed to join challenge. Please try again.');
      } finally {
        setIsJoining(false);
      }
    }
  };

  // Share challenge
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

  // View challenge details
  const handleViewDetails = () => {
    animatePress();
    onViewDetails?.(challenge);
  };

  const progress = calculateProgress();
  const timeRemaining = getTimeRemaining();
  const difficultyColor = getDifficultyColor(challenge.difficulty);
  const badge = getChallengeBadge(challenge);
  const status = getChallengeStatus();

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          transform: [
            { scale: scaleAnim },
            { scale: pulseAnim }
          ]
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.cardContent}
        onPress={handleViewDetails}
        activeOpacity={0.9}
      >
        {/* Header with Badge */}
        <View style={styles.header}>
          <View style={styles.typeContainer}>
            <Ionicons 
              name={getChallengeIcon(challenge.type)} 
              size={16} 
              color="#00ffff" 
            />
            <Text style={styles.typeText}>{challenge.type.toUpperCase()}</Text>
          </View>
          
          <View style={styles.headerRight}>
            {badge && (
              <View style={[styles.badge, { backgroundColor: badge.color }]}>
                <Ionicons name={badge.icon} size={10} color="#fff" />
                <Text style={styles.badgeText}>{badge.text}</Text>
              </View>
            )}
            
            <View style={styles.difficultyContainer}>
              <View style={[styles.difficultyDot, { backgroundColor: difficultyColor }]} />
              <Text style={styles.difficultyText}>{challenge.difficulty}</Text>
            </View>
          </View>
        </View>

        {/* Status Indicator */}
        {status && (
          <View style={[styles.statusContainer, { backgroundColor: status.color + '20' }]}>
            <Ionicons name={status.icon} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          </View>
        )}

        {/* Title and Description */}
        <Text style={styles.title} numberOfLines={2}>{challenge.title}</Text>
        <Text style={styles.description} numberOfLines={3}>{challenge.description}</Text>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Ionicons name="trophy" size={12} color="#00ffff" />
            <Text style={styles.statText}>{challenge.reward_points} pts</Text>
          </View>
          
          <View style={styles.stat}>
            <Ionicons name="people" size={12} color="#00ffff" />
            <Text style={styles.statText}>{participants.length} joined</Text>
          </View>
          
          <View style={styles.stat}>
            <Ionicons name="time" size={12} color={timeRemaining.urgent ? "#ff0055" : "#00ffff"} />
            <Text style={[styles.statText, timeRemaining.urgent && styles.urgentText]}>
              {timeRemaining.text}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        {showProgress && isJoined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progress}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}

        {/* Participants Preview */}
        {participants.length > 0 && (
          <View style={styles.participantsContainer}>
            <Text style={styles.participantsLabel}>Participants:</Text>
            <View style={styles.avatarsContainer}>
              {participants.slice(0, 5).map((participant, index) => (
                <PremiumAvatar
                  key={participant.id}
                  user={participant}
                  size={24}
                  style={[styles.avatar, { zIndex: participants.length - index }]}
                />
              ))}
              {participants.length > 5 && (
                <View style={styles.moreParticipants}>
                  <Text style={styles.moreText}>+{participants.length - 5}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              isJoined ? styles.leaveButton : styles.joinButton,
              (isJoining || isLeaving) && styles.disabledButton
            ]}
            onPress={handleToggleParticipation}
            disabled={isJoining || isLeaving}
          >
            {isJoining || isLeaving ? (
              <ActivityIndicator size="small" color={isJoined ? "#ff0055" : "#000"} />
            ) : (
              <>
                <Ionicons 
                  name={isJoined ? "exit" : "add"} 
                  size={16} 
                  color={isJoined ? "#ff0055" : "#000"} 
                />
                <Text style={[styles.actionButtonText, isJoined && styles.leaveButtonText]}>
                  {isJoined ? "Leave" : "Join"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={16} color="#00ffff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
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
  cardContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  difficultyText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#ffaa00',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
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
  urgentText: {
    color: '#ff0055',
    fontWeight: 'bold',
  },
  progressContainer: {
    marginBottom: 16,
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
  progressText: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: '600',
  },
  participantsContainer: {
    marginBottom: 16,
  },
  participantsLabel: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: -8,
  },
  moreParticipants: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  moreText: {
    color: '#00ffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  shareButton: {
    padding: 8,
  },
});

export default ChallengeCard; 