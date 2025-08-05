import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import FeedCard from '../components/FeedCard';
import { PremiumAvatar } from '../components/PremiumAvatar';

const FriendProfileScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [prs, setPRs] = useState([]);
  const [mentalSessions, setMentalSessions] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [runs, setRuns] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('prs'); // 'prs', 'mental', 'workouts', 'runs'
  const [currentUserId, setCurrentUserId] = useState(null);

  const handleEditWorkout = (workoutId) => {
    router.push(`/edit-workout/${workoutId}`);
  };

  const handleEditMental = (sessionId) => {
    router.push(`/edit-mental/${sessionId}`);
  };

  const handleEditRun = (runId) => {
    router.push(`/edit-run/${runId}`);
  };

  useEffect(() => {
    if (id) {
      fetchAll();
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    })();
  }, []);

  const fetchAll = async () => {
      setLoading(true);
    setError(null);
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch PRs
      const { data: prData, error: prError } = await supabase
        .from('personal_records')
        .select('*')
        .eq('profile_id', id);
      if (prError) throw prError;
      setPRs(prData || []);

      // Fetch mental sessions
      const { data: msData, error: msError } = await supabase
        .from('mental_session_logs')
        .select('*')
        .eq('profile_id', id)
        .order('completed_at', { ascending: false });
      if (msError) throw msError;
      setMentalSessions(msData || []);

      // Fetch workouts
      const { data: workoutData, error: workoutError } = await supabase
        .from('user_workout_logs')
        .select('*')
        .eq('user_id', id)
        .order('completed_at', { ascending: false });
      if (workoutError) throw workoutError;
      setWorkouts(workoutData || []);

      // Fetch runs
      const { data: runsData, error: runsError } = await supabase
        .from('runs')
        .select('*')
        .eq('user_id', id)
        .order('start_time', { ascending: false });
      if (runsError) throw runsError;
      setRuns(runsData || []);

      // Fetch all kudos in bulk for the activities
      const [workoutKudos, mentalKudos, runKudos] = await Promise.all([
        supabase
          .from('workout_kudos')
          .select('*')
          .in('workout_id', (workoutData || []).map(w => w.id)),
        supabase
          .from('mental_session_kudos')
          .select('*')
          .in('session_id', (msData || []).map(m => m.id)),
        supabase
          .from('run_kudos')
          .select('*')
          .in('run_id', (runsData || []).map(r => r.id))
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

      // Fetch all comments in bulk
      const [workoutComments, mentalComments, runComments] = await Promise.all([
        supabase
          .from('workout_comments')
          .select('*')
          .in('workout_id', (workoutData || []).map(w => w.id)),
        supabase
          .from('mental_session_comments')
          .select('*')
          .in('session_id', (msData || []).map(m => m.id)),
        supabase
          .from('run_comments')
          .select('*')
          .in('run_id', (runsData || []).map(r => r.id))
      ]);

      // Create comments maps for quick lookup
      const commentsMap = {};
      (workoutComments.data || []).forEach(c => {
        if (!commentsMap[c.workout_id]) commentsMap[c.workout_id] = [];
        commentsMap[c.workout_id].push(c);
      });
      (mentalComments.data || []).forEach(c => {
        if (!commentsMap[c.session_id]) commentsMap[c.session_id] = [];
        commentsMap[c.session_id].push(c);
      });
      (runComments.data || []).forEach(c => {
        if (!commentsMap[c.run_id]) commentsMap[c.run_id] = [];
        commentsMap[c.run_id].push(c);
      });

      // Update the state with kudos and comments data
      setWorkouts((workoutData || []).map(w => ({
        ...w,
        kudos: kudosMap[w.id] || [],
        comments: commentsMap[w.id] || []
      })));

      setMentalSessions((msData || []).map(m => ({
        ...m,
        kudos: kudosMap[m.id] || [],
        comments: commentsMap[m.id] || []
      })));

      setRuns((runsData || []).map(r => ({
        ...r,
        kudos: kudosMap[r.id] || [],
        comments: commentsMap[r.id] || []
      })));

    } catch (e) {
      setError(e.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#00ffff" size="large" /></View>;
  }
  if (error) {
    return <View style={styles.center}><Text style={{ color: '#fff' }}>{error}</Text></View>;
  }
  if (!profile) {
    return <View style={styles.center}><Text style={{ color: '#fff' }}>Profile not found.</Text></View>;
  }

  // Tab content renderers
  const renderPRs = () => {
    if (prs && prs.length > 0) {
      return (
        <>
          {prs.map((item) => (
            <FeedCard
              key={item.id}
              avatarUrl={profile.avatar_url}
              name={profile.full_name || profile.username || 'User'}
              date={item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
              title={item.exercise || 'Personal Record'}
              stats={[
                { value: (item.weight_current !== undefined && item.weight_unit) ? `${item.weight_current} ${item.weight_unit}` : '-', label: 'Current', highlight: true },
                { value: (item.weight_target !== undefined && item.weight_unit) ? `${item.weight_target} ${item.weight_unit}` : '-', label: 'Target' },
              ]}
              type="pr"
              targetId={item.id}
              isOwner={currentUserId === profile.id}
              onEdit={null} // Optionally add edit logic
              userId={profile.id}
              initialKudosCount={0} // PRs don't have kudos
              initialHasKudoed={false}
              initialCommentCount={0}
            />
          ))}
        </>
      );
    }
    return <Text style={styles.emptyText}>No PRs found.</Text>;
  };

  const renderMental = () => {
    if (mentalSessions && mentalSessions.length > 0) {
      return (
        <>
          {mentalSessions.map((item) => {
            const kudosCount = item.kudos?.length || 0;
            const hasKudoed = item.kudos?.some(k => k.user_id === currentUserId) || false;
            const commentCount = item.comments?.length || 0;

            return (
            <FeedCard
              key={item.id}
              avatarUrl={profile.avatar_url}
              name={profile.full_name || profile.username || 'User'}
              date={item.completed_at ? new Date(item.completed_at).toLocaleDateString() : '-'}
              title={item.session_name || item.session_type || item.type || 'Session'}
              stats={[
                { value: item.duration || '-', label: 'Minutes', highlight: true },
                { value: item.calmness_level || '-', label: 'Calmness' },
                { value: item.session_type || '-', label: 'Type', highlight: true },
              ]}
              type="mental"
              targetId={item.id}
              isOwner={currentUserId === profile.id}
              onEdit={() => handleEditMental(item.id)}
                userId={profile.id}
                photoUrl={item.photo_url}
                initialKudosCount={kudosCount}
                initialHasKudoed={hasKudoed}
                initialCommentCount={commentCount}
            />
            );
          })}
        </>
      );
    }
    return <Text style={styles.emptyText}>No mental sessions found.</Text>;
  };

  const renderWorkouts = () => {
    if (workouts && workouts.length > 0) {
      return (
        <>
          {workouts.map((item) => {
            const kudosCount = item.kudos?.length || 0;
            const hasKudoed = item.kudos?.some(k => k.user_id === currentUserId) || false;
            const commentCount = item.comments?.length || 0;

            return (
            <FeedCard
              key={item.id}
              avatarUrl={profile.avatar_url}
              name={profile.full_name || profile.username || 'User'}
              date={item.completed_at ? new Date(item.completed_at).toLocaleDateString() : '-'}
              title={item.workout_name || 'Workout'}
              stats={[
                { value: item.duration ? `${item.duration} min` : '-', label: 'Minutes', highlight: true },
                { value: item.exercise_count || '-', label: 'Exercises' },
              ]}
              type="workout"
              targetId={item.id}
              isOwner={currentUserId === profile.id}
              onEdit={() => handleEditWorkout(item.id)}
                userId={profile.id}
                photoUrl={item.photo_url}
                initialKudosCount={kudosCount}
                initialHasKudoed={hasKudoed}
                initialCommentCount={commentCount}
            />
            );
          })}
        </>
      );
    }
    return <Text style={styles.emptyText}>No workouts found.</Text>;
  };

  const renderRuns = () => {
    if (runs && runs.length > 0) {
      return (
        <>
          {runs.map((item) => {
            const distanceKm = item.distance_meters / 1000;
            const paceMinutes = item.average_pace_minutes_per_km;
            const paceFormatted = paceMinutes ? `${Math.floor(paceMinutes)}:${Math.floor((paceMinutes % 1) * 60).toString().padStart(2, '0')}` : '-';
            const kudosCount = item.kudos?.length || 0;
            const hasKudoed = item.kudos?.some(k => k.user_id === currentUserId) || false;
            const commentCount = item.comments?.length || 0;
            
            return (
              <FeedCard
                key={item.id}
                avatarUrl={profile.avatar_url}
                name={profile.full_name || profile.username || 'User'}
                date={item.start_time ? new Date(item.start_time).toLocaleDateString() : '-'}
                title={item.name || "Run"}
                description={item.notes || ""}
                stats={[
                  { value: `${distanceKm.toFixed(2)} km`, label: 'Distance', highlight: true },
                  { value: `${paceFormatted} /km`, label: 'Pace' },
                  { value: `${Math.floor(item.duration_seconds / 60)} min`, label: 'Duration' },
                ]}
                type="run"
                targetId={item.id}
                isOwner={currentUserId === profile.id}
                onEdit={() => handleEditRun(item.id)}
                userId={profile.id}
                photoUrl={item.photo_url}
                initialKudosCount={kudosCount}
                initialHasKudoed={hasKudoed}
                initialCommentCount={commentCount}
                runData={{
                  path: item.path,
                  distance_meters: item.distance_meters,
                  duration_seconds: item.duration_seconds,
                  start_time: item.start_time,
                  end_time: item.end_time
                }}
                showMapToOthers={item.show_map_to_others !== false}
              />
            );
          })}
        </>
      );
    }
    return <Text style={styles.emptyText}>No runs found.</Text>;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/community')}>
          <Ionicons name="arrow-back" size={24} color="#00ffff" />
        </TouchableOpacity>
      </View>

      {/* Profile Info Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <PremiumAvatar
            userId={profile.id}
            source={profile.avatar_url ? { uri: profile.avatar_url } : null}
            size={80}
            style={styles.avatar}
            isPremium={profile.is_premium}
            username={profile.username}
            fullName={profile.full_name}
          />
          {profile.is_premium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={16} color="#FFD700" />
            </View>
          )}
        </View>
        
        <Text style={styles.username}>@{profile.username}</Text>
        {profile.full_name && (
          <Text style={styles.fullName}>{profile.full_name}</Text>
        )}
        
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="barbell-outline" size={20} color="#00ffff" />
            <Text style={styles.statValue}>{workouts.length}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="leaf-outline" size={20} color="#00ffff" />
            <Text style={styles.statValue}>{mentalSessions.length}</Text>
            <Text style={styles.statLabel}>Mental</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="fitness-outline" size={20} color="#00ffff" />
            <Text style={styles.statValue}>{runs.length}</Text>
            <Text style={styles.statLabel}>Runs</Text>
          </View>
        </View>

        {/* Goal Section */}
        <View style={styles.goalSection}>
          <Text style={styles.goalLabel}>Fitness Goal</Text>
          <Text style={styles.goalText}>
            {profile.fitness_goal ? 
              profile.fitness_goal.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 
              'No goal set'
            }
          </Text>
        </View>

        {currentUserId === id && (
          <TouchableOpacity style={styles.seeAllButton} onPress={() => router.push('/profile/activity')}>
            <Ionicons name="list-outline" size={20} color="#00ffff" />
            <Text style={styles.seeAllButtonText}>See All Activity</Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Modern Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'prs' && styles.activeTab]}
          onPress={() => setActiveTab('prs')}
        >
          <Ionicons 
            name="trophy-outline" 
            size={20} 
            color={activeTab === 'prs' ? '#00ffff' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'prs' && styles.activeTabText]}>PRs</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'mental' && styles.activeTab]}
          onPress={() => setActiveTab('mental')}
        >
          <Ionicons 
            name="leaf-outline" 
            size={20} 
            color={activeTab === 'mental' ? '#00ffff' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'mental' && styles.activeTabText]}>Mental</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'workouts' && styles.activeTab]}
          onPress={() => setActiveTab('workouts')}
        >
          <Ionicons 
            name="barbell-outline" 
            size={20} 
            color={activeTab === 'workouts' ? '#00ffff' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'workouts' && styles.activeTabText]}>Workouts</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'runs' && styles.activeTab]}
          onPress={() => setActiveTab('runs')}
        >
          <Ionicons 
            name="fitness-outline" 
            size={20} 
            color={activeTab === 'runs' ? '#00ffff' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'runs' && styles.activeTabText]}>Runs</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        {activeTab === 'prs' && (
          <>
            <Text style={styles.sectionHeader}>Personal Records</Text>
            {renderPRs()}
          </>
        )}
        {activeTab === 'mental' && (
          <>
            <Text style={styles.sectionHeader}>Mental Sessions</Text>
            {renderMental()}
          </>
        )}
        {activeTab === 'workouts' && (
          <>
            <Text style={styles.sectionHeader}>Workouts</Text>
            {renderWorkouts()}
          </>
        )}
        {activeTab === 'runs' && (
          <>
            <Text style={styles.sectionHeader}>Runs</Text>
            {renderRuns()}
          </>
        )}
      </View>
      </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  profileCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    marginBottom: 8,
  },
  username: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  fullName: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    opacity: 0.8,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#00ffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
    textShadowColor: 'rgba(0, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  goalSection: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  goalLabel: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  goalText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    marginBottom: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  tabText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.7,
  },
  activeTabText: {
    color: '#00ffff',
    fontWeight: 'bold',
    opacity: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    color: '#00ffff',
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  cardValue: {
    color: '#fff',
    fontSize: 14,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  seeAllButton: {
    backgroundColor: '#00ffff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignSelf: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  seeAllButtonText: {
    color: '#181b1f',
    fontWeight: 'bold',
    fontSize: 16,
  },
  premiumBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default FriendProfileScreen; 