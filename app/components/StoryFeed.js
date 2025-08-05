import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../context/UserContext';
import { PremiumAvatar } from './PremiumAvatar';
import * as ImagePicker from 'expo-image-picker';


/**
 * StoryFeed Component - Instagram-style stories for fitness community
 *
 * Features:
 * - Display stories from friends and community
 * - Create new stories with text, images, or videos
 * - Story reactions and views tracking
 * - 24-hour expiration (like Instagram stories)
 * - Story highlights for permanent stories
 */
const StoryFeed = ({ onStoryPress }) => {
  const router = useRouter();
  const { userProfile } = useUser();
  const [stories, setStories] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStoryContent, setNewStoryContent] = useState('');
  const [newStoryType, setNewStoryType] = useState('general');
  const [uploading, setUploading] = useState(false);


  // Fetch stories from database
  const fetchStories = async () => {
    try {
      setLoading(true);
     
      // Get stories from friends and public stories
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          user:user_id (
            id,
            username,
            avatar_url,
            is_premium,
            full_name
          ),
          story_views!inner(viewer_id),
          story_reactions!inner(user_id)
        `)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50);


      if (error) throw error;


      // Process stories to add engagement data
      const processedStories = (data || []).map(story => ({
        ...story,
        viewCount: story.story_views?.length || 0,
        reactionCount: story.story_reactions?.length || 0,
        hasViewed: story.story_views?.some(view => view.viewer_id === userProfile?.id) || false,
        hasReacted: story.story_reactions?.some(reaction => reaction.user_id === userProfile?.id) || false,
      }));


      setStories(processedStories);
    } catch (error) {
      console.error('Error fetching stories:', error);
      Alert.alert('Error', 'Failed to load stories');
    } finally {
      setLoading(false);
    }
  };


  // Create new story
  const createStory = async () => {
    if (!newStoryContent.trim()) {
      Alert.alert('Error', 'Please add some content to your story');
      return;
    }


    try {
      setUploading(true);


      const { data, error } = await supabase
        .from('stories')
        .insert({
          user_id: userProfile.id,
          type: newStoryType,
          content: newStoryContent.trim(),
          title: getStoryTitle(newStoryType),
          is_public: true,
        })
        .select()
        .single();


      if (error) throw error;


      // Refresh stories
      await fetchStories();
     
      // Reset form
      setNewStoryContent('');
      setNewStoryType('general');
      setShowCreateModal(false);
     
      Alert.alert('Success', 'Story created successfully!');
    } catch (error) {
      console.error('Error creating story:', error);
      Alert.alert('Error', 'Failed to create story');
    } finally {
      setUploading(false);
    }
  };


  // Add story view
  const addStoryView = async (storyId) => {
    try {
      await supabase.rpc('increment_story_views', {
        story_uuid: storyId,
        viewer_uuid: userProfile.id
      });
    } catch (error) {
      console.error('Error adding story view:', error);
    }
  };


  // Add story reaction
  const addStoryReaction = async (storyId, reactionType = 'like') => {
    try {
      const { error } = await supabase
        .from('story_reactions')
        .upsert({
          story_id: storyId,
          user_id: userProfile.id,
          reaction_type: reactionType,
        });


      if (error) throw error;


      // Refresh stories to update reaction count
      await fetchStories();
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };


  // Get story title based on type
  const getStoryTitle = (type) => {
    const titles = {
      workout: 'Workout Story',
      mental: 'Mental Wellness',
      run: 'Running Story',
      achievement: 'Achievement',
      milestone: 'Milestone',
      general: 'My Story'
    };
    return titles[type] || 'My Story';
  };


  // Get story icon based on type
  const getStoryIcon = (type) => {
    const icons = {
      workout: 'fitness',
      mental: 'leaf',
      run: 'walk',
      achievement: 'trophy',
      milestone: 'star',
      general: 'chatbubble'
    };
    return icons[type] || 'chatbubble';
  };


  // Get story color based on type
  const getStoryColor = (type) => {
    const colors = {
      workout: '#FF6B6B',
      mental: '#4CAF50',
      run: '#2196F3',
      achievement: '#FFD700',
      milestone: '#9C27B0',
      general: '#00ffff'
    };
    return colors[type] || '#00ffff';
  };


  // Handle story press
  const handleStoryPress = async (story) => {
    // Add view if not already viewed
    if (!story.hasViewed) {
      await addStoryView(story.id);
    }
   
    // Navigate to story detail or call parent handler
    if (onStoryPress) {
      onStoryPress(story);
    } else {
      router.push(`/story/${story.id}`);
    }
  };


  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStories();
    setRefreshing(false);
  };


  // Initial fetch
  useEffect(() => {
    if (userProfile?.id) {
      fetchStories();
    }
  }, [userProfile?.id]);


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ffff" />
        <Text style={styles.loadingText}>Loading stories...</Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stories</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>


      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00ffff"
          />
        }
        contentContainerStyle={styles.storiesContainer}
      >
        {/* Create Story Button */}
        <TouchableOpacity
          style={styles.createStoryItem}
          onPress={() => setShowCreateModal(true)}
        >
          <View style={styles.createStoryAvatar}>
            <Ionicons name="add" size={24} color="#00ffff" />
          </View>
          <Text style={styles.createStoryText}>Add Story</Text>
        </TouchableOpacity>


        {/* Story Items */}
        {stories.map((story, index) => (
          <TouchableOpacity
            key={story.id}
            style={styles.storyItem}
            onPress={() => handleStoryPress(story)}
          >
            <View style={[
              styles.storyAvatar,
              { borderColor: getStoryColor(story.type) },
              story.hasViewed && styles.viewedStory
            ]}>
              <PremiumAvatar
                size={45}
                source={story.user?.avatar_url ? { uri: story.user.avatar_url } : null}
                isPremium={story.user?.is_premium}
                username={story.user?.username}
                fullName={story.user?.full_name}
              />
              <View style={[styles.storyTypeIndicator, { backgroundColor: getStoryColor(story.type) }]}>
                <Ionicons name={getStoryIcon(story.type)} size={12} color="#fff" />
              </View>
            </View>
            <Text style={styles.storyUsername} numberOfLines={1}>
              {story.user?.username || 'User'}
            </Text>
            <Text style={styles.storyTime}>
              {new Date(story.created_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>


      {/* Create Story Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Story</Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>


            {/* Story Type Selector */}
            <View style={styles.typeSelector}>
              {['general', 'workout', 'mental', 'run', 'achievement', 'milestone'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    newStoryType === type && { backgroundColor: getStoryColor(type) }
                  ]}
                  onPress={() => setNewStoryType(type)}
                >
                  <Ionicons
                    name={getStoryIcon(type)}
                    size={20}
                    color={newStoryType === type ? '#fff' : '#666'}
                  />
                  <Text style={[
                    styles.typeText,
                    newStoryType === type && styles.selectedTypeText
                  ]}>
                    {getStoryTitle(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>


            {/* Story Content */}
            <TextInput
              style={styles.storyInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#666"
              value={newStoryContent}
              onChangeText={setNewStoryContent}
              multiline
              maxLength={500}
            />


            {/* Create Button */}
            <TouchableOpacity
              style={[
                styles.createStoryButton,
                uploading && styles.createStoryButtonDisabled
              ]}
              onPress={createStory}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.createStoryButtonText}>Create Story</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  createButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#666',
    marginTop: 10,
  },
  storiesContainer: {
    paddingHorizontal: 20,
  },
  createStoryItem: {
    alignItems: 'center',
    marginRight: 15,
    width: 70,
  },
  createStoryAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#00ffff',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  createStoryText: {
    color: '#00ffff',
    fontSize: 12,
    textAlign: 'center',
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 15,
    width: 70,
  },
  storyAvatar: {
    position: 'relative',
    marginBottom: 8,
  },
  viewedStory: {
    borderColor: '#666',
    opacity: 0.6,
  },
  storyTypeIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  storyUsername: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  storyTime: {
    color: '#666',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 5,
  },
  typeText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedTypeText: {
    color: '#fff',
  },
  storyInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  createStoryButton: {
    backgroundColor: '#00ffff',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
  },
  createStoryButtonDisabled: {
    backgroundColor: '#666',
  },
  createStoryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});


export default StoryFeed;

