import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Image, ActivityIndicator, TouchableOpacity, RefreshControl, Modal, Alert, ScrollView, Dimensions } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../context/UserContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import FeedCard from '../components/FeedCard';
import * as ImagePicker from 'expo-image-picker';
import { PremiumAvatar } from '../components/PremiumAvatar';
import { GroupAvatar } from '../components/GroupAvatar';
import StoryFeed from '../components/StoryFeed';
import ChallengeSection from '../../components/ChallengeSection';
import { Video } from 'expo-av';
const CommunityScreen = () => {
  const { userProfile, isPremium } = useUser();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'feed' or 'groups' or 'challenges'
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendRequests, setFriendRequests] = useState([]);
  const [requesting, setRequesting] = useState({}); // { [userId]: true/false }
  const [friendships, setFriendships] = useState([]); // all friendships for current user
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [profileMap, setProfileMap] = useState({});
  const debounceRef = useRef();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  // Add new state for groups
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [groupAvatar, setGroupAvatar] = useState(null);
  const [isPublic, setIsPublic] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    is_public: true,
    avatar_url: null
  });
  const [searching, setSearching] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
const width = Dimensions.get('window').width;

// Helper function to get video duration
const getVideoDuration = async (videoUri) => {
  try {
    const { status } = await Video.getStatusAsync(videoUri);
    return status.durationMillis / 1000; // Convert to seconds
  } catch (error) {
    console.error('Error getting video duration:', error);
    return 0;
  }
};

  // Add effect to handle refresh parameter
  useEffect(() => {
    if (params.refresh === 'true' && activeTab === 'groups') {
      fetchGroups();
    }
  }, [params.refresh]);

  // Fetch friends, requests, and all friendships when tab is selected or user changes
  useEffect(() => {
    if (userProfile?.id) {
      if (activeTab === 'friends') {
        fetchFriendsAndRequests();
      }
      fetchAllFriendships();
    }
  }, [activeTab, userProfile?.id]);

  // Fetch all friendships for current user (for Find Friends logic)
  const fetchAllFriendships = async () => {
    if (!userProfile?.id) return;
    const { data, error } = await supabase
      .from('friends')
      .select('*')
      .or(`user_id.eq.${userProfile.id},friend_id.eq.${userProfile.id})`);
    if (!error) setFriendships(data || []);
  };

  // Fetch accepted friends and incoming/outgoing requests
  const fetchFriendsAndRequests = async () => {
    setFriendsLoading(true);
    try {
      // Accepted friends (status = 'accepted', either direction)
      const { data: accepted, error: acceptedError } = await supabase
        .from('friends')
        .select(`
          *,
          friend:friend_id (
            id,
            username,
            avatar_url,
            is_premium
          ),
          user:user_id (
            id,
            username,
            avatar_url,
            is_premium
          )
        `)
        .or(`user_id.eq.${userProfile.id},friend_id.eq.${userProfile.id}`)
        .eq('status', 'accepted');
      if (acceptedError) throw acceptedError;
      
      // Get the other user's id (show all accepted friendships regardless of direction)
      const friendIds = (accepted || []).map(f => f.user_id === userProfile.id ? f.friend_id : f.user_id);
      let profiles = [];
      if (friendIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, is_premium')
          .in('id', friendIds);
        if (profileError) throw profileError;
        profiles = profileData || [];
      }
      setFriends(profiles);

      // Incoming requests (status = 'pending', friend_id = current user)
      const { data: requests, error: reqError } = await supabase
        .from('friends')
        .select(`
          id,
          user_id,
          user:user_id (
            id,
            username,
            avatar_url,
            is_premium
          )
        `)
        .eq('friend_id', userProfile.id)
        .eq('status', 'pending');

      if (reqError) throw reqError;

      // Transform the data to include profile info
      const requestProfiles = requests?.map(r => ({
        ...r.user,
        friendship_id: r.id
      })) || [];

      setFriendRequests(requestProfiles);

      // Outgoing requests (status = 'pending', user_id = current user)
      const { data: outgoing, error: outError } = await supabase
        .from('friends')
        .select(`
          id,
          friend_id,
          friend:friend_id (
            id,
            username,
            avatar_url,
            is_premium
          )
        `)
        .eq('user_id', userProfile.id)
        .eq('status', 'pending');

      if (outError) throw outError;

      // Transform the data to include profile info
      const outgoingProfiles = outgoing?.map(r => ({
        ...r.friend,
        friendship_id: r.id
      })) || [];

      setOutgoingRequests(outgoingProfiles);
    } catch (e) {
      console.error('Error fetching friends and requests:', e);
      setFriends([]);
      setFriendRequests([]);
      setOutgoingRequests([]);
    } finally {
      setFriendsLoading(false);
    }
  };

  // Accept or decline a friend request
  const handleRequestAction = async (friendshipId, action) => {
    if (!friendshipId) return;
    if (action === 'accept') {
      await supabase.from('friends').update({ status: 'accepted' }).eq('id', friendshipId);
    } else if (action === 'decline') {
      await supabase.from('friends').update({ status: 'declined' }).eq('id', friendshipId);
    }
    fetchFriendsAndRequests();
    fetchAllFriendships();
  };

  // Add friend request
  const handleAddFriend = async (targetId) => {
    setRequesting(r => ({ ...r, [targetId]: true }));
    await supabase.from('friends').insert({ user_id: userProfile.id, friend_id: targetId, status: 'pending' });
    setRequesting(r => ({ ...r, [targetId]: false }));
    fetchAllFriendships();
  };

  // Check friendship status for a user (for Find Friends tab)
  const getFriendshipStatus = (targetId) => {
    const rel = friendships.find(f =>
      (f.user_id === userProfile.id && f.friend_id === targetId) ||
      (f.friend_id === userProfile.id && f.user_id === targetId)
    );
    if (!rel) return null;
    return rel.status;
  };

  // Calculate mutual friends count for any user
  const getMutualFriendsCount = (targetId) => {
    if (!userProfile?.id || !targetId) return 0;
    
    // Get current user's friends
    const currentUserFriends = new Set();
    friendships.forEach(f => {
      if (f.status === 'accepted') {
        if (f.user_id === userProfile.id) {
          currentUserFriends.add(f.friend_id);
        } else if (f.friend_id === userProfile.id) {
          currentUserFriends.add(f.user_id);
        }
      }
    });
    
    // Get target user's friends
    const targetUserFriends = new Set();
    friendships.forEach(f => {
      if (f.status === 'accepted') {
        if (f.user_id === targetId) {
          targetUserFriends.add(f.friend_id);
        } else if (f.friend_id === targetId) {
          targetUserFriends.add(f.user_id);
        }
      }
    });
    
    // Count mutual friends
    let mutualCount = 0;
    currentUserFriends.forEach(friendId => {
      if (targetUserFriends.has(friendId)) {
        mutualCount++;
      }
    });
    
    return mutualCount;
  };

  // Get mutual friends style based on count
  const getMutualFriendsStyle = (count) => {
    if (count >= 5) {
      return [styles.mutualFriendsText, styles.manyMutualFriends];
    } else if (count >= 2) {
      return [styles.mutualFriendsText, styles.someMutualFriends];
    }
    return styles.mutualFriendsText;
  };

  const handleSearch = (text) => {
    setSearch(text);
    setSearchResults([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) return;
    debounceRef.current = setTimeout(() => searchUsers(text), 400);
  };

  // Current O(n) search
  const searchUsers = async (text) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_premium')
        .ilike('username', `%${text}%`) // Linear search
        .limit(10);
    } catch (e) {
      console.error('Error searching users:', e);
    } finally {
      setLoading(false);
    }
  };

  // Priority Queue implementation for feed algorithm
  class PriorityQueue {
    constructor() {
      this.queue = [];
    }
    
    enqueue(item, priority) {
      this.queue.push({ item, priority });
      this.queue.sort((a, b) => b.priority - a.priority); // Higher priority first
    }
    
    dequeue() {
      return this.queue.shift()?.item;
    }
    
    isEmpty() {
      return this.queue.length === 0;
    }
    
    size() {
      return this.queue.length;
    }
  }

  // Improved with Trie/Indexing
  class SearchIndex {
    constructor() {
      this.trie = new Map();
      this.userMap = new Map();
    }
    
    addUser(user) {
      // Build prefix tree for O(log n) search
      const username = user.username.toLowerCase();
      for (let i = 0; i < username.length; i++) {
        const prefix = username.substring(0, i + 1);
        if (!this.trie.has(prefix)) {
          this.trie.set(prefix, new Set());
        }
        this.trie.get(prefix).add(user.id);
      }
      this.userMap.set(user.id, user);
    }
    
    search(prefix) {
      const userIds = this.trie.get(prefix.toLowerCase()) || new Set();
      return Array.from(userIds).map(id => this.userMap.get(id));
    }
  }


  const renderResult = ({ item }) => (
    <TouchableOpacity onPress={() => router.push(`/profile/${item.id}`)}>
      <View style={styles.resultRow}>
        <PremiumAvatar
          size={40}
          source={item.avatar_url ? { uri: item.avatar_url } : null}
          isPremium={item.is_premium}
          username={item.username}
          fullName={item.full_name}
          style={{ marginRight: 16 }}
        />
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username}</Text>
          {item.id !== userProfile.id && (
            <Text style={getMutualFriendsStyle(getMutualFriendsCount(item.id))}>
              {getMutualFriendsCount(item.id)} mutual friend{getMutualFriendsCount(item.id) !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        {activeTab === 'friends' && item.id !== userProfile.id && (
          (() => {
            const status = getFriendshipStatus(item.id);
            if (status === 'accepted') return <Text style={styles.friendStatus}>Friends</Text>;
            if (status === 'pending') return <Text style={styles.friendStatus}>Requested</Text>;
            return (
              <TouchableOpacity
                style={styles.addFriendBtn}
                onPress={() => handleAddFriend(item.id)}
                disabled={!!requesting[item.id]}
              >
                <Text style={styles.addFriendBtnText}>{requesting[item.id] ? 'Requesting...' : 'Add Friend'}</Text>
              </TouchableOpacity>
            );
          })()
        )}
      </View>
    </TouchableOpacity>
  );

  // Add Feed tab
  const fetchFeed = async () => {
    setFeedLoading(true);
    try {
      // Get all accepted friends' IDs
      const { data: accepted, error: acceptedError } = await supabase
        .from('friends')
        .select('*')
        .or(`user_id.eq.${userProfile.id},friend_id.eq.${userProfile.id}`)
        .eq('status', 'accepted');
      if (acceptedError) throw acceptedError;
      const friendIds = (accepted || []).map(f => f.user_id === userProfile.id ? f.friend_id : f.user_id);
      // Include current user's ID in the list
      const allUserIds = [...new Set([...friendIds, userProfile.id])];
    
      if (allUserIds.length === 0) {
        setFeed([]);
        setFeedLoading(false);
        setProfileMap({});
        return;
      }
      class FeedAlgorithm {
        constructor() {
          this.priorityQueue = new PriorityQueue();
          this.userWeights = new Map(); // User engagement weights
        }
        
        calculatePostScore(post, userProfile) {
          let score = 0;
          
          // Time decay (newer posts get higher score)
          const hoursAgo = (Date.now() - new Date(post.date).getTime()) / (1000 * 60 * 60);
          score += Math.max(0, 100 - hoursAgo * 2);
          
          // Engagement boost
          score += post.kudos.length * 10;
          score += post.comments.length * 15;
          
          // User relationship weight
          const relationshipWeight = this.userWeights.get(post.user_id) || 1;
          score *= relationshipWeight;
          
          // Content type boost
          const typeBoosts = { 'pr': 1.5, 'workout': 1.2, 'mental': 1.3, 'run': 1.1 };
          score *= typeBoosts[post.type] || 1;
          
        const userPostLike = post.kudos.some(kudo => kudo.post_type === post.type && kudo.user_id === userProfile.id);
        if (userPostLike) {
          score += 10;
        }
          return score;
        }
        
        generateSmartFeed(posts, userProfile) {
          posts.forEach(post => {
            const score = this.calculatePostScore(post, userProfile);
            this.priorityQueue.enqueue(post, score);
          });
          
          const smartFeed = [];
          while (!this.priorityQueue.isEmpty() && smartFeed.length < 50) {
            smartFeed.push(this.priorityQueue.dequeue());//dequeue is a method that removes and returns the highets priority item from the queue 
          }
          
          return smartFeed;
        }
        
      }
      // Fetch all profiles (including current user)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', allUserIds);
      const newProfileMap = {};
      (profiles || []).forEach(p => { newProfileMap[p.id] = p; });
      setProfileMap(newProfileMap);
    
      // Fetch workouts
      const { data: workouts } = await supabase
        .from('user_workout_logs')
        .select('*')
        .in('user_id', allUserIds);
    
      // Fetch mental sessions
      const { data: mentals } = await supabase
        .from('mental_session_logs')
        .select('*')
        .in('profile_id', allUserIds);
    
      // Fetch PRs
      const { data: prs } = await supabase
        .from('personal_records')
        .select('*')
        .in('profile_id', allUserIds);

      // Fetch runs
      const { data: runs } = await supabase
        .from('runs')
        .select('*')
        .in('user_id', allUserIds);

      // Fetch all kudos in bulk
      const { data: workoutKudos } = await supabase
        .from('workout_kudos')
        .select('*')
        .in('workout_id', (workouts || []).map(w => w.id));

      const { data: mentalKudos } = await supabase
        .from('mental_session_kudos')
        .select('*')
        .in('session_id', (mentals || []).map(m => m.id));

      const { data: runKudos } = await supabase
        .from('run_kudos')
        .select('*')
        .in('run_id', (runs || []).map(r => r.id));

      // Fetch all comments in bulk
      const { data: workoutComments } = await supabase
        .from('workout_comments')
        .select('*')
        .in('workout_id', (workouts || []).map(w => w.id));

      const { data: mentalComments } = await supabase
        .from('mental_session_comments')
        .select('*')
        .in('session_id', (mentals || []).map(m => m.id));

      const { data: runComments } = await supabase
        .from('run_comments')
        .select('*')
        .in('run_id', (runs || []).map(r => r.id));

      // Create lookup maps for kudos and comments
      const kudosMap = {};
      const commentsMap = {};

      // Process workout kudos
      (workoutKudos || []).forEach(k => {
        if (!kudosMap[k.workout_id]) kudosMap[k.workout_id] = [];
        kudosMap[k.workout_id].push(k);
      });

      // Process mental session kudos
      (mentalKudos || []).forEach(k => {
        if (!kudosMap[k.session_id]) kudosMap[k.session_id] = [];
        kudosMap[k.session_id].push(k);
      });

      // Process run kudos
      (runKudos || []).forEach(k => {
        if (!kudosMap[k.run_id]) kudosMap[k.run_id] = [];
        kudosMap[k.run_id].push(k);
      });

      // Process workout comments
      (workoutComments || []).forEach(c => {
        if (!commentsMap[c.workout_id]) commentsMap[c.workout_id] = [];
        commentsMap[c.workout_id].push(c);
      });

      // Process mental session comments
      (mentalComments || []).forEach(c => {
        if (!commentsMap[c.session_id]) commentsMap[c.session_id] = [];
        commentsMap[c.session_id].push(c);
      });

      // Process run comments
      (runComments || []).forEach(c => {
        if (!commentsMap[c.run_id]) commentsMap[c.run_id] = [];
        commentsMap[c.run_id].push(c);
      });
    
      // Combine and sort
      let feedItems = [];
      (workouts || []).forEach(item => feedItems.push({
        ...item,
        type: 'workout',
        date: item.completed_at,
        user_id: item.user_id,
        kudos: kudosMap[item.id] || [],
        comments: commentsMap[item.id] || [],
      }));
      (mentals || []).forEach(item => feedItems.push({
        ...item,
        type: 'mental',
        date: item.completed_at,
        user_id: item.profile_id,
        kudos: kudosMap[item.id] || [],
        comments: commentsMap[item.id] || [],
      }));
      (prs || []).forEach(item => feedItems.push({
        ...item,
        type: 'pr',
        date: item.created_at,
        user_id: item.profile_id,
        kudos: [],
        comments: [],
      }));
      (runs || []).forEach(item => feedItems.push({
        ...item,
        type: 'run',
        date: item.start_time,
        user_id: item.user_id,
        kudos: kudosMap[item.id] || [],
        comments: commentsMap[item.id] || [],
      }));
      feedItems.sort((a, b) => new Date(b.date) - new Date(a.date));
      setFeed(feedItems);
    } catch (e) {
      console.error('Error fetching feed:', e);
      setFeed([]);
      setProfileMap({});
    } finally {
      setFeedLoading(false);
    }
  };

  // Add edit handlers
  const handleEditWorkout = (workoutId) => {
    router.push(`/edit-workout/${workoutId}`);
  };

  const handleEditMental = (sessionId) => {
    router.push(`/edit-mental/${sessionId}`);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'feed') {
      fetchFeed().finally(() => setRefreshing(false));
    } else if (activeTab === 'friends') {
      fetchFriendsAndRequests().finally(() => setRefreshing(false));
    } else if (activeTab === 'groups') {
      fetchGroups().finally(() => setRefreshing(false));
    }
  }, [activeTab]);

  // Fetch user's groups
  const fetchGroups = async () => {
    setGroupsLoading(true);
    try {
      if (!userProfile?.id) return;

      // Get groups where user is a member
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userProfile.id);

      if (memberError) throw memberError;

      if (memberGroups && memberGroups.length > 0) {
        const groupIds = memberGroups.map(mg => mg.group_id);
      
        // Get groups with member counts
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select(`
            *,
            member_count:group_members(count)
          `)
          .in('id', groupIds)
          .order('created_at', { ascending: false });

        if (groupsError) throw groupsError;

        // Transform the data to get the actual count number
        const transformedGroups = groupsData?.map(group => ({
          ...group,
          member_count: group.member_count[0]?.count || 0
        })) || [];

        setGroups(transformedGroups);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

const handleUploadVideo = async () => {
  try {
      // Check if Video module is available
      if (!Video) {
        Alert.alert('Error', 'Video functionality not available');
        return null;
      }

    // Launch camera to record video with specific settings
    // allowsEditing: lets user trim video
    // videoDuration: limits recording to 30 seconds
    const video = await Video.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
      videoMaxDuration: 30, // Limit video duration to 30 seconds
    });

      if (!video.canceled && video.assets && video.assets[0]) {
      const file = video.assets[0];
      
      // Check video duration before uploading
      const duration = await getVideoDuration(file.uri);
      if (duration > 30) {
        Alert.alert('Error', 'Video must be less than 30 seconds');
          return null;
      }

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: 'video/mp4',
        name: `story_${Date.now()}.mp4`, // Unique filename
      });
      
      // Add upload preset for Cloudinary
      formData.append('upload_preset', 'stories'); // Changed to stories preset
      
      // Upload to Cloudinary
      const cloudinaryUrl = 'https://api.cloudinary.com/v1_1/derqwaq9h/video/upload';
      const response = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      if (!data.secure_url) {
        throw new Error('Upload failed');
      }
      return data.secure_url;
    }
    return null;
  } catch (error) {
    console.error('Error uploading video:', error);
    Alert.alert('Error', 'Failed to upload video. Please try again.');
    return null;
  }
};

