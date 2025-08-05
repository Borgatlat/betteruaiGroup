import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../context/UserContext';
import { useRouter } from 'expo-router';
import { PremiumAvatar } from '../components/PremiumAvatar';

export default function FriendsScreen() {
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { userProfile } = useUser();
  const router = useRouter();

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const { data: friendships, error } = await supabase
        .from('friends')
        .select(`
          *,
          friend:friend_id (
            id,
            username,
            full_name,
            avatar_url,
            is_premium
          ),
          user:user_id (
            id,
            username,
            full_name,
            avatar_url,
            is_premium
          )
        `)
        .or(`user_id.eq.${userProfile.id},friend_id.eq.${userProfile.id}`)
        .eq('status', 'accepted');

      if (error) throw error;

      // Transform the data to get friend profiles
      const friendProfiles = friendships.map(f => {
        const friend = f.user_id === userProfile.id ? f.friend : f.user;
        return {
          ...friend,
          friendship_id: f.id
        };
      });

      setFriends(friendProfiles);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const renderFriend = ({ item }) => (
    <TouchableOpacity 
      style={styles.friendItem}
      onPress={() => router.push(`/profile/${item.id}`)}
    >
      <PremiumAvatar
        userId={item.id}
        source={item.avatar_url ? { uri: item.avatar_url } : null}
        size={50}
        style={{ marginRight: 16 }}
        isPremium={item.is_premium}
        username={item.username}
        fullName={item.full_name}
      />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.full_name || item.username}</Text>
        <Text style={styles.friendUsername}>@{item.username}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={friends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No friends found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#fff',
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  friendUsername: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 32,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
}); 