import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import ChallengeCard from './ChallengeCard';
import ChallengeDetails from './ChallengeDetails';
import { 
  getRecommendations, 
  getTrendingChallenges, 
  getUserChallenges,
  getChallengesByType 
} from '../utils/challengeRecommendationEngine';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

const ChallengeSection = ({ onViewChallenge }) => {
  const { userProfile } = useUser();
  const [activeTab, setActiveTab] = useState('recommended');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Challenge data
  const [recommendations, setRecommendations] = useState([]);
  const [trending, setTrending] = useState([]);
  const [userChallenges, setUserChallenges] = useState([]);
  const [challengesByType, setChallengesByType] = useState({});
  
  // UI state
  const [selectedType, setSelectedType] = useState('all');
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [showChallengeDetails, setShowChallengeDetails] = useState(false);
  const [userStats, setUserStats] = useState({
    totalChallenges: 0,
    completedChallenges: 0,
    currentStreak: 0,
    totalPoints: 0
  });

  // Animation values
  const tabIndicatorAnim = useState(new Animated.Value(0))[0];
  const fadeAnim = useState(new Animated.Value(1))[0];

  // Challenge types for filtering
  const challengeTypes = [
    { key: 'all', label: 'All', icon: 'grid' },
    { key: 'workout', label: 'Workout', icon: 'fitness' },
    { key: 'mental', label: 'Mental', icon: 'brain' },
    { key: 'run', label: 'Running', icon: 'walk' },
    { key: 'nutrition', label: 'Nutrition', icon: 'nutrition' },
    { key: 'sleep', label: 'Sleep', icon: 'moon' },
    { key: 'social', label: 'Social', icon: 'people' },
    { key: 'learning', label: 'Learning', icon: 'school' },
    { key: 'creativity', label: 'Creativity', icon: 'brush' },
    { key: 'streak', label: 'Streaks', icon: 'flame' },
    { key: 'achievement', label: 'Achievements', icon: 'trophy' },
    { key: 'group', label: 'Group', icon: 'people-circle' },
    { key: 'daily', label: 'Daily', icon: 'calendar' },
    { key: 'weekly', label: 'Weekly', icon: 'calendar-outline' },
    { key: 'monthly', label: 'Monthly', icon: 'calendar-clear' }
  ];

  // Load user challenge statistics
  const loadUserStats = async () => {
    if (!userProfile?.id) return;
    
    try {
      const { data: participations } = await supabase
        .from('challenge_participants')
        .select('*')
        .eq('user_id', userProfile.id);

      const { data: completedChallenges } = await supabase
        .from('challenge_participants')
        .select('*, challenges(*)')
        .eq('user_id', userProfile.id)
        .eq('completed', true);

      const { data: achievements } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userProfile.id);

      const { data: currentStreaks } = await supabase
        .from('challenge_participants')
        .select('*, challenges(*)')
        .eq('user_id', userProfile.id)
        .eq('completed', false)
        .gte('last_activity', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const totalChallenges = participations?.length || 0;
      const completed = completedChallenges?.length || 0;
      const totalPoints = completedChallenges?.reduce((sum, p) => sum + (p.challenges?.reward_points || 0), 0) || 0;
      const achievementsEarned = achievements?.length || 0;
      const activeStreaks = currentStreaks?.length || 0;

      setUserStats({
        totalChallenges,
        completedChallenges: completed,
        currentStreak: activeStreaks,
        totalPoints,
        achievementsEarned,
        completionRate: totalChallenges > 0 ? Math.round((completed / totalChallenges) * 100) : 0
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  // Load all challenge data
  const loadChallenges = async () => {
    if (!userProfile?.id) return;
    
    setLoading(true);
    try {
      const [recs, trend, userChalls] = await Promise.all([
        getRecommendations(userProfile.id, 10).catch(() => []),
        getTrendingChallenges(5).catch(() => []),
        getUserChallenges(userProfile.id).catch(() => [])
      ]);

      setRecommendations(recs || []);
      setTrending(trend || []);
      setUserChallenges(userChalls || []);

      // Load challenges by type with better error handling
      const typeChallenges = {};
      for (const type of challengeTypes.slice(1)) { // Skip 'all'
        try {
          const challenges = await getChallengesByType(type.key, 8);
          typeChallenges[type.key] = challenges || [];
        } catch (error) {
          console.error(`Error loading challenges for type ${type.key}:`, error);
          typeChallenges[type.key] = [];
        }
      }
      setChallengesByType(typeChallenges);

      // Load user stats
      await loadUserStats();

    } catch (error) {
      console.error('Error loading challenges:', error);
      setRecommendations([]);
      setTrending([]);
      setUserChallenges([]);
      setChallengesByType({});
    } finally {
      setLoading(false);
    }
  };

  // Refresh challenges
  const onRefresh = async () => {
    setRefreshing(true);
    await loadChallenges();
    setRefreshing(false);
  };

  // Animate tab indicator
  useEffect(() => {
    const tabIndex = ['recommended', 'trending', 'my', 'browse'].indexOf(activeTab);
    Animated.timing(tabIndicatorAnim, {
      toValue: tabIndex * (width / 4),
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  // Handle challenge join/leave
  const handleJoinChallenge = (challengeId) => {
    // Update local state optimistically
    setRecommendations(prev => 
      prev.map(challenge => 
        challenge.challenge?.id === challengeId 
          ? { ...challenge, isJoined: true }
          : challenge
      )
    );
    setUserChallenges(prev => [...prev, { id: challengeId }]);
    loadUserStats(); // Refresh stats
  };

  const handleLeaveChallenge = (challengeId) => {
    // Update local state optimistically
    setRecommendations(prev => 
      prev.map(challenge => 
        challenge.challenge?.id === challengeId 
          ? { ...challenge, isJoined: false }
          : challenge
      )
    );
    setUserChallenges(prev => prev.filter(challenge => challenge.id !== challengeId));
    loadUserStats(); // Refresh stats
  };

  // Get participants for a challenge
  const getParticipants = async (challengeId) => {
    try {
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select(`
          user_id,
          profiles:user_id (
            id,
            username,
            avatar_url,
            is_premium
          )
        `)
        .eq('challenge_id', challengeId)
        .limit(10);

      return participants?.map(p => p.profiles).filter(Boolean) || [];
    } catch (error) {
      console.error('Error getting participants:', error);
      return [];
    }
  };

  // Handle challenge view details
  const handleViewChallengeDetails = (challenge) => {
    setSelectedChallenge(challenge);
    setShowChallengeDetails(true);
  };

  // Render challenge card with participants
  const renderChallengeCard = ({ item, participants = [] }) => {
    try {
      const challenge = item.challenge || item;
      const isJoined = userChallenges.some(uc => uc.id === challenge.id);
      const userProgress = isJoined ? item.userProgress : null;

      return (
        <ChallengeCard
          challenge={challenge}
          onJoin={handleJoinChallenge}
          onLeave={handleLeaveChallenge}
          onViewDetails={handleViewChallengeDetails}
          isJoined={isJoined}
          userProgress={userProgress}
          participants={participants}
          showProgress={true}
        />
      );
    } catch (error) {
      console.error('Error rendering challenge card:', error);
      return null;
    }
  };

  // Render tab content
  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00ffff" />
          <Text style={styles.loadingText}>Loading challenges...</Text>
        </View>
      );
    }

    let challenges = [];
    let title = '';
    let subtitle = '';

    switch (activeTab) {
      case 'recommended':
        challenges = recommendations;
        title = 'Recommended for You';
        subtitle = 'Based on your activity and preferences';
        break;
      case 'trending':
        challenges = trending;
        title = 'Trending Challenges';
        subtitle = 'Most popular challenges right now';
        break;
      case 'my':
        challenges = userChallenges;
        title = 'My Challenges';
        subtitle = `You're participating in ${userChallenges.length} challenges`;
        break;
      case 'browse':
        challenges = challengesByType[selectedType] || [];
        title = `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Challenges`;
        subtitle = `Browse ${selectedType} challenges`;
        break;
    }

    if (challenges.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={64} color="#666" />
          <Text style={styles.emptyTitle}>No challenges found</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'my' 
              ? 'Join some challenges to see them here!'
              : 'Check back later for new challenges'
            }
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        
        <FlatList
          data={challenges}
          renderItem={renderChallengeCard}
          keyExtractor={(item) => (item.challenge?.id || item.id).toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.challengesList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with Stats */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Challenges</Text>
          <Text style={styles.subtitle}>Compete, grow, and earn rewards</Text>
        </View>
        
        {/* User Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.totalChallenges}</Text>
            <Text style={styles.statLabel}>Joined</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.completedChallenges}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.currentStreak}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
         
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.totalPoints}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.achievementsEarned}</Text>
            <Text style={styles.statLabel}>Achievements</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.completionRate}%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {[
            { key: 'recommended', label: 'Recommended', icon: 'star' },
            { key: 'trending', label: 'Trending', icon: 'trending-up' },
            { key: 'my', label: 'My Challenges', icon: 'person' },
            { key: 'browse', label: 'Browse', icon: 'grid' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons 
                name={tab.icon} 
                size={16} 
                color={activeTab === tab.key ? '#00ffff' : '#666'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Animated Tab Indicator */}
        <Animated.View 
          style={[
            styles.tabIndicator,
            { transform: [{ translateX: tabIndicatorAnim }] }
          ]} 
        />
      </View>

      {/* Type Filter (for Browse tab) */}
      {activeTab === 'browse' && (
        <View style={styles.typeFilterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeFilterScroll}
          >
            {challengeTypes.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.typeButton,
                  selectedType === type.key && styles.selectedTypeButton
                ]}
                onPress={() => setSelectedType(type.key)}
              >
                <Ionicons 
                  name={type.icon} 
                  size={14} 
                  color={selectedType === type.key ? '#000' : '#00ffff'} 
                />
                <Text style={[
                  styles.typeButtonText,
                  selectedType === type.key && styles.selectedTypeButtonText
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#00ffff']}
            tintColor="#00ffff"
          />
        }
      >
        {renderTabContent()}
      </ScrollView>

      {/* Challenge Details Modal */}
      <ChallengeDetails
        challenge={selectedChallenge}
        visible={showChallengeDetails}
        onClose={() => setShowChallengeDetails(false)}
        onJoin={handleJoinChallenge}
        onLeave={handleLeaveChallenge}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerContent: {
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ffff',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    lineHeight: 18,
    flexWrap: 'wrap',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00ffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  tabContainer: {
    position: 'relative',
    marginBottom: 20,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 4,
  },
  tabScroll: {
    paddingHorizontal: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    minWidth: 60,
  },
  activeTab: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 4,
    flexShrink: 1,
    textAlign: 'center',
  },
  activeTabText: {
    color: '#00ffff',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    backgroundColor: '#00ffff',
    borderRadius: 2,
    width: width / 4,
  },
  typeFilterContainer: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  typeFilterScroll: {
    paddingHorizontal: 4,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    minWidth: 60,
    maxWidth: 100,
  },
  selectedTypeButton: {
    backgroundColor: '#00ffff',
    borderColor: '#00ffff',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00ffff',
    marginLeft: 4,
    flexShrink: 1,
  },
  selectedTypeButtonText: {
    color: '#000',
  },
  tabContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 20,
    lineHeight: 18,
    flexWrap: 'wrap',
  },
  challengesList: {
    paddingHorizontal: 4,
  },
  separator: {
    height: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#888',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(0, 255, 255, 0.03)',
    borderRadius: 20,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
});

export default ChallengeSection; 