// Create new group
const handleCreateGroup = async () => {
  try {
    if (!userProfile?.id) {
      Alert.alert('Error', 'Please log in to create a group');
        return;
      }

      if (!newGroup.name || newGroup.name.length < 3) {
        Alert.alert('Error', 'Group name must be at least 3 characters long');
        return;
      }

      // Create the group - the trigger will automatically add the creator as owner
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: newGroup.name,
          description: newGroup.description,
          is_public: newGroup.is_public,
          avatar_url: newGroup.avatar_url,
          created_by: userProfile.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Refresh groups list
      await fetchGroups();
    
      // Close modal and reset form
      setShowCreateGroupModal(false);
      setNewGroup({
        name: '',
        description: '',
        is_public: true,
        avatar_url: null
      });

      Alert.alert('Success', 'Group created successfully!', [
        {
          text: 'View Group',
          onPress: () => router.push(`/group/${group.id}`)
        }
      ]);
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    }
  };

  // Join group
  const handleJoinGroup = async (groupId) => {
    try {
      if (!userProfile?.id) {
        Alert.alert('Error', 'Please log in to join a group');
        return;
      }

      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userProfile.id,
          role: 'member'
        });

      if (error) throw error;

      // Refresh groups list
      fetchGroups();
      Alert.alert('Success', 'Joined group successfully!');
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Error', 'Failed to join group. Please try again.');
    }
  };

  // Leave group
  const handleLeaveGroup = async (groupId) => {
    try {
      if (!userProfile?.id) {
        Alert.alert('Error', 'Please log in to leave a group');
        return;
      }

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userProfile.id);

      if (error) throw error;

      // Refresh groups list
      fetchGroups();
      Alert.alert('Success', 'Left group successfully!');
    } catch (error) {
      console.error('Error leaving group:', error);
      Alert.alert('Error', 'Failed to leave group. Please try again.');
    }
  };

  // Upload group avatar
  const handleUploadAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const file = result.assets[0];
      
        // Create form data for Cloudinary upload
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          type: 'image/jpeg',
          name: 'upload.jpg',
        });
        formData.append('upload_preset', 'profilepics');
        const cloudinaryUrl = 'https://api.cloudinary.com/v1_1/derqwaq9h/image/upload';
      
        const response = await fetch(cloudinaryUrl, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
        });

        const data = await response.json();
      
        if (!data.secure_url) {
          throw new Error('Upload failed');
        }

        setNewGroup(prev => ({ ...prev, avatar_url: data.secure_url }));
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert(
        'Upload Failed',
        error.message || 'Failed to upload avatar. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };


  // Add function to search all groups
  const searchGroups = async (text) => {
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          member_count:group_members(count)
        `)
        .ilike('name', `%${text}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to get the actual count number
      const transformedGroups = data?.map(group => ({
        ...group,
        member_count: group.member_count[0]?.count || 0
      })) || [];

      setSearchResults(transformedGroups);
    } catch (error) {
      console.error('Error searching groups:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Add function to fetch invitations
  const fetchInvitations = async () => {
    try {
      setInvitationsLoading(true);
      const { data, error } = await supabase
        .from('group_invitations')
        .select(`
          *,
          group:group_id (
            id,
            name,
            avatar_url,
            description,
            is_public
          ),
          inviter:invited_by_id (
            id,
            username,
            avatar_url,
            full_name
          )
        `)
        .eq('invited_user_id', userProfile.id)
        .eq('status', 'pending');

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setInvitationsLoading(false);
    }
  };

  // Update useEffect to fetch invitations
  useEffect(() => {
    fetchGroups();
    fetchInvitations();
  }, []);

  // Add function to handle invitation response
  const handleInvitationResponse = async (invitationId, accept) => {
    try {
      if (accept) {
        // Get the invitation details
        const { data: invitation, error: invitationError } = await supabase
          .from('group_invitations')
          .select('*')
          .eq('id', invitationId)
          .single();

        if (invitationError) throw invitationError;

        // Add user to group members
        const { error: memberError } = await supabase
          .from('group_members')
          .insert({
            group_id: invitation.group_id,
            user_id: userProfile.id,
            role: 'member'
          });

        if (memberError) throw memberError;
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('group_invitations')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      // Refresh data
      fetchInvitations();
      if (accept) {
        fetchGroups();
      }
    } catch (error) {
      console.error('Error handling invitation:', error);
      Alert.alert('Error', 'Failed to process invitation. Please try again.');
    }
  };

  const handleToggleKudos = async (type, targetId) => {
    try {
      // Special handling for runs
      if (type === 'run') {
        const { data: existingKudos, error: fetchError } = await supabase
          .from('run_kudos')
          .select('*')
          .eq('run_id', targetId)
          .eq('user_id', userProfile.id);

        if (fetchError) {
          console.error('Error checking run kudos:', fetchError);
          return;
        }

        if (existingKudos && existingKudos.length > 0) {
          // If kudos exists, remove it
          const { error: deleteError } = await supabase
            .from('run_kudos')
            .delete()
            .eq('run_id', targetId)
            .eq('user_id', userProfile.id);

          if (deleteError) {
            console.error('Error removing run kudos:', deleteError);
            return;
          }
        } else {
          // If no kudos exists, add it
          const { error: insertError } = await supabase
            .from('run_kudos')
            .insert([
              {
                run_id: targetId,
                user_id: userProfile.id,
              },
            ]);

          if (insertError) {
            console.error('Error adding run kudos:', insertError);
            return;
          }
        }
      } else {
        // Handle other types (workout, mental) as before
        const { data: existingKudos, error: fetchError } = await supabase
          .from(`${type}_kudos`)
          .select('*')
          .eq(`${type}_id`, targetId)
          .eq('user_id', userProfile.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Error checking existing kudos:', fetchError);
          return;
        }

        if (existingKudos) {
          // If kudos exists, remove it
          const { error: deleteError } = await supabase
            .from(`${type}_kudos`)
            .delete()
            .eq(`${type}_id`, targetId)
            .eq('user_id', userProfile.id);

          if (deleteError) {
            console.error('Error removing kudos:', deleteError);
            return;
          }
        } else {
          // If no kudos exists, add it
          const { error: insertError } = await supabase
            .from(`${type}_kudos`)
            .insert([
              {
                [`${type}_id`]: targetId,
                user_id: userProfile.id,
              },
            ]);

          if (insertError) {
            console.error('Error adding kudos:', insertError);
            return;
          }
        }
      }

      // Refresh the feed to update kudos count
      fetchFeed();
    } catch (error) {
      console.error('Error toggling kudos:', error);
    }
  };

  // Friend Suggestion Engine
  class FriendRecommendationEngine {
    constructor() {
      // Adjacency List: Maps user ID to their friends
      this.friendshipGraph = new Map();
      
      // Cache for user profiles to avoid repeated API calls
      this.userProfiles = new Map();
      
      // Track mutual friend counts for each suggestion
      this.mutualFriendCounts = new Map();
    }

    /**
     * Build the friendship graph from database data
     * This creates our adjacency list representation
     */
    buildFriendshipGraph(friendships) {
      console.log('Building friendship graph...');
      
      friendships.forEach(friendship => {
        const { user_id, friend_id, status } = friendship;
        
        // Only consider accepted friendships
        if (status !== 'accepted') return;
        
        // Initialize user entries if they don't exist
        if (!this.friendshipGraph.has(user_id)) {
          this.friendshipGraph.set(user_id, new Set());
        }
        if (!this.friendshipGraph.has(friend_id)) {
          this.friendshipGraph.set(friend_id, new Set());
        }
        
        // Add bidirectional friendship (if A is friends with B, B is friends with A)
        this.friendshipGraph.get(user_id).add(friend_id);
        this.friendshipGraph.get(friend_id).add(user_id);
      });
      
      console.log(`Graph built with ${this.friendshipGraph.size} users`);
    }

    /**
     * Get friend suggestions using the "Friend of Friend" algorithm
     * Time Complexity: O(F * F') where F = friends, F' = friends of friends
     * Space Complexity: O(F * F')
     */
    getFriendSuggestions(targetUserId, maxSuggestions = 10) {
      console.log(`Getting suggestions for user ${targetUserId}`);
      
      // Step 1: Get target user's friends
      const targetFriends = this.friendshipGraph.get(targetUserId) || new Set();
      console.log(`Target user has ${targetFriends.size} friends`);
      
      if (targetFriends.size === 0) {
        console.log('No friends found, cannot generate suggestions');
        return [];
      }
      
      // Step 2: Find all friends of friends
      const suggestions = new Map(); // userId -> mutual friend count
      const visited = new Set([targetUserId]); // Track visited users
      
      // For each friend of the target user
      targetFriends.forEach(friendId => {
        // Get that friend's friends
        const friendsOfFriend = this.friendshipGraph.get(friendId) || new Set();
        
        // For each friend of friend
        friendsOfFriend.forEach(friendOfFriendId => {
          // Skip if it's the target user or already a friend
          if (friendOfFriendId === targetUserId || targetFriends.has(friendOfFriendId)) {
            return;
          }
          
          // Count this as a mutual friend
          const currentCount = suggestions.get(friendOfFriendId) || 0;
          suggestions.set(friendOfFriendId, currentCount + 1);
        });
      });
      
      // Step 3: Sort by mutual friend count and return top suggestions
      const sortedSuggestions = Array.from(suggestions.entries())
        .sort(([, countA], [, countB]) => countB - countA) // Sort descending
        .slice(0, maxSuggestions)
        .map(([userId, mutualCount]) => ({
          userId,
          mutualFriends: mutualCount,
          score: this.calculateSuggestionScore(userId, mutualCount)
        }));
      
      console.log(`Generated ${sortedSuggestions.length} suggestions`);
      return sortedSuggestions;
    }

    /**
     * Calculate a suggestion score based on multiple factors
     * This makes the algorithm more sophisticated
     */
    calculateSuggestionScore(userId, mutualCount) {
      let score = mutualCount * 10; // Base score from mutual friends
      
      // Bonus for having many mutual friends (exponential growth)
      if (mutualCount >= 3) {
        score += Math.pow(mutualCount, 2) * 5;
      }
      
      // Consider user's total friend count (people with fewer friends might be more likely to accept)
      const userFriends = this.friendshipGraph.get(userId) || new Set();
      const friendCount = userFriends.size;
      
      if (friendCount < 10) {
        score += 20; // Bonus for users with fewer friends
      } else if (friendCount > 100) {
        score -= 10; // Penalty for users with many friends (might be less responsive)
      }
      
      return score;
    }

    /**
     * Enhanced algorithm that considers multiple hops
     * This finds people who are 2-3 degrees away
     */
    getMultiHopSuggestions(targetUserId, maxHops = 2, maxSuggestions = 15) {
      console.log(`Getting multi-hop suggestions (max ${maxHops} hops)`);
      
      const suggestions = new Map(); // userId -> { mutualFriends, hopDistance }
      const visited = new Set([targetUserId]);
      const queue = [{ userId: targetUserId, distance: 0 }];
      
      // Breadth-First Search (BFS) to explore the network
      while (queue.length > 0) {
        const { userId: currentUser, distance } = queue.shift();
        
        if (distance >= maxHops) continue;
        
        const friends = this.friendshipGraph.get(currentUser) || new Set();
        
        friends.forEach(friendId => {
          if (!visited.has(friendId)) {
            visited.add(friendId);
            
            // Only count as suggestion if not the target user and not already a friend
            if (friendId !== targetUserId && distance > 0) {
              const currentData = suggestions.get(friendId) || { mutualFriends: 0, hopDistance: distance };
              currentData.mutualFriends += 1;
              currentData.hopDistance = Math.min(currentData.hopDistance, distance);
              suggestions.set(friendId, currentData);
            }
            
            // Add to queue for next hop exploration
            queue.push({ userId: friendId, distance: distance + 1 });
          }
        });
      }
      
      // Sort by score (mutual friends + distance factor)
      const sortedSuggestions = Array.from(suggestions.entries())
        .map(([userId, data]) => ({
          userId,
          mutualFriends: data.mutualFriends,
          hopDistance: data.hopDistance,
          score: data.mutualFriends * 10 - data.hopDistance * 5 // Closer = better
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSuggestions);
      
      return sortedSuggestions;
    }

    /**
     * Interest-based suggestions using Jaccard similarity
     * This considers user interests and activities
     */
    getInterestBasedSuggestions(targetUserId, userInterests) {
      console.log('Getting interest-based suggestions');
      
      const targetInterests = userInterests.get(targetUserId) || new Set();
      const suggestions = new Map();
      
      // Compare with all other users
      for (const [userId, interests] of userInterests.entries()) {
        if (userId === targetUserId) continue;
        
        // Calculate Jaccard similarity
        
        const intersection = new Set([...targetInterests].filter(x => interests.has(x)));
        const union = new Set([...targetInterests, ...interests]);
        
        const similarity = intersection.size / union.size;
        
        if (similarity > 0.1) { // Only suggest if there's some similarity
          suggestions.set(userId, {
            similarity,
            commonInterests: Array.from(intersection),
            totalInterests: union.size
          });
        }
      }
      
      return Array.from(suggestions.entries())
        .sort(([, a], [, b]) => b.similarity - a.similarity)
        .slice(0, 10)
        .map(([userId, data]) => ({
          userId,
          similarity: data.similarity,
          commonInterests: data.commonInterests,
          score: data.similarity * 100
        }));
    }

    /**
     * Hybrid approach combining multiple algorithms
     */
    getHybridSuggestions(targetUserId, userInterests, weights = { mutual: 0.6, interest: 0.4 }) {
      console.log('Getting hybrid suggestions');
      
      const mutualSuggestions = this.getFriendSuggestions(targetUserId, 20);
      const interestSuggestions = this.getInterestBasedSuggestions(targetUserId, userInterests);
      
      // Combine and normalize scores
      const combinedScores = new Map();
      
      // Add mutual friend scores
      mutualSuggestions.forEach(suggestion => {
        combinedScores.set(suggestion.userId, {
          mutualScore: suggestion.score,
          interestScore: 0,
          totalScore: suggestion.score * weights.mutual
        });
      });
      
      // Add interest scores
      interestSuggestions.forEach(suggestion => {
        const existing = combinedScores.get(suggestion.userId);
        if (existing) {
          existing.interestScore = suggestion.score;
          existing.totalScore += suggestion.score * weights.interest;
        } else {
          combinedScores.set(suggestion.userId, {
            mutualScore: 0,
            interestScore: suggestion.score,
            totalScore: suggestion.score * weights.interest
          });
        }
      });
      
      // Sort by total score
      return Array.from(combinedScores.entries())
        .map(([userId, scores]) => ({
          userId,
          ...scores
        }))
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 15);
    }
  }

  const FriendSuggestionEngine = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const recommendationEngine = useRef(new FriendRecommendationEngine());

    const generateSuggestions = async () => {
      setLoading(true);
      
      try {
        // 1. Fetch all friendships from database
        const { data: friendships, error } = await supabase
          .from('friends')
          .select('*')
          .eq('status', 'accepted');
        
        if (error) throw error;
        
        // 2. Build the friendship graph
        recommendationEngine.current.buildFriendshipGraph(friendships);
        
        // 3. Generate suggestions with mutual friends count
        const friendSuggestions = recommendationEngine.current.getFriendSuggestions(userProfile.id);
        
        // 4. Fetch user profiles for suggestions
        const userIds = friendSuggestions.map(s => s.userId);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, is_premium')
          .in('id', userIds);
        
        // 5. Combine suggestions with profile data and mutual friends count
        const suggestionsWithProfiles = friendSuggestions.map(suggestion => {
          const profile = profiles.find(p => p.id === suggestion.userId);
          return {
            ...suggestion,
            profile,
            mutualFriends: suggestion.mutualFriends // This comes from the algorithm
          };
        });
        
        setSuggestions(suggestionsWithProfiles);
        
      } catch (error) {
        console.error('Error generating suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    // Call this when component mounts or when needed
    useEffect(() => {
      if (userProfile?.id) {
        generateSuggestions();
      }
    }, [userProfile?.id]);

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.sectionTitle}>People You May Know</Text>
        
        {loading ? (
          <ActivityIndicator color="#00ffff" />
        ) : (
          <FlatList
            data={suggestions}
            keyExtractor={item => item.userId}
            renderItem={({ item }) => (
              <View style={styles.suggestionCard}>
                <PremiumAvatar
                  size={50}
                  source={item.profile?.avatar_url ? { uri: item.profile.avatar_url } : null}
                  isPremium={item.profile?.is_premium}
                  username={item.profile?.username}
                />
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionName}>
                    {item.profile?.username || 'User'}
                  </Text>
                  <Text style={styles.mutualFriends}>
                    {item.mutualFriends || 0} mutual friend{(item.mutualFriends || 0) !== 1 ? 's' : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addFriendButton}
                  onPress={() => handleAddFriend(item.userId)}
                >
                  <Text style={styles.addFriendText}>Add Friend</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    );
  };

    return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Community</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.suggestedButton}
            onPress={() => router.push('/suggested-friends')}
          >
            <Ionicons name="people-outline" size={20} color="cyan" />
            <Text style={styles.suggestedButtonText}>Suggested Friends</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.suggestedButton}
            onPress={() => router.push('/suggested-groups')}
          >
            <Ionicons name="people-circle-outline" size={20} color="cyan" />
            <Text style={styles.suggestedButtonText}>Suggested Groups</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'feed' && styles.activeTab]}
          onPress={() => { setActiveTab('feed'); fetchFeed(); }}
        >
          <Text style={[styles.tabText, activeTab === 'feed' && styles.activeTabText]}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>Groups</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'challenges' && styles.activeTab]}
          onPress={() => setActiveTab('challenges')}
        >
          <Text style={[styles.tabText, activeTab === 'challenges' && styles.activeTabText]}>Challenges</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scrollView}>
        {activeTab === 'feed' ? (
          <>
            <StoryFeed />
            {feedLoading ? (
              <ActivityIndicator color="#00ffff" style={{ marginTop: 32 }} />
            ) : feed.length === 0 ? (
              <Text style={{ color: '#fff', marginTop: 32, textAlign: 'center' }}>
                No recent activity from your friends yet.
              </Text>
            ) : (
              <FlatList
                data={feed}
                keyExtractor={item => `${item.type}_${item.id}`}
                renderItem={({ item }) => {
                  const profile = profileMap[item.user_id] || {};
                  const isOwnActivity = item.user_id === userProfile.id;
                  const kudosCount = item.kudos.length;
                  const hasKudoed = item.kudos.some(k => k.user_id === userProfile.id);
                  const commentCount = item.comments.length;
                
                  if (item.type === 'workout') {
                    return (
                      <FeedCard
                        avatarUrl={profile.avatar_url}
                        name={profile.full_name || profile.username || 'User'}
                        date={item.completed_at ? new Date(item.completed_at).toLocaleDateString() : '-'}
                        title={item.workout_name || 'Workout'}
                        description={item.description || ''}
                        stats={[
                          { value: item.duration ? `${item.duration} min` : '-', label: 'Minutes', highlight: true },
                          { value: item.exercise_count || '-', label: 'Exercises' },
                        ]}
                        type="workout"
                        targetId={item.id}
                        isOwner={isOwnActivity}
                        onEdit={isOwnActivity ? () => handleEditWorkout(item.id) : undefined}
                        userId={item.user_id}
                        photoUrl={item.photo_url}
                        initialKudosCount={kudosCount}
                        initialHasKudoed={hasKudoed}
                        initialCommentCount={commentCount}
                      />
                    );
                  } else if (item.type === 'mental') {
                    return (
                      <FeedCard
                        avatarUrl={profile.avatar_url}
                        name={profile.full_name || profile.username || 'User'}
                        date={item.completed_at ? new Date(item.completed_at).toLocaleDateString() : '-'}
                        title={item.session_name || item.session_type || item.type || 'Session'}
                        description={item.description || ''}
                        stats={[
                          { value: item.duration || '-', label: 'Minutes', highlight: true },
                          { value: item.calmness_level || '-', label: 'Calmness' },
                          { value: item.session_type || '-', label: 'Type', highlight: true },
                        ]}
                        type="mental"
                        targetId={item.id}
                        isOwner={isOwnActivity}
                        onEdit={isOwnActivity ? () => handleEditMental(item.id) : undefined}
                        userId={item.user_id}
                        photoUrl={item.photo_url}
                        initialKudosCount={kudosCount}
                        initialHasKudoed={hasKudoed}
                        initialCommentCount={commentCount}
                      />
                    );
                  } else if (item.type === 'pr') {
                    return (
                      <FeedCard
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
                        isOwner={isOwnActivity}
                        userId={item.user_id}
                      />
                    );
                  } else if (item.type === 'run') {
                    const distanceKm = item.distance_meters / 1000;
                    const paceMinutes = item.average_pace_minutes_per_km;
                    const paceFormatted = paceMinutes ? `${Math.floor(paceMinutes)}:${Math.floor((paceMinutes % 1) * 60).toString().padStart(2, '0')}` : '-';
                  
                    return (
                      <FeedCard
                        avatarUrl={profile.avatar_url}
                        name={profile.full_name || profile.username || 'User'}
                        date={item.start_time ? new Date(item.start_time).toLocaleDateString() : '-'}
                        title="Run"
                        stats={[
                          { value: `${distanceKm.toFixed(2)} km`, label: 'Distance', highlight: true },
                          { value: `${paceFormatted} /km`, label: 'Pace' },
                          { value: `${Math.floor(item.duration_seconds / 60)} min`, label: 'Duration' },
                        ]}
                        type="run"
                        targetId={item.id}
                        isOwner={isOwnActivity}
                        userId={item.user_id}
                        initialKudosCount={item.kudos.length}
                        initialHasKudoed={item.kudos.some(k => k.user_id === userProfile.id)}
                        initialCommentCount={item.comments.length}
                      />
                    );
                  }
                  return null;
                }}
                style={{ marginTop: 16 }}
                scrollEnabled={false}
              />
            )}
          </>
        ) : activeTab === 'groups' ? (
          <View style={styles.groupsContainer}>
            <View style={styles.groupsHeader}>
              <Text style={styles.sectionTitle}>Groups</Text>
              {isPremium ? (
                <TouchableOpacity onPress={() => setShowCreateGroupModal(true)}>
                  <Ionicons name="add-circle" size={28} color="#00ffff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setShowPremiumModal(true)}>
                  <Ionicons name="add-circle" size={28} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search groups..."
              placeholderTextColor="#888"
              value={groupSearch}
              onChangeText={(text) => {
                setGroupSearch(text);
                searchGroups(text);
              }}
            />

            {invitations.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Group Invitations</Text>
                {invitations.map((invitation) => (
                  <View key={invitation.id} style={styles.invitationCard}>
                    <GroupAvatar
                      groupName={invitation.group?.name}
                      size={50}
                      source={invitation.group?.avatar_url ? { uri: invitation.group.avatar_url } : null}
                      style={styles.invitationAvatar}
                    />
                    <View style={styles.invitationInfo}>
                      <Text style={styles.invitationName}>
                        {invitation.group?.name}
                      </Text>
                      <Text style={styles.invitationInviter}>
                        Invited by {invitation.inviter?.full_name || invitation.inviter?.username}
                      </Text>
                      <Text style={styles.invitationDescription}>
                        {invitation.group?.description || 'No description available'}
                      </Text>
                    </View>
                    <View style={styles.invitationActions}>
                      <TouchableOpacity
                        style={[styles.invitationButton, styles.acceptButton]}
                        onPress={() => handleInvitationResponse(invitation.id, true)}
                      >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.invitationButton, styles.rejectButton]}
                        onPress={() => handleInvitationResponse(invitation.id, false)}
                      >
                        <Text style={styles.rejectButtonText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {searching ? (
              <ActivityIndicator color="#00ffff" style={{ marginTop: 32 }} />
            ) : groupSearch ? (
              <>
                {searchResults.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No groups found</Text>
                  </View>
                ) : (
                  <FlatList
                    data={searchResults}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.groupCard}
                        onPress={() => router.push(`/group/${item.id}`)}
                      >
                        <View style={styles.groupCardContent}>
                          <View style={styles.groupAvatarContainer}>
                            <GroupAvatar
                              groupName={item.name}
                              size={50}
                              source={item.avatar_url ? { uri: item.avatar_url } : null}
                            />
                          </View>
                          <View style={styles.groupInfoContainer}>
                            <Text style={styles.groupName}>{item.name}</Text>
                            <Text style={styles.memberCount}>{item.member_count || 0} members</Text>
                          </View>
                          <View style={styles.groupActions}>
                            {!groups.some(g => g.id === item.id) ? (
                              <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleJoinGroup(item.id)}
                              >
                                <Text style={styles.actionButtonText}>Join</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: 'rgba(255, 0, 85, 0.1)' }]}
                                onPress={() => handleLeaveGroup(item.id)}
                              >
                                <Text style={[styles.actionButtonText, { color: '#ff0055' }]}>Leave</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    )}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.groupsList}
                    scrollEnabled={false}
                  />
                )}
              </>
            ) : (
              <>
                <Text style={styles.sectionSubtitle}>Your Groups</Text>
                {groupsLoading ? (
                  <ActivityIndicator color="#00ffff" style={{ marginTop: 32 }} />
                ) : groups.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>You haven't joined any groups yet</Text>
                    {isPremium ? (
                      <TouchableOpacity
                        style={styles.createGroupButton}
                        onPress={() => setShowCreateGroupModal(true)}
                      >
                        <Text style={styles.createGroupButtonText}>Create Your First Group</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.createGroupButton, styles.premiumButton]}
                        onPress={() => setShowPremiumModal(true)}
                      >
                        <Text style={styles.createGroupButtonText}>Upgrade to Create Groups</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <FlatList
                    data={groups}
                    renderItem={({ item }) => {
                      const isMember = groups.some(g => g.id === item.id);
                      return (
                        <TouchableOpacity
                          style={styles.groupCard}
                          onPress={() => router.push(`/group/${item.id}`)}
                        >
                          <View style={styles.groupCardContent}>
                            <View style={styles.groupAvatarContainer}>
                              <GroupAvatar
                                groupName={item.name}
                                size={50}
                                source={item.avatar_url ? { uri: item.avatar_url } : null}
                              />
                            </View>
                            <View style={styles.groupInfoContainer}>
                              <Text style={styles.groupName}>{item.name}</Text>
              
                              <Text style={styles.memberCount}>{item.member_count === 1 ? '1 member' : `${item.member_count} members`}</Text>
                            </View>
                            <View style={styles.groupActions}>
                              <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => router.push(`/group/${item.id}`)}
                              >
                                <Ionicons name="people" size={14} color="#00ffff" />
                                <Text style={styles.actionButtonText}>View</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: 'rgba(255, 0, 85, 0.1)' }]}
                                onPress={() => handleLeaveGroup(item.id)}
                              >
                                <Text style={[styles.actionButtonText, { color: '#ff0055' }]}>Leave</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.groupsList}
                    scrollEnabled={false}
                  />
                )}
              </>
            )}
          </View>
        ) : activeTab === 'challenges' ? (
          <ChallengeSection 
            onViewChallenge={(challenge) => {
              // Handle challenge view - could navigate to challenge details
              console.log('View challenge:', challenge);
            }}
          />
                    ) : (
              <>
                {/* Friend Suggestions Section */}
                <View style={styles.suggestionsSection}>
                  <Text style={styles.sectionTitle}>People You May Know</Text>
                  <FriendSuggestionEngine />
                </View>
                
                <View style={styles.searchSection}>
                  <Text style={styles.searchHeader}>Add Friends</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search users..."
                    placeholderTextColor="#888"
                    value={search}
                    onChangeText={handleSearch}
                  />
                </View>
            {loading && <ActivityIndicator color="#00ffff" style={{ marginTop: 16 }} />}
          
            {search.length > 1 ? (
              <>
                {searchResults.length === 0 && !loading && (
                  <Text style={{ color: '#fff', marginTop: 16 }}>No users found.</Text>
                )}
                <FlatList
                  data={searchResults}
                  renderItem={renderResult}
                  keyExtractor={(item) => item.id}
                  style={{ marginTop: 16 }}
                  scrollEnabled={false}
                />
              </>
            ) : (
              <>
                <View style={styles.friendsRequestsSection}>
                  {friendRequests.length > 0 && (
                    <>
                      <Text style={styles.requestsHeader}>Friend Requests ({friendRequests.length})</Text>
                      <FlatList
                        data={friendRequests}
                        keyExtractor={item => item.id}
                                                renderItem={({ item }) => (
                          <View style={styles.requestRow}>
                            <PremiumAvatar
                              size={40}
                              source={item.avatar_url ? { uri: item.avatar_url } : null}
                              isPremium={item.is_premium}
                              username={item.username}
                              fullName={item.full_name}
                              style={{ marginRight: 16 }}
                            />
                            <View style={styles.userInfo}>
                              <Text style={styles.username}>{item.username}</Text>
                              <Text style={getMutualFriendsStyle(getMutualFriendsCount(item.id))}>
                                {getMutualFriendsCount(item.id)} mutual friend{getMutualFriendsCount(item.id) !== 1 ? 's' : ''}
                              </Text>
                            </View>
                            <View style={styles.requestActions}>
                              <TouchableOpacity style={styles.acceptBtn} onPress={() => handleRequestAction(item.friendship_id, 'accept')}>
                                <Text style={styles.acceptBtnText}>Accept</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.declineBtn} onPress={() => handleRequestAction(item.friendship_id, 'decline')}>
                                <Text style={styles.declineBtnText}>Decline</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                        scrollEnabled={false}
                      />
                    </>
                  )}
                  {outgoingRequests.length > 0 && (
                    <>
                      <Text style={styles.requestsHeader}>Outgoing Requests ({outgoingRequests.length})</Text>
                      <FlatList
                        data={outgoingRequests}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                          <View style={styles.requestRow}>
                            <PremiumAvatar
                              size={40}
                              source={item.avatar_url ? { uri: item.avatar_url } : null}
                              isPremium={item.is_premium}
                              username={item.username}
                              fullName={item.full_name}
                              style={{ marginRight: 16 }}
                            />
                            <View style={styles.userInfo}>
                              <Text style={styles.username}>{item.username}</Text>
                              <Text style={getMutualFriendsStyle(getMutualFriendsCount(item.id))}>
                                {getMutualFriendsCount(item.id)} mutual friend{getMutualFriendsCount(item.id) !== 1 ? 's' : ''}
                              </Text>
                            </View>
                            <Text style={styles.friendStatus}>Requested</Text>
                          </View>
                        )}
                        scrollEnabled={false}
                      />
                    </>
                  )}
                </View>
                <Text style={styles.friendsHeader}>Your Friends ({friends.length})</Text>
                {friends.length === 0 ? (
                  <View style={styles.friendsPlaceholder}>
                    <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 32 }}>
                      You have no friends yet.
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={friends}
                    renderItem={({ item }) => (
                      <TouchableOpacity onPress={() => router.push(`/profile/${item.id}`)}>
                        <View style={styles.resultRow}>
                          <PremiumAvatar
                            size={40}
                            source={item.avatar_url ? { uri: item.avatar_url } : null}
                            isPremium={item.is_premium}
                            username={item.username}
                            fullName={item.full_name}
                            style={{ marginRight: 16 }}
                          />
                          <View style={styles.userInfo}>
                            <Text style={styles.username}>{item.username}</Text>
                            <Text style={getMutualFriendsStyle(getMutualFriendsCount(item.id))}>
                              {getMutualFriendsCount(item.id)} mutual friend{getMutualFriendsCount(item.id) !== 1 ? 's' : ''}
                            </Text>
                          </View>
                          <Text style={styles.friendStatus}>Friends</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.id}
                    style={{ marginTop: 16 }}
                    scrollEnabled={false}
                  />
                )}
              </>
            )}
          </>
        )}
      </View>
      

      {/* Create Group Modal */}
      <Modal
        visible={showCreateGroupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Group</Text>
          
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={handleUploadAvatar}
            >
              {newGroup.avatar_url ? (
                <Image
                  source={{ uri: newGroup.avatar_url }}
                  style={styles.previewAvatar}
                />
              ) : (
                <Text style={styles.avatarButtonText}>Add Group Photo</Text>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Group Name"
              placeholderTextColor="#888"
              value={newGroup.name}
              onChangeText={(text) => setNewGroup(prev => ({ ...prev, name: text }))}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Group Description (optional)"
              placeholderTextColor="#888"
              multiline
              value={newGroup.description}
              onChangeText={(text) => setNewGroup(prev => ({ ...prev, description: text }))}
            />

            <View style={styles.privacyToggle}>
              <Text style={styles.privacyLabel}>Privacy:</Text>
              <View style={styles.privacyOptions}>
                <TouchableOpacity
                  style={[
                    styles.privacyOption,
                    newGroup.is_public && styles.selectedPrivacy
                  ]}
                  onPress={() => setNewGroup(prev => ({ ...prev, is_public: true }))}
                >
                  <Ionicons
                    name="globe"
                    size={20}
                    color={newGroup.is_public ? '#00ffff' : '#fff'}
                  />
                  <Text style={[
                    styles.privacyText,
                    newGroup.is_public && styles.selectedPrivacyText
                  ]}>Public</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.privacyOption,
                    !newGroup.is_public && styles.selectedPrivacy
                  ]}
                  onPress={() => setNewGroup(prev => ({ ...prev, is_public: false }))}
                >
                  <Ionicons
                    name="lock-closed"
                    size={20}
                    color={!newGroup.is_public ? '#00ffff' : '#fff'}
                  />
                  <Text style={[
                    styles.privacyText,
                    !newGroup.is_public && styles.selectedPrivacyText
                  ]}>Private</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateGroupModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateGroup}
              >
                <Text style={styles.createButtonText}>Create Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Premium Modal */}
      <Modal
        visible={showPremiumModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPremiumModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Premium Feature</Text>
            <Text style={styles.modalText}>
              Creating groups is a premium feature. Upgrade to Premium to create and manage your own groups!
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPremiumModal(false)}
              >
                <Text style={styles.cancelButtonText}>Maybe Later</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => {
                  setShowPremiumModal(false);
                  router.push('/purchase-subscription');
                }}
              >
                <Text style={styles.createButtonText}>Upgrade to Premium</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    paddingTop: 72,
    paddingHorizontal: 0, // Remove horizontal padding for full width
    paddingBottom: 24,
  },
  communityHeader: {
    color: '#00ffff',
    fontWeight: 'bold',
    fontSize: 28,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: 'transparent',
    paddingHorizontal: 20, // Add padding to tab bar
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  activeTab: {
    borderBottomColor: '#00ffff',
    backgroundColor: '#1a1a1a',
  },
  tabText: {
    color: '#888',
    fontSize: 18,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#00ffff',
  },
  header: {
    color: '#00ffff',
    fontWeight: 'bold',
    fontSize: 28,
    marginBottom: 12,
    textAlign: 'center',
  },
  searchInput: {
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
  },
  username: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  friendsPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFriendBtn: {
    backgroundColor: '#00ffff',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginLeft: 10,
  },
  addFriendBtnText: {
    color: '#111',
    fontWeight: 'bold',
    fontSize: 14,
  },
  friendStatus: {
    color: '#00ffff',
    marginLeft: 10,
    fontWeight: 'bold',
    fontSize: 14,
  },
  friendsRequestsSection: {
    marginBottom: 18,
  },
  requestsHeader: {
    color: '#00ffff',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 8,
    marginTop: 8,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  acceptBtn: {
    backgroundColor: '#00ff99',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 10,
  },
  acceptBtnText: {
    color: '#111',
    fontWeight: 'bold',
  },
  declineBtn: {
    backgroundColor: '#ff0055',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 6,
  },
  declineBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  friendsHeader: {
    color: '#00ffff',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 8,
    marginTop: 8,
  },
  avatarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  groupsContainer: {
    flex: 1,
    paddingHorizontal: 20, // Keep horizontal padding for content spacing
    paddingVertical: 0, // Remove vertical padding to use full height
  },
  groupsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
 
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00ffff',
    textShadowColor: 'rgba(0, 255, 255, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  groupsList: {
    paddingBottom: 20,
    flexGrow: 0,
  },
  groupCard: {
    backgroundColor: 'rgba(0, 255, 255, 0.03)',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    width: '100%', // Full width
    minHeight: 90, // Increased height to accommodate content
  },
  mutualFriends: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  mutualFriendsText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  someMutualFriends: {
    color: '#00ffff',
    fontWeight: '600',
  },
  manyMutualFriends: {
    color: '#00ff99',
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionsSection: {
    marginBottom: 24,
  },
  groupCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 20, // More vertical padding
  },
  groupAvatarContainer: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInfoContainer: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12, // Add some spacing from avatar
  },
  groupName: {
    color: '#fff',
    fontSize: 20, // Slightly smaller for better fit
    fontWeight: 'bold',
    marginBottom: 6, // More space between name and member count
    letterSpacing: 0.5,
  },
  memberCount: {
    color: '#00ffff',
    fontSize: 14, // Slightly smaller
    fontWeight: '600',
  },
  groupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 16, // More space from group info
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    minWidth: 50,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#00ffff',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    backgroundColor: 'rgba(0, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  emptyStateText: {
    color: '#666',
    fontSize: 17,
    marginBottom: 20,
    textAlign: 'center',
  },
  createGroupButton: {
    backgroundColor: '#00ffff',
    opacity:0.3,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 20,
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  createGroupButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 17,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  avatarButton: {
    backgroundColor: '#222',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#00ffff',
    borderStyle: 'dashed',
  },
  avatarButtonText: {
    color: '#00ffff',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  previewAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#00ffff',
  },
  privacyToggle: {
    backgroundColor: '#222',
    padding: 16,
    borderRadius: 16,
    marginBottom: 32,
  },
  privacyLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  privacyOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  privacyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  privacyText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ff0055',
    opacity: 0.3,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff0055',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  createButton: {
    flex: 1,
    backgroundColor: '#00ffff',
    opacity:0.3,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#111',
    padding: 32,
    borderRadius: 24,
    width: '90%',
    maxHeight: '90%',
  },
  modalTitle: {
    color: '#00ffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#222',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 18,
    marginBottom: 16,
  },
  premiumButton: {
    backgroundColor: '#666',
    shadowColor: '#666',
  },
  selectedPrivacy: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderColor: '#00ffff',
  },
  selectedPrivacyText: {
    color: '#00ffff',
  },
  modalText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
  },
  searchSection: {
    marginBottom: 16,
  },
  searchHeader: {
    color: '#00ffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionSubtitle: {
    color: '#00ffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
    textShadowColor: 'rgba(0, 255, 255, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  section: {
    marginBottom: 24,
  },
  invitationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  invitationAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  invitationInfo: {
    flex: 1,
    marginRight: 12,
  },
  invitationName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  invitationInviter: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  invitationDescription: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 4,
  },
  invitationActions: {
    flexDirection: 'column',
    gap: 8,
  },
  invitationButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  acceptButton: {
    backgroundColor: '#00ff99',
  },
  rejectButton: {
    backgroundColor: '#ff0055',
  },
  acceptButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rejectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  headerContainer: {
    marginBottom: 20,
    paddingHorizontal: 20, // Add padding to header
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  suggestedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    padding: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    minWidth: 160,
    justifyContent: 'center',
  },
  suggestedButtonText: {
    color: 'cyan',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 75,
  },
  suggestionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  suggestionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  mutualFriends: {
    color: '#888',
    fontSize: 14,
  },
  addFriendButton: {
    backgroundColor: '#00ffff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 10,
  },
  addFriendText: {
    color: '#111',
    fontWeight: 'bold',
    fontSize: 14,
  },
  mediaSection: {
    marginBottom: 20,
  },
  mediaOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  mediaOption: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 12,
    minWidth: 80,
  },
  mediaOptionText: {
    color: '#00ffff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  mediaPreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
  },
  videoPreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
  mediaTypeIndicator: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mediaTypeText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default CommunityScreen; 

