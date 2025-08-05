"use client";

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../context/UserContext';
import { useRouter } from 'expo-router';

export default function SuggestedFriendsScreen() {
  const [suggestedFriends, setSuggestedFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userProfile } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (userProfile?.id) {
      fetchSuggestedFriends();
    }
  }, [userProfile?.id]);

  const fetchSuggestedFriends = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user's profile
      const { data: currentUser, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userProfile.id)
        .single();

      if (userError) throw userError;

      // First get existing friend IDs
      const { data: existingFriends, error: existingError } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', userProfile.id);

      if (existingError) throw existingError;

      const existingFriendIds = existingFriends?.map(f => f.friend_id) || [];

      // Get all potential friends
      const { data: potentialFriends, error: friendsError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          full_name,
          fitness_goal,
          training_level,
          age,
          bio,
          avatar_url
        `)
        .neq('id', userProfile.id); // Exclude current user

      if (friendsError) throw friendsError;

      // Filter out existing friends in memory
      const filteredFriends = potentialFriends.filter(friend => 
        !existingFriendIds.includes(friend.id)
      );

      // Score and sort potential friends based on compatibility
      const scoredFriends = filteredFriends.map(friend => {
        let score = 0;
        
        // Similar fitness goals (highest weight)
        if (friend.fitness_goal === currentUser.fitness_goal) {
          score += 30;
        }

        // Similar training level
        if (friend.training_level === currentUser.training_level) {
          score += 25;
        }

        // Similar age range (within 5 years)
        const ageDiff = Math.abs((friend.age || 0) - (currentUser.age || 0));
        if (ageDiff <= 5) {
          score += 20;
        } else if (ageDiff <= 10) {
          score += 10;
        }

        // Has bio (shows engagement)
        if (friend.bio) {
          score += 5;
        }

        return {
          ...friend,
          compatibility_score: score
        };
      });

      // Sort by compatibility score
      const sortedFriends = scoredFriends.sort((a, b) => 
        b.compatibility_score - a.compatibility_score
      );

      setSuggestedFriends(sortedFriends);
    } catch (error) {
      console.error('Error fetching suggested friends:', error);
      setError('Failed to load suggested friends');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFriend = async (friendId) => {
    try {
      const { error } = await supabase
        .from('friends')
        .insert([
          { user_id: userProfile.id, friend_id: friendId, status: 'pending' }
        ]);

      if (error) throw error;

      // Update local state to remove the added friend
      setSuggestedFriends(prev => 
        prev.filter(friend => friend.id !== friendId)
      );

      Alert.alert(
        "Friend Request Sent",
        "Your friend request has been sent successfully!"
      );
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert(
        "Error",
        "Failed to send friend request. Please try again."
      );
    }
  };

  const formatFitnessGoal = (goal) => {
    if (!goal) return '';
    return goal
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatTrainingLevel = (level) => {
    if (!level) return '';
    return level
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderFriendCard = ({ item }) => (
    <View style={styles.friendCard}>
      <TouchableOpacity 
        style={styles.friendInfo}
        onPress={() => router.push(`/profile/${item.id}`)}
      >
        <View style={styles.avatarContainer}>
          {item.avatar_url ? (
            <Image 
              source={{ uri: item.avatar_url }} 
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={24} color="#666" />
            </View>
          )}
        </View>
        <View style={styles.friendDetails}>
          <Text style={styles.username}>@{item.username}</Text>
          <Text style={styles.name}>{item.full_name}</Text>
          <View style={styles.tagsContainer}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{formatTrainingLevel(item.training_level)}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{formatFitnessGoal(item.fitness_goal)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleAddFriend(item.id)}
      >
        <Ionicons name="person-add-outline" size={24} color="cyan" />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="cyan" />
        <Text style={styles.loadingText}>Finding friends for you...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchSuggestedFriends}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suggested Friends</Text>
      </View>

      {suggestedFriends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>
            No suggestions available at the moment.
          </Text>
          <Text style={styles.emptySubtext}>
            Check back later for new friend suggestions!
          </Text>
        </View>
      ) : (
        <FlatList
          data={suggestedFriends}
          renderItem={renderFriendCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  errorText: {
    color: '#FF6B6B',
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  retryButtonText: {
    color: 'cyan',
    fontSize: 16,
  },
  listContainer: {
    padding: 20,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendDetails: {
    flex: 1,
  },
  username: {
    color: 'cyan',
    fontSize: 16,
    fontWeight: '600',
  },
  name: {
    color: 'white',
    fontSize: 14,
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  tag: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  tagText: {
    color: 'cyan',
    fontSize: 12,
  },
  addButton: {
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
}); 