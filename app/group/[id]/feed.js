import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import FeedCard from '../../components/FeedCard';
import { Ionicons } from '@expo/vector-icons';
import { PremiumAvatar } from '../../components/PremiumAvatar';
import { useAuth } from '../../../context/AuthContext';

export default function GroupFeedScreen() {
  const { id, name } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState([]);
  const router = useRouter();
  const { currentUserId } = useAuth();

  useEffect(() => {
    fetchGroupFeed();
  }, [id]);

  const fetchGroupFeed = async () => {
    try {
      // Get all members of the group
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', id);

      if (membersError) throw membersError;

      const memberIds = (members || []).map(m => m.user_id);

      // Get all activities from group members
      const [workouts, mentalSessions, runs, prs] = await Promise.all([
        // Workouts
        supabase
          .from('user_workout_logs')
          .select('*')
          .in('user_id', memberIds)
          .order('created_at', { ascending: false }),

        // Mental Sessions
        supabase
          .from('mental_session_logs')
          .select('*')
          .in('profile_id', memberIds)
          .order('created_at', { ascending: false }),

        // Runs
        supabase
          .from('runs')
          .select('*')
          .in('user_id', memberIds)
          .order('start_time', { ascending: false }),

        // PRs
        supabase
          .from('personal_records')
          .select('*')
          .in('profile_id', memberIds)
          .order('created_at', { ascending: false })
      ]);

      if (workouts.error) throw workouts.error;
      if (mentalSessions.error) throw mentalSessions.error;
      if (runs.error) throw runs.error;
      if (prs.error) throw prs.error;

      // Fetch all kudos in bulk
      const [workoutKudos, mentalKudos, runKudos] = await Promise.all([
        supabase
          .from('workout_kudos')
          .select('*')
          .in('workout_id', (workouts.data || []).map(w => w.id)),
        supabase
          .from('mental_session_kudos')
          .select('*')
          .in('session_id', (mentalSessions.data || []).map(m => m.id)),
        supabase
          .from('run_kudos')
          .select('*')
          .in('run_id', (runs.data || []).map(r => r.id))
      ]);

      if (workoutKudos.error) throw workoutKudos.error;
      if (mentalKudos.error) throw mentalKudos.error;
      if (runKudos.error) throw runKudos.error;

      // Create kudos maps for quick lookup
      const kudosMap = {};
      (workoutKudos.data || []).forEach(k => {
        if (!kudosMap[k.workout_id]) kudosMap[k.workout_id] = [];
        kudosMap[k.workout_id].push(k);
      });
      (mentalKudos.data || []).forEach(k => {
        if (!kudosMap[k.session_id]) kudosMap[k.session_id] = [];
        kudosMap[k.session_id].push(k);
      });
      (runKudos.data || []).forEach(k => {
        if (!kudosMap[k.run_id]) kudosMap[k.run_id] = [];
        kudosMap[k.run_id].push(k);
      });

      // Get current user for kudos check
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Get all unique user IDs from the activities
      const allUserIds = new Set([
        ...(workouts.data || []).map(w => w.user_id),
        ...(mentalSessions.data || []).map(m => m.profile_id),
        ...(runs.data || []).map(r => r.user_id),
        ...(prs.data || []).map(p => p.profile_id)
      ]);

      // Fetch profiles for all users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(allUserIds));

      if (profilesError) throw profilesError;

      // Create a map of user profiles for quick lookup
      const profileMap = profiles.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      // Combine and format all activities
      const allActivities = [
        ...(workouts.data || []).map(w => ({
          ...w,
          type: 'workout',
          targetId: w.id,
          profiles: profileMap[w.user_id],
          stats: [
            { label: 'Duration', value: `${w.duration} min` },
            { label: 'Exercises', value: w.exercise_count }
          ],
          kudos: kudosMap[w.id] || [],
          hasKudoed: (kudosMap[w.id] || []).some(k => k.user_id === currentUser?.id)
        })),
        ...(mentalSessions.data || []).map(m => ({
          ...m,
          type: 'mental',
          targetId: m.id,
          profiles: profileMap[m.profile_id],
          stats: [
            { label: 'Duration', value: `${m.duration} min` },
            { label: 'Calmness', value: `${m.calmness_level}/10` }
          ],
          kudos: kudosMap[m.id] || [],
          hasKudoed: (kudosMap[m.id] || []).some(k => k.user_id === currentUser?.id)
        })),
        ...(runs.data || []).map(r => ({
          ...r,
          type: 'run',
          targetId: r.id,
          profiles: profileMap[r.user_id],
          stats: [
            { label: 'Distance', value: `${r.distance_meters / 1000} km` },
            { label: 'Pace', value: `${r.average_pace_minutes_per_km} min/km` }
          ],
          kudos: kudosMap[r.id] || [],
          hasKudoed: (kudosMap[r.id] || []).some(k => k.user_id === currentUser?.id),
          runData: {
            path: r.path,
            distance_meters: r.distance_meters,
            duration_seconds: r.duration_seconds,
            start_time: r.start_time,
            end_time: r.end_time
          },
          showMapToOthers: r.show_map_to_others !== false
        })),
        ...(prs.data || []).map(p => ({
          ...p,
          type: 'pr',
          targetId: p.id,
          profiles: profileMap[p.profile_id],
          stats: [
            { label: 'Weight', value: `${p.weight_current} kg` },
            { label: 'Target', value: `${p.weight_target} kg` }
          ],
          kudos: [],
          hasKudoed: false
        }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setFeed(allActivities);
    } catch (error) {
      console.error('Error fetching group feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePress = (userId) => {
    router.push(`/profile/${userId}`);
  };

  const handleEditWorkout = (workoutId) => {
    router.push(`/edit-workout/${workoutId}`);
  };

  const handleEditMental = (sessionId) => {
    router.push(`/edit-mental/${sessionId}`);
  };

  const handleEditRun = (runId) => {
    router.push(`/edit-run/${runId}`);
  };

  const renderFeedItem = ({ item }) => {
    const profile = item.profiles || {};
    const kudosCount = item.kudos?.length || 0;
    const hasKudoed = item.hasKudoed || false;
    const commentCount = item.comments?.length || 0;

    const isOwnActivity = item.user_id === currentUserId || item.profile_id === currentUserId;
    
    const getEditHandler = () => {
      if (!isOwnActivity) return undefined;
      switch (item.type) {
        case 'workout':
          return () => handleEditWorkout(item.targetId);
        case 'mental':
          return () => handleEditMental(item.targetId);
        case 'run':
          return () => handleEditRun(item.targetId);
        default:
          return undefined;
      }
    };

    return (
      <FeedCard
        avatarUrl={profile.avatar_url}
        name={profile.full_name || 'User'}
        date={item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
        title={item.type === 'workout' ? (item.workout_name || 'Workout') : 
               item.type === 'mental' ? (item.session_name || 'Mental Session') :
               item.type === 'run' ? 'Run' :
               item.type === 'pr' ? (item.exercise || 'Personal Record') : 'Activity'}
        description={item.description || ''}
        stats={item.stats || []}
        type={item.type}
        targetId={item.targetId}
        isOwner={isOwnActivity}
        onEdit={getEditHandler()}
        userId={item.user_id || item.profile_id}
        photoUrl={item.photo_url}
        initialKudosCount={kudosCount}
        initialHasKudoed={hasKudoed}
        initialCommentCount={commentCount}
        username={profile.username}
        runData={item.runData}
        showMapToOthers={item.showMapToOthers}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#00ffff" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#00ffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{name} Feed</Text>
          <Text style={styles.subtitle}>See all group activities</Text>
        </View>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={renderFeedItem}
        contentContainerStyle={styles.feedList}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchGroupFeed}
            tintColor="#00ffff"
            colors={["#00ffff"]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    marginLeft: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ffff',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  feedList: {
    padding: 20,
  },
}); 