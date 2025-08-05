import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';

const getTableAndColumn = (type) => {
  if (type === 'workout') return { table: 'workout_comments', column: 'workout_id', activityTable: 'user_workout_logs', titleField: 'workout_name' };
  if (type === 'mental') return { table: 'mental_session_comments', column: 'session_id', activityTable: 'mental_session_logs', titleField: 'session_name' };
  if (type === 'run') return { table: 'run_comments', column: 'run_id', activityTable: 'runs', titleField: null };
  if (type === 'pr') return { table: 'pr_comments', column: 'pr_id', activityTable: 'personal_records', titleField: 'exercise' };
  return { table: null, column: null, activityTable: null, titleField: null };
};

const CommentsScreen = () => {
  const router = useRouter();
  const { activityId, activityType } = useLocalSearchParams();
  const [comments, setComments] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [activityTitle, setActivityTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const flatListRef = useRef(null);

  const { table, column, activityTable, titleField } = getTableAndColumn(activityType);

  useEffect(() => {
    fetchCurrentUser();
    fetchCommentsAndProfiles();
    fetchActivityTitle();
  }, [activityId, activityType]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchCommentsAndProfiles = async () => {
    if (!table || !activityId) return;
    setLoading(true);
    // Fetch comments only
    const { data: commentsData, error } = await supabase
      .from(table)
      .select('*')
      .eq(column, activityId)
      .order('created_at', { ascending: true });
    if (error) {
      setComments([]);
      setProfiles({});
      setLoading(false);
      return;
    }
    setComments(commentsData);
    // Fetch all unique user profiles
    const userIds = [...new Set(commentsData.map(c => c.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);
      const profilesMap = {};
      (profilesData || []).forEach(p => { profilesMap[p.id] = p; });
      setProfiles(profilesMap);
    } else {
      setProfiles({});
    }
    setLoading(false);
  };

  const fetchActivityTitle = async () => {
    if (!activityTable || !activityId) {
      setActivityTitle('');
      return;
    }
    const { data, error } = await supabase
      .from(activityTable)
      .select(titleField ? `${titleField}` : '*')
      .eq('id', activityId)
      .single();
    if (error || !data) {
      setActivityTitle('');
      return;
    }
    if (activityType === 'run') {
      setActivityTitle('Run');
    } else {
      setActivityTitle(data[titleField] || '');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !table || !activityId) return;
    setSubmitting(true);
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }
    const { error } = await supabase
      .from(table)
      .insert([{ [column]: activityId, content: newComment, user_id: user.id }]);
    setNewComment('');
    setSubmitting(false);
    if (!error) {
      await fetchCommentsAndProfiles();
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from(table).delete().eq('id', commentId);
        await fetchCommentsAndProfiles();
      }}
    ]);
  };

  const getDisplayName = (profile) => {
    if (!profile) return 'Unknown';
    return profile.full_name || profile.username || 'Unknown';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/community')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#00ffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Comments</Text>
        </View>
        {activityTitle ? (
          <Text style={styles.activityTitle}>{activityTitle}</Text>
        ) : null}
        {loading ? (
          <ActivityIndicator color="#00ffff" style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={comments}
            keyExtractor={item => item.id || item.created_at}
            renderItem={({ item }) => {
              const profile = profiles[item.user_id];
              return (
                <View style={styles.commentRow}>
                  {profile?.avatar_url ? (
                    <TouchableOpacity style={styles.avatarContainer} onPress={() => profile?.id && router.push(`/profile/${profile.id}`)}>
                      <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => profile?.id && router.push(`/profile/${profile.id}`)}>
                      <Ionicons name="person-circle" size={40} color="#00ffff" style={styles.avatarFallback} />
                    </TouchableOpacity>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.username}>{getDisplayName(profile)}</Text>
                    <Text style={styles.commentContent}>{item.content}</Text>
                    <Text style={styles.commentDate}>{new Date(item.created_at).toLocaleString()}</Text>
                  </View>
                  {currentUserId === item.user_id && (
                    <TouchableOpacity onPress={() => handleDeleteComment(item.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash" size={22} color="#ff0055" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            style={{ flex: 1, marginBottom: 12 }}
            ListEmptyComponent={<Text style={styles.empty}>No comments yet.</Text>}
            onContentSizeChange={() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }}
          />
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor="#888"
            value={newComment}
            onChangeText={setNewComment}
            editable={!submitting}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleAddComment} disabled={submitting || !newComment.trim()}>
            <Ionicons name="send" size={24} color={submitting || !newComment.trim() ? '#888' : '#00ffff'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    backgroundColor: '#000',
  },
  activityTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  title: {
    color: '#00ffff',
    fontWeight: 'bold',
    fontSize: 22,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#222',
  },
  avatarFallback: {
    marginRight: 12,
  },
  username: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 2,
  },
  commentContent: {
    color: '#fff',
    fontSize: 17,
    marginBottom: 2,
  },
  commentDate: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    marginTop: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#000',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 8,
  },
  sendBtn: {
    padding: 8,
  },
  deleteBtn: {
    marginLeft: 8,
    padding: 4,
    alignSelf: 'flex-start',
  },
});

export default CommentsScreen; 