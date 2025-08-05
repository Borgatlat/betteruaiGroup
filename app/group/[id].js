import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../context/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { PremiumAvatar } from '../components/PremiumAvatar';
import { GroupAvatar } from '../components/GroupAvatar';
import FeedCard from '../components/FeedCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// GroupFeedContent Component
const GroupFeedContent = ({ groupId, userProfile }) => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchGroupFeed();
  }, [groupId]);
  
  const fetchGroupFeed = async () => {
    try {
      // Get all members of the group
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

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
          hasKudoed: (kudosMap[r.id] || []).some(k => k.user_id === currentUser?.id)
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
  
  if (loading) {
    return <ActivityIndicator color="#00ffff" style={{ marginTop: 20 }} />;
  }
  
  if (feed.length === 0) {
    return (
      <Text style={styles.emptyFeedText}>No activity yet. Be the first to post!</Text>
    );
  }
  
  return (
    <FlatList
      data={feed.slice(0, 5)} // Show only first 5 items
      renderItem={({ item }) => (
        <FeedCard
          item={item}
          currentUserId={userProfile?.id}
          usePremiumAvatar={true}
        />
      )}
      keyExtractor={(item) => `${item.type}_${item.id}`}
      scrollEnabled={false}
    />
  );
};


const GroupDetailScreen = () => {
 const { id } = useLocalSearchParams();
 const router = useRouter();
 const { userProfile } = useUser();
 const insets = useSafeAreaInsets();
 const [group, setGroup] = useState(null);
 const [members, setMembers] = useState([]);
 const [loading, setLoading] = useState(true);
 const [isMember, setIsMember] = useState(false);
 const [userRole, setUserRole] = useState(null);
 const [showInviteModal, setShowInviteModal] = useState(false);
 const [friends, setFriends] = useState([]);
 const [inviting, setInviting] = useState({});
 const [joinRequests, setJoinRequests] = useState([]);
 const [loadingRequests, setLoadingRequests] = useState(true);
 const [hasPendingRequest, setHasPendingRequest] = useState(false);
 const [invitations, setInvitations] = useState([]);
 const [pendingInvitations, setPendingInvitations] = useState([]);
 const [outgoingInvitations, setOutgoingInvitations] = useState([]);
 const [activityCounts, setActivityCounts] = useState({
   workouts: 0,
   mentalSessions: 0,
   runs: 0
 });
 const [isOwner, setIsOwner] = useState(false);
 const [activeAction, setActiveAction] = useState(null); // Tracks which button is active


 useEffect(() => {
   fetchGroupDetails();
 }, [id]);


 const fetchGroupDetails = async () => {
   try {
     // Fetch group details
     const { data: groupData, error: groupError } = await supabase
       .from('groups')
       .select('*')
       .eq('id', id)
       .single();


     if (groupError) throw groupError;
     setGroup(groupData);


     // First fetch members
     const { data: memberData, error: memberError } = await supabase
       .from('group_members')
       .select('*')
       .eq('group_id', id);


     if (memberError) throw memberError;


     // Then fetch user profiles for all members
     const userIds = memberData?.map(member => member.user_id) || [];
     const { data: userData, error: userError } = await supabase
       .from('profiles')
       .select('id, username, avatar_url, full_name')
       .in('id', userIds);


     if (userError) throw userError;


     // Combine member data with user profiles
     const membersWithProfiles = memberData?.map(member => ({
       ...member,
       profiles: userData?.find(user => user.id === member.user_id) || {
         id: member.user_id,
         username: 'Unknown User',
         avatar_url: null,
         full_name: null
       }
     })) || [];


     setMembers(membersWithProfiles);


     // Fetch activity counts after we have the member IDs
     const [workouts, mentalSessions, runs] = await Promise.all([
       supabase
         .from('user_workout_logs')
         .select('id', { count: 'exact' })
         .in('user_id', userIds),
       supabase
         .from('mental_session_logs')
         .select('id', { count: 'exact' })
         .in('profile_id', userIds),
       supabase
         .from('runs')
         .select('id', { count: 'exact' })
         .in('user_id', userIds)
     ]);


     setActivityCounts({
       workouts: workouts.count || 0,
       mentalSessions: mentalSessions.count || 0,
       runs: runs.count || 0
     });


     // Check if current user is a member or owner
     const currentUserMember = membersWithProfiles.find(m => m.user_id === userProfile?.id);
     const ownerStatus = groupData.created_by === userProfile?.id;
    
     // Set membership status - user is a member if they are either a member or the owner
     setIsMember(!!currentUserMember || ownerStatus);
     setUserRole(currentUserMember?.role || (ownerStatus ? 'owner' : null));
     setIsOwner(ownerStatus);


     // Check for pending join request
     await checkPendingRequest();


     // If user is owner, fetch join requests
     if (groupData.created_by === userProfile?.id) {
       await fetchJoinRequests();
     }


     // Fetch pending invitations
     await fetchPendingInvitations();
   } catch (error) {
     console.error('Error fetching group details:', error);
   } finally {
     setLoading(false);
   }
 };


 const handleJoinGroup = async () => {
   try {
     // Check if there's already a pending request
     if (hasPendingRequest) {
       Alert.alert('Already Requested', 'You have already requested to join this group.');
       return;
     }


     if (group.is_public) {
       // For public groups, join directly
     const { error } = await supabase
       .from('group_members')
       .insert({
         group_id: id,
         user_id: userProfile.id,
         role: 'member'
       });


     if (error) throw error;
     setIsMember(true);
     setUserRole('member');
     fetchGroupDetails(); // Refresh members list
       Alert.alert('Success', 'Joined group successfully!');
     } else {
       // For private groups, create a join request
       const { data, error } = await supabase
         .from('join_requests')
         .insert({
           group_id: id,
           user_id: userProfile.id,
           status: 'pending'
         })
         .select()
         .single();


       if (error) throw error;
       setHasPendingRequest(true);
       Alert.alert('Success', 'Join request sent! The group owner will review your request.');
     }
   } catch (error) {
     console.error('Error joining group:', error);
     Alert.alert('Error', 'Failed to join group. Please try again.');
   }
 };


 const handleLeaveGroup = async () => {
   try {
     const { error } = await supabase
       .from('group_members')
       .delete()
       .eq('group_id', id)
       .eq('user_id', userProfile.id);


     if (error) throw error;
     setIsMember(false);
     setUserRole(null);
     fetchGroupDetails(); // Refresh members list
   } catch (error) {
     console.error('Error leaving group:', error);
   }
 };


 const handleDeleteGroup = async () => {
   try {
     // Confirm deletion
     Alert.alert(
       'Delete Group',
       'Are you sure you want to delete this group? This action cannot be undone.',
       [
         {
           text: 'Cancel',
           style: 'cancel'
         },
         {
           text: 'Delete',
           style: 'destructive',
           onPress: async () => {
             const { error } = await supabase
               .from('groups')
               .delete()
               .eq('id', id)
               .eq('created_by', userProfile.id);


             if (error) {
               console.error('Error deleting group:', error);
               Alert.alert('Error', 'Failed to delete group. Please try again.');
               return;
             }


             // Navigate back and refresh the groups list
             router.push({
               pathname: '/(tabs)/community',
               params: { refresh: true }
             });
           }
         }
       ]
     );
   } catch (error) {
     console.error('Error in delete group:', error);
     Alert.alert('Error', 'An unexpected error occurred. Please try again.');
   }
 };


 // Add function to fetch friends
 const fetchFriends = async () => {
   try {
     // First get all accepted friendships
     const { data: accepted, error: acceptedError } = await supabase
       .from('friends')
       .select(`
         *,
         friend:friend_id (
           id,
           username,
           avatar_url,
           full_name
         ),
         user:user_id (
           id,
           username,
           avatar_url,
           full_name
         )
       `)
       .or(`user_id.eq.${userProfile.id},friend_id.eq.${userProfile.id}`)
       .eq('status', 'accepted');


     if (acceptedError) throw acceptedError;
     console.log('Accepted friendships with profiles:', accepted);


     // Extract friend profiles and remove duplicates using a Map to ensure uniqueness by ID
     const friendMap = new Map();
     accepted.forEach(f => {
       const friend = f.user_id === userProfile.id ? f.friend : f.user;
       if (friend && !friendMap.has(friend.id)) {
         friendMap.set(friend.id, friend);
       }
     });
     const friendProfiles = Array.from(friendMap.values());


     console.log('Friend profiles:', friendProfiles);


     if (friendProfiles.length > 0) {
       // Get current group members
       const { data: currentMembers, error: membersError } = await supabase
         .from('group_members')
         .select('user_id')
         .eq('group_id', id);


       if (membersError) throw membersError;
       console.log('Current members:', currentMembers);


       // Get pending invitations
       const { data: pendingInvitations, error: invitationsError } = await supabase
         .from('group_invitations')
         .select('invited_user_id')
         .eq('group_id', id)
         .eq('status', 'pending');


       if (invitationsError) throw invitationsError;
       console.log('Pending invitations:', pendingInvitations);


       const memberIds = new Set((currentMembers || []).map(m => m.user_id));
       const invitedIds = new Set((pendingInvitations || []).map(i => i.invited_user_id));


       console.log('Member IDs:', Array.from(memberIds));
       console.log('Invited IDs:', Array.from(invitedIds));


       // Filter out friends who are already members or have pending invitations
       const availableFriends = friendProfiles.filter(
         friend => !memberIds.has(friend.id) && !invitedIds.has(friend.id)
       );


       console.log('Available friends:', availableFriends);
       setFriends(availableFriends);
     } else {
       setFriends([]);
     }
   } catch (error) {
     console.error('Error fetching friends:', error);
     Alert.alert('Error', 'Failed to fetch friends. Please try again.');
   }
 };


 // Add function to handle inviting friends
 const handleInviteFriend = async (friendId) => {
   try {
     setInviting(prev => ({ ...prev, [friendId]: true }));


     // First check if there's already a pending invitation
     const { data: existingInvitation, error: checkError } = await supabase
       .from('group_invitations')
       .select('*')
       .eq('group_id', id)
       .eq('invited_user_id', friendId)
       .eq('status', 'pending')
       .single();


     if (checkError && checkError.code !== 'PGRST116') throw checkError;


     if (existingInvitation) {
       Alert.alert('Already Invited', 'This user has already been invited to the group.');
       return;
     }


     const { error } = await supabase
       .from('group_invitations')
       .insert({
         group_id: id,
         invited_user_id: friendId,
         invited_by_id: userProfile.id,
         status: 'pending'
       });


     if (error) throw error;


     // Update both friends list and outgoing invitations
     await Promise.all([
       fetchFriends(),
       fetchOutgoingInvitations()
     ]);
    
     Alert.alert('Success', 'Invitation sent successfully!');
   } catch (error) {
     console.error('Error inviting friend:', error);
     Alert.alert('Error', 'Failed to send invitation. Please try again.');
   } finally {
     setInviting(prev => ({ ...prev, [friendId]: false }));
   }
 };


 // Update useEffect to fetch friends when invite modal is shown
 useEffect(() => {
   if (showInviteModal) {
     fetchFriends();
   }
 }, [showInviteModal]);


 // Add function to fetch join requests
 const fetchJoinRequests = async () => {
   try {
     setLoadingRequests(true);
     console.log('Fetching join requests for group:', id);
    
     // First get the join requests
     const { data: requests, error: requestsError } = await supabase
       .from('join_requests')
       .select('*')
       .eq('group_id', id)
       .eq('status', 'pending');


     if (requestsError) {
       console.error('Error fetching requests:', requestsError);
       throw requestsError;
     }


     console.log('Fetched join requests:', requests);


     if (!requests || requests.length === 0) {
       setJoinRequests([]);
       return;
     }


     // Then get the user profiles for these requests
     const userIds = (requests || []).map(request => request.user_id);
     const { data: profiles, error: profilesError } = await supabase
       .from('profiles')
       .select('id, username, avatar_url, full_name')
       .in('id', userIds);


     if (profilesError) {
       console.error('Error fetching profiles:', profilesError);
       throw profilesError;
     }


     console.log('Fetched profiles:', profiles);


     // Combine the data
     const requestsWithProfiles = (requests || []).map(request => ({
       ...request,
       profiles: profiles.find(profile => profile.id === request.user_id)
     }));


     console.log('Combined requests with profiles:', requestsWithProfiles);
     setJoinRequests(requestsWithProfiles);
   } catch (error) {
     console.error('Error in fetchJoinRequests:', error);
     setJoinRequests([]);
   } finally {
     setLoadingRequests(false);
   }
 };


 // Add this function to handle profile navigation
 const handleProfilePress = (userId) => {
   router.push(`/profile/${userId}`);
 };


 // Add function to check if user has pending request
 const checkPendingRequest = async () => {
   try {
     const { data, error } = await supabase
       .from('join_requests')
       .select('*')
       .eq('group_id', id)
       .eq('user_id', userProfile.id)
       .eq('status', 'pending')
       .single();


     if (error && error.code !== 'PGRST116') throw error;
     setHasPendingRequest(!!data);
   } catch (error) {
     console.error('Error checking pending request:', error);
   }
 };


 // Add function to handle join request
 const handleJoinRequest = async (requestId, accept) => {
   try {
     if (accept) {
       // Get the request details
       const { data: request, error: requestError } = await supabase
         .from('join_requests')
         .select('*')
         .eq('id', requestId)
         .single();


       if (requestError) throw requestError;


       // Add user to group members
       const { error: memberError } = await supabase
         .from('group_members')
         .insert({
           group_id: request.group_id,
           user_id: request.user_id,
           role: 'member'
         });


       if (memberError) throw memberError;


       // Update request status to accepted
       const { error: updateError } = await supabase
         .from('join_requests')
         .update({ status: 'accepted' })
         .eq('id', requestId);


       if (updateError) throw updateError;
     } else {
       // Delete the request if denied
       const { error: deleteError } = await supabase
         .from('join_requests')
         .delete()
         .eq('id', requestId);


       if (deleteError) throw deleteError;
     }


     // Refresh requests
     fetchJoinRequests();
     // Refresh members if accepted
     if (accept) {
       fetchGroupDetails();
     }
   } catch (error) {
     console.error('Error handling join request:', error);
     Alert.alert('Error', 'Failed to process request. Please try again.');
   }
 };


 // Add these functions after the existing functions
 const handlePromoteMember = async (memberId) => {
   try {
     // Confirm promotion
     Alert.alert(
       'Promote Member',
       'Are you sure you want to promote this member to admin?',
       [
         {
           text: 'Cancel',
           style: 'cancel'
         },
         {
           text: 'Promote',
           style: 'default',
           onPress: async () => {
             // First check if the user is the group owner
             if (!isOwner) {
               Alert.alert('Error', 'Only group owners can promote members.');
               return;
             }


             // First verify the current role
             const { data: currentMember, error: fetchError } = await supabase
               .from('group_members')
               .select('role')
               .eq('group_id', id)
               .eq('user_id', memberId)
               .single();


             if (fetchError) {
               console.error('Error fetching member:', fetchError);
               throw fetchError;
             }


             if (currentMember.role === 'admin') {
               Alert.alert('Error', 'Member is already an admin.');
               return;
             }


             const { error } = await supabase
               .from('group_members')
               .update({ role: 'admin' })
               .eq('group_id', id)
               .eq('user_id', memberId);


             if (error) {
               console.error('Error promoting member:', error);
               throw error;
             }


             // Refresh members list
             await fetchGroupDetails();
             Alert.alert('Success', 'Member promoted to admin successfully!');
           }
         }
       ]
     );
   } catch (error) {
     console.error('Error promoting member:', error);
     Alert.alert('Error', 'Failed to promote member. Please try again.');
   }
 };


 const handleKickMember = async (memberId) => {
   try {
     // Confirm kick
     Alert.alert(
       'Remove Member',
       'Are you sure you want to remove this member from the group?',
       [
         {
           text: 'Cancel',
           style: 'cancel'
         },
         {
           text: 'Remove',
           style: 'destructive',
           onPress: async () => {
             const { error } = await supabase
               .from('group_members')
               .delete()
               .eq('group_id', id)
               .eq('user_id', memberId);


             if (error) throw error;


             // Refresh members list
             fetchGroupDetails();
             Alert.alert('Success', 'Member removed successfully!');
           }
         }
       ]
     );
   } catch (error) {
     console.error('Error removing member:', error);
     Alert.alert('Error', 'Failed to remove member. Please try again.');
   }
 };


 // Add this function to fetch invitations
 const fetchInvitations = async () => {
   try {
     const { data, error } = await supabase
       .from('group_invitations')
       .select(`
         *,
         group:group_id (
           id,
           name,
           avatar_url
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
   }
 };


 // Update useEffect to fetch invitations
 useEffect(() => {
   fetchGroupDetails();
   fetchInvitations();
 }, [id]);


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
       fetchGroupDetails();
     }
   } catch (error) {
     console.error('Error handling invitation:', error);
     Alert.alert('Error', 'Failed to process invitation. Please try again.');
   }
 };


 // Add function to handle demoting admin
 const handleDemoteAdmin = async (memberId) => {
   try {
     // Confirm demotion
     Alert.alert(
       'Demote Admin',
       'Are you sure you want to demote this admin to member?',
       [
         {
           text: 'Cancel',
           style: 'cancel'
         },
         {
           text: 'Demote',
           style: 'default',
           onPress: async () => {
             // First check if the user is the group owner
             if (!isOwner) {
               Alert.alert('Error', 'Only group owners can demote admins.');
               return;
             }


             // First verify the current role
             const { data: currentMember, error: fetchError } = await supabase
               .from('group_members')
               .select('role')
               .eq('group_id', id)
               .eq('user_id', memberId)
               .single();


             if (fetchError) {
               console.error('Error fetching member:', fetchError);
               throw fetchError;
             }


             if (currentMember.role !== 'admin') {
               Alert.alert('Error', 'Member is not an admin.');
               return;
             }


             const { error } = await supabase
               .from('group_members')
               .update({ role: 'member' })
               .eq('group_id', id)
               .eq('user_id', memberId);


             if (error) {
               console.error('Error demoting admin:', error);
               throw error;
             }


             // Refresh members list
             await fetchGroupDetails();
             Alert.alert('Success', 'Admin demoted to member successfully!');
           }
         }
       ]
     );
   } catch (error) {
     console.error('Error demoting admin:', error);
     Alert.alert('Error', 'Failed to demote admin. Please try again.');
   }
 };


 // Add function to cancel invitation
 const handleCancelInvitation = async (invitationId) => {
   try {
     console.log('Cancelling invitation:', invitationId);
    
     const { error } = await supabase
       .from('group_invitations')
       .delete()
       .eq('id', invitationId);


     if (error) {
       console.error('Error deleting invitation:', error);
       throw error;
     }


     // Update the outgoingInvitations state directly
     setOutgoingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    
     // Refresh the friends list
     await fetchFriends();
    
     Alert.alert('Success', 'Invitation cancelled successfully!');
   } catch (error) {
     console.error('Error cancelling invitation:', error);
     Alert.alert('Error', 'Failed to cancel invitation. Please try again.');
   }
 };


 // Add function to fetch pending invitations
 const fetchPendingInvitations = async () => {
   try {
     const { data, error } = await supabase
       .from('group_invitations')
       .select(`
         *,
         group:group_id (
           id,
           name,
           avatar_url
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
     setPendingInvitations(data || []);
   } catch (error) {
     console.error('Error fetching pending invitations:', error);
   }
 };


 // Add this function after fetchPendingInvitations
 const fetchOutgoingInvitations = async () => {
   try {
     console.log('Fetching outgoing invitations for group:', id);
     console.log('Current user ID:', userProfile.id);
    
     const { data, error } = await supabase
       .from('group_invitations')
       .select(`
         *,
         invited_user:invited_user_id (
           id,
           username,
           avatar_url,
           full_name
         )
       `)
       .eq('group_id', id)
       .eq('invited_by_id', userProfile.id)
       .eq('status', 'pending');


     if (error) {
       console.error('Error in fetchOutgoingInvitations:', error);
       throw error;
     }


     console.log('Fetched outgoing invitations:', data);
     setOutgoingInvitations(data || []);
   } catch (error) {
     console.error('Error fetching outgoing invitations:', error);
   }
 };


 // Update useEffect to fetch outgoing invitations when modal opens
 useEffect(() => {
   if (showInviteModal) {
     console.log('Modal opened, fetching data...');
     fetchFriends();
     fetchOutgoingInvitations();
   }
 }, [showInviteModal]);


 if (loading) {
   return (
     <View style={styles.loadingContainer}>
       <ActivityIndicator size="large" color="#00ffff" />
     </View>
   );
 }


 if (!group) {
   return (
     <View style={styles.errorContainer}>
       <Text style={styles.errorText}>Group not found</Text>
     </View>
   );
 }





 // Sort members by role (owner first, then admins, then members)
 const sortedMembers = [...members].sort((a, b) => {
   const roleOrder = { owner: 0, admin: 1, member: 2 };
   return roleOrder[a.role] - roleOrder[b.role];
 });


 const renderJoinRequests = () => {
   if (!isOwner) return null;


   return (
     <View style={styles.section}>
       <Text style={styles.sectionTitle}>Join Requests</Text>
       {loadingRequests ? (
         <ActivityIndicator color="#00ffff" style={{ marginTop: 16 }} />
       ) : joinRequests.length === 0 ? (
         <Text style={styles.emptyText}>No pending join requests</Text>
       ) : (
         joinRequests.map((request) => (
           <View key={request.id} style={styles.requestCard}>
             <TouchableOpacity
               onPress={() => handleProfilePress(request.user_id)}
               style={styles.requestAvatarContainer}
             >
               <Image
                 source={{ uri: request.profiles?.avatar_url || 'https://placehold.co/50x50' }}
                 style={styles.requestAvatar}
               />
             </TouchableOpacity>
             <View style={styles.requestInfo}>
               <TouchableOpacity onPress={() => handleProfilePress(request.user_id)}>
                 <Text style={styles.requestName}>
                   {request.profiles?.full_name || request.profiles?.username}
                 </Text>
               </TouchableOpacity>
               <Text style={styles.requestDate}>
                 {new Date(request.created_at).toLocaleDateString()}
               </Text>
             </View>
             <View style={styles.requestActions}>
               <TouchableOpacity
                 style={[styles.requestButton, styles.acceptButton]}
                 onPress={() => handleJoinRequest(request.id, true)}
               >
                 <Text style={styles.acceptButtonText}>Accept</Text>
               </TouchableOpacity>
               <TouchableOpacity
                 style={[styles.requestButton, styles.rejectButton]}
                 onPress={() => handleJoinRequest(request.id, false)}
               >
                 <Text style={styles.rejectButtonText}>Decline</Text>
               </TouchableOpacity>
             </View>
           </View>
         ))
       )}
     </View>
   );
 };


 const renderMember = (member) => (
   <View key={member.id} style={styles.memberCard}>
     <TouchableOpacity
       onPress={() => handleProfilePress(member.user_id)}
       style={styles.memberAvatarContainer}
     >
       <PremiumAvatar
         userId={member.user_id}
         source={member.profiles?.avatar_url ? { uri: member.profiles.avatar_url } : null}
         size={40}
         style={styles.memberAvatar}
         isPremium={member.profiles?.is_premium}
         username={member.profiles?.username}
         fullName={member.profiles?.full_name}
       />
     </TouchableOpacity>
     <View style={styles.memberInfo}>
       <TouchableOpacity onPress={() => handleProfilePress(member.user_id)}>
         <Text style={styles.memberName}>
           {member.profiles?.full_name || member.profiles?.username}
         </Text>
       </TouchableOpacity>
       <Text style={styles.memberRole}>{member.role}</Text>
     </View>
     {isOwner && member.user_id !== userProfile.id && (
       <View style={styles.memberActions}>
         {member.role === 'member' && (
           <TouchableOpacity
             style={[styles.memberActionButton, styles.promoteButton]}
             onPress={() => handlePromoteMember(member.user_id)}
           >
             <Ionicons name="arrow-up" size={20} color="#000" />
           </TouchableOpacity>
         )}
         {member.role === 'admin' && (
           <TouchableOpacity
             style={[styles.memberActionButton, styles.demoteButton]}
             onPress={() => handleDemoteAdmin(member.user_id)}
           >
             <Ionicons name="arrow-down" size={20} color="#000" />
           </TouchableOpacity>
         )}
         <TouchableOpacity
           style={[styles.memberActionButton, styles.kickButton]}
           onPress={() => handleKickMember(member.user_id)}
         >
           <Ionicons name="close" size={20} color="#fff" />
         </TouchableOpacity>
       </View>
     )}
   </View>
 );


 return (
   <ScrollView style={styles.container}>
     <View style={styles.header}>
       <TouchableOpacity
         style={[styles.backButton, { top: insets.top + 10 }]}
         onPress={() => {
           router.back();
           // If we came from the community tab, make sure to refresh it
           if (router.canGoBack()) {
             router.push({
               pathname: '/(tabs)/community',
               params: { refresh: true }
             });
           }
         }}
       >
         <Ionicons name="arrow-back" size={24} color="#00ffff" />
       </TouchableOpacity>
       <Image
         source={{ uri: group?.avatar_url || 'https://placehold.co/400x200' }}
         style={styles.bannerImage}
       />
       <View style={styles.groupInfo}>
         <GroupAvatar
           groupName={group.name}
           size={100}
           source={group.avatar_url ? { uri: group.avatar_url } : null}
           style={styles.groupAvatar}
         />
         <Text style={styles.groupName}>{group.name}</Text>
         <Text style={styles.groupDescription}>{group.description || 'No description'}</Text>
         
         {/* Activity Stats Section */}
         <View style={styles.activityStats}>
           <View style={styles.statItem}>
             <Ionicons name="barbell-outline" size={24} color="#00ffff" />
             <Text style={styles.statValue}>{activityCounts.workouts}</Text>
             <Text style={styles.statLabel}>Workouts</Text>
           </View>
           <View style={styles.statItem}>
             <Ionicons name="leaf-outline" size={24} color="#00ffff" />
             <Text style={styles.statValue}>{activityCounts.mentalSessions}</Text>
             <Text style={styles.statLabel}>Mental</Text>
           </View>
           <View style={styles.statItem}>
             <Ionicons name="fitness-outline" size={24} color="#00ffff" />
             <Text style={styles.statValue}>{activityCounts.runs}</Text>
             <Text style={styles.statLabel}>Runs</Text>
           </View>
         </View>

         <View style={styles.metaInfo}>
           <View style={styles.metaItem}>
             <Ionicons name="people" size={20} color="#00ffff" />
             <Text style={styles.metaText}>{members.length} members</Text>
           </View>
           <View style={styles.metaItem}>
             <Ionicons
               name={group.is_public ? 'globe' : 'lock-closed'}
               size={20}
               color="#00ffff"
             />
             <Text style={styles.metaText}>
               {group.is_public ? 'Public' : 'Private'}
             </Text>
           </View>
         </View>
       </View>
     </View>

     {/* Action Buttons Section */}
     <View style={styles.actionButtonRow}>
       {/* Invite Friends (Owner only) */}
       {isOwner && (
         <View style={styles.actionButtonContainer}>
           <TouchableOpacity
             style={[
               styles.actionCircle,
               activeAction === 'invite' && styles.actionCircleActive // Highlight if active
             ]}
             onPress={() => {
               setActiveAction('invite');
               setShowInviteModal(true);
             }}
           >
             <Ionicons
               name="person-add"
               size={28}
               color={activeAction === 'invite' ? '#000' : '#00ffff'} // Black icon if active
             />
           </TouchableOpacity>
           <Text
             style={[
               styles.actionLabel,
               activeAction === 'invite' && styles.actionLabelActive // Bold/cyan if active
             ]}
           >
             Invite
           </Text>
         </View>
       )}
       {/* Delete Group (Owner only) */}
       {isOwner && (
         <View style={styles.actionButtonContainer}>
           <TouchableOpacity
             style={[
               styles.actionCircle,
               activeAction === 'delete' && styles.actionCircleActive
             ]}
             onPress={() => {
               setActiveAction('delete');
               handleDeleteGroup();
             }}
           >
             <Ionicons
               name="trash"
               size={28}
               color={activeAction === 'delete' ? '#000' : '#ff0055'}
             />
           </TouchableOpacity>
           <Text
             style={[
               styles.actionLabel,
               activeAction === 'delete' && styles.actionLabelActive
             ]}
           >
             Delete
           </Text>
         </View>
       )}
       {/* Leave Group (Member only, not owner) */}
       {isMember && !isOwner && (
         <View style={styles.actionButtonContainer}>
           <TouchableOpacity
             style={[
               styles.actionCircle,
               activeAction === 'leave' && styles.actionCircleActive
             ]}
             onPress={() => {
               setActiveAction('leave');
               handleLeaveGroup();
             }}
           >
             <Ionicons
               name="exit-outline"
               size={28}
               color={activeAction === 'leave' ? '#000' : '#ff0055'}
             />
           </TouchableOpacity>
           <Text
             style={[
               styles.actionLabel,
               activeAction === 'leave' && styles.actionLabelActive
             ]}
           >
             Leave
           </Text>
         </View>
       )}
       {/* Leaderboard (All members) */}
       {isMember && (
         <View style={styles.actionButtonContainer}>
           <TouchableOpacity
             style={[
               styles.actionCircle,
               activeAction === 'leaderboard' && styles.actionCircleActive
             ]}
             onPress={() => {
               setActiveAction('leaderboard');
               router.push(`/group/${id}/leaderboard`);
             }}
           >
             <Ionicons
               name="podium"
               size={28}
               color={activeAction === 'leaderboard' ? '#000' : '#00ffff'}
             />
           </TouchableOpacity>
           <Text
             style={[
               styles.actionLabel,
               activeAction === 'leaderboard' && styles.actionLabelActive
             ]}
           >
             Leaderboard
           </Text>
         </View>
       )}
     </View>
     {/* Divider below the button row */}
     <View style={styles.divider} />

     {/* Group Feed Section */}
     <View style={styles.groupFeedSection}>
       <Text style={styles.sectionTitle}>Group Activity</Text>
       {isMember ? (
         <GroupFeedContent groupId={id} userProfile={userProfile} />
       ) : (
         <Text style={styles.joinToSeeText}>Join the group to see activity</Text>
       )}
     </View>


     <View style={styles.membersSection}>
       <Text style={styles.sectionTitle}>Members</Text>
       {sortedMembers.map((member) => renderMember(member))}
     </View>

     {/* Invite Friends Modal */}
     <Modal
       visible={showInviteModal}
       transparent={true}
       animationType="fade"
       onRequestClose={() => setShowInviteModal(false)}
     >
       <View style={styles.modalOverlay}>
         <View style={styles.modalContent}>
           <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Invite Friends</Text>
             <TouchableOpacity
               style={styles.closeIconButton}
               onPress={() => setShowInviteModal(false)}
             >
               <Ionicons name="close" size={24} color="#00ffff" />
             </TouchableOpacity>
           </View>
           
           <ScrollView style={styles.modalScrollView}>
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>Your Friends</Text>
               {friends.length === 0 ? (
                 <Text style={styles.emptyText}>No friends to invite</Text>
               ) : (
                 friends.map((friend) => (
                   <View key={friend.id} style={styles.friendRow}>
                     <Image
                       source={
                         friend.avatar_url
                           ? { uri: friend.avatar_url }
                           : { uri: 'https://placehold.co/100x100/333/fff?text=?' }
                       }
                       style={styles.friendAvatar}
                     />
                     <Text style={styles.friendName}>
                       {friend.full_name || friend.username || 'Unknown User'}
                     </Text>
                     <TouchableOpacity
                       style={[
                         styles.inviteFriendButton,
                         inviting[friend.id] && styles.invitingButton
                       ]}
                       onPress={() => handleInviteFriend(friend.id)}
                       disabled={inviting[friend.id]}
                     >
                       <Text style={styles.inviteFriendButtonText}>
                         {inviting[friend.id] ? 'Inviting...' : 'Invite'}
                       </Text>
                     </TouchableOpacity>
                   </View>
                 ))
               )}
             </View>
           </ScrollView>
           
           <TouchableOpacity
             style={styles.closeButton}
             onPress={() => setShowInviteModal(false)}
           >
             <Text style={styles.closeButtonText}>Close</Text>
           </TouchableOpacity>
         </View>
       </View>
     </Modal>
   </ScrollView>
 );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  errorText: {
    color: '#ff0055',
    fontSize: 18,
  },
  header: {
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
    opacity: 0.8,
  },
  groupInfo: {
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    marginTop: -35,
    position: 'relative',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  groupAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 5,
    borderColor: '#00ffff',
    marginTop: -60,
    alignSelf: 'center',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  groupName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    textShadowColor: 'rgba(0, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  groupDescription: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  activityStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 28,
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 255, 255, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.15)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#00ffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 6,
    textShadowColor: 'rgba(0, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statLabel: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    gap: 24,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.15)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  metaText: {
    color: '#00ffff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingVertical: 16,
    backgroundColor: '#000',
    paddingHorizontal: 20,
  },
  actionButtonContainer: {
    alignItems: 'center',
    flex: 1,
  },
  actionCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionLabel: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  actionCircleActive: {
    backgroundColor: '#00ffff',
    borderColor: '#00ffff',
    shadowColor: '#00ffff',
    shadowOpacity: 0.4,
  },
  actionLabelActive: {
    color: '#00ffff',
    fontWeight: 'bold',
  },
  groupFeedSection: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    color: '#00ffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  membersSection: {
    marginTop: 8,
    padding: 24,
    paddingTop: 8,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  memberAvatarContainer: {
    marginRight: 16,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  memberRole: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 10,
  },
  memberActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  promoteButton: {
    backgroundColor: '#FFD700',
  },
  demoteButton: {
    backgroundColor: '#FFD700',
  },
  kickButton: {
    backgroundColor: '#ff4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 28,
    width: '92%',
    maxHeight: '88%',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.15)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.15)',
  },
  modalTitle: {
    color: '#00ffff',
    fontSize: 26,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  closeIconButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalScrollView: {
    padding: 24,
  },
  section: {
    marginBottom: 28,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  friendAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 18,
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 255, 0.4)',
  },
  friendName: {
    color: '#fff',
    fontSize: 18,
    flex: 1,
    fontWeight: '600',
  },
  inviteFriendButton: {
    backgroundColor: '#00ffff',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  invitingButton: {
    backgroundColor: '#666',
  },
  inviteFriendButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
    marginVertical: 24,
    fontStyle: 'italic',
  },
  emptyFeedText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
    paddingVertical: 40,
  },
  joinToSeeText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
    paddingVertical: 40,
  },
  closeButton: {
    backgroundColor: '#ff0055',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    margin: 24,
    shadowColor: '#ff0055',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default GroupDetailScreen;


