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
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import ChallengeCard from './ChallengeCard';
import { 
  getRecommendations, 
  getTrendingChallenges, 
  getUserChallenges,
  getChallengesByType 
} from '../utils/challengeRecommendationEngine';
import { supabase } from '../lib/supabase';

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
    { key: 'creativity', label: 'Creativity', icon: 'brush' }
  ];

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

    } catch (error) {
      console.error('Error loading challenges:', error);
      // Don't show alert for every error, just log it
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
        .eq('challenge_id', challengeId);

      return participants?.map(p => p.profiles).filter(Boolean) || [];
    } catch (error) {
      console.error('Error getting participants:', error);
      return [];
    }
  };

  // Render challenge card with participants
  const renderChallengeCard = ({ item, participants = [] }) => {
    try {
      const challenge = item.challenge || item;
      const isJoined = userChallenges.some(uc => uc.id === challenge.id);
      const userProgress = userChallenges.find(uc => uc.id === challenge.id)?.userProgress;

      return (
        <ChallengeCard
          challenge={challenge}
          isJoined={isJoined}
          userProgress={userProgress ? { current: userProgress, target: challenge.target } : null}
          participants={participants}
          onJoin={handleJoinChallenge}
          onLeave={handleLeaveChallenge}
          onViewDetails={onViewChallenge}
          showProgress={isJoined}
        />
      );
    } catch (error) {
      console.error('Error rendering challenge card:', error);
      return null;
    }
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'recommended':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <Text style={styles.sectionSubtitle}>
              Based on your interests and activity
            </Text>
            {loading ? (
              <ActivityIndicator color="#00ffff" style={styles.loader} />
            ) : recommendations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={48} color="#666" />
                <Text style={styles.emptyStateText}>No recommendations yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Complete some activities to get personalized challenge recommendations
                </Text>
              </View>
            ) : (
              <FlatList
                data={recommendations}
                renderItem={({ item }) => renderChallengeCard({ item })}
                keyExtractor={item => `rec_${item.challenge.id}`}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        );

      case 'trending':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Trending Challenges</Text>
            <Text style={styles.sectionSubtitle}>
              Most popular challenges right now
            </Text>
            {loading ? (
              <ActivityIndicator color="#00ffff" style={styles.loader} />
            ) : trending.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="trending-up-outline" size={48} color="#666" />
                <Text style={styles.emptyStateText}>No trending challenges</Text>
              </View>
            ) : (
              <FlatList
                data={trending}
                renderItem={({ item }) => renderChallengeCard({ item })}
                keyExtractor={item => `trend_${item.id}`}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        );

      case 'my-challenges':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>My Active Challenges</Text>
            <Text style={styles.sectionSubtitle}>
              Challenges you're currently participating in
            </Text>
            {loading ? (
              <ActivityIndicator color="#00ffff" style={styles.loader} />
            ) : userChallenges.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="person-outline" size={48} color="#666" />
                <Text style={styles.emptyStateText}>No active challenges</Text>
                <Text style={styles.emptyStateSubtext}>
                  Join some challenges to see them here
                </Text>
              </View>
            ) : (
              <FlatList
                data={userChallenges}
                renderItem={({ item }) => renderChallengeCard({ item })}
                keyExtractor={item => `my_${item.id}`}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        );

      case 'browse':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Browse Challenges</Text>
            <Text style={styles.sectionSubtitle}>
              Explore challenges by category
            </Text>
            
            {/* Type Filter */}
            <View style={styles.typeFilter}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.typeFilterContent}
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
                      size={16} 
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

            {/* Challenges by selected type */}
            {loading ? (
              <ActivityIndicator color="#00ffff" style={styles.loader} />
            ) : (
              <FlatList
                data={selectedType === 'all' 
                  ? Object.values(challengesByType).flat() 
                  : challengesByType[selectedType] || []
                }
                renderItem={({ item }) => renderChallengeCard({ item })}
                keyExtractor={item => `browse_${item.id}`}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        );

      default:
        return null;
    }
  };

  // Load challenges on mount
  useEffect(() => {
    loadChallenges();
  }, [userProfile?.id]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Challenges</Text>
        <Text style={styles.subtitle}>Push your limits, earn rewards</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recommended' && styles.activeTab]}
          onPress={() => setActiveTab('recommended')}
        >
          <Ionicons 
            name="star" 
            size={18} 
            color={activeTab === 'recommended' ? '#00ffff' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'recommended' && styles.activeTabText]}>
            Recommended
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'trending' && styles.activeTab]}
          onPress={() => setActiveTab('trending')}
        >
          <Ionicons 
            name="trending-up" 
            size={18} 
            color={activeTab === 'trending' ? '#00ffff' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'trending' && styles.activeTabText]}>
            Trending
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-challenges' && styles.activeTab]}
          onPress={() => setActiveTab('my-challenges')}
        >
          <Ionicons 
            name="person" 
            size={18} 
            color={activeTab === 'my-challenges' ? '#00ffff' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'my-challenges' && styles.activeTabText]}>
            My Challenges
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
        >
          <Ionicons 
            name="grid" 
            size={18} 
            color={activeTab === 'browse' ? '#00ffff' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>
            Browse
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00ffff"
            colors={['#00ffff']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
      </ScrollView>
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
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 4,
  },
  tab: {
    flex: 1,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 20,
    lineHeight: 18,
    flexWrap: 'wrap',
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(0, 255, 255, 0.03)',
    borderRadius: 20,
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 12,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  typeFilter: {
    marginBottom: 20,
  },
  typeFilterContent: {
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
});

export default ChallengeSection; 