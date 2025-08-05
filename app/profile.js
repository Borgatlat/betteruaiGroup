import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PremiumAvatar } from './components/PremiumAvatar';

const ProfileScreen = () => {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // Fetch user profile data
    // Replace with actual API call
    setUserProfile({
      id: '1',
      username: 'john_doe',
      avatar_url: 'https://placehold.co/400x400',
      full_name: 'John Doe',
      is_premium: true,
      fitness_goal: 'Lose weight'
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <PremiumAvatar
          userId={userProfile.id}
          source={userProfile.avatar_url ? { uri: userProfile.avatar_url } : null}
          size={100}
          style={styles.avatar}
          isPremium={userProfile.is_premium}
          username={userProfile.username}
          fullName={userProfile.full_name}
        />
        <Text style={styles.username}>@{userProfile.username}</Text>
        {userProfile.full_name && (
          <Text style={styles.fullName}>{userProfile.full_name}</Text>
        )}
        {userProfile.is_premium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.premiumText}>BetterU Premium Member</Text>
          </View>
        )}
        <View style={styles.goalBox}>
          <Text style={styles.goalText}>{userProfile.fitness_goal ? `Goal: ${userProfile.fitness_goal.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}` : 'No goal set.'}</Text>
        </View>
        <TouchableOpacity style={styles.seeAllButton} onPress={() => router.push('/profile/activity')}>
          <Text style={styles.seeAllButtonText}>See All Activity</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerSection: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  fullName: {
    fontSize: 16,
    marginBottom: 10,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  premiumText: {
    color: '#FFD700',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  goalBox: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 10,
    marginBottom: 20,
  },
  goalText: {
    fontSize: 16,
  },
  seeAllButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  seeAllButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ProfileScreen; 