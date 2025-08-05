import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const getTableAndColumn = (type) => {
  if (type === 'workout') return { table: 'workout_comments', column: 'workout_id' };
  if (type === 'mental') return { table: 'mental_session_comments', column: 'session_id' };
  if (type === 'run') return { table: 'run_comments', column: 'run_id' };
  if (type === 'pr') return { table: 'pr_comments', column: 'pr_id' };
  return { table: null, column: null };
};

const CommentsModal = ({ visible, onClose, activityId, activityType }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { table, column } = getTableAndColumn(activityType);

  useEffect(() => {
    if (visible) fetchComments();
  }, [visible, activityId, activityType]);

  const fetchComments = async () => {
    if (!table || !activityId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(column, activityId)
      .order('created_at', { ascending: true });
    if (!error) setComments(data);
    setLoading(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !table || !activityId) return;
    setSubmitting(true);
    const { error } = await supabase
      .from(table)
      .insert([{ [column]: activityId, content: newComment }]);
    setNewComment('');
    setSubmitting(false);
    if (!error) fetchComments();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Comments</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color="#00ffff" style={{ marginTop: 32 }} />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={item => item.id || item.created_at}
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  <Ionicons name="person-circle" size={28} color="#00ffff" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentContent}>{item.content}</Text>
                    <Text style={styles.commentDate}>{new Date(item.created_at).toLocaleString()}</Text>
                  </View>
                </View>
              )}
              style={{ flex: 1, marginBottom: 12 }}
              ListEmptyComponent={<Text style={styles.empty}>No comments yet.</Text>}
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
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#18191b',
    borderRadius: 18,
    padding: 18,
    width: '92%',
    maxWidth: 420,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    color: '#00ffff',
    fontWeight: 'bold',
    fontSize: 22,
  },
  closeBtn: {
    padding: 4,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  commentContent: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 2,
  },
  commentDate: {
    color: '#888',
    fontSize: 11,
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
});

export default CommentsModal; 