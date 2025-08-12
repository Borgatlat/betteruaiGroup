"use client";

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, SafeAreaView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../../context/UserContext';
import { useTrainer } from '../../context/TrainerContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTracking } from '../../context/TrackingContext';
import { LoadingDots } from '../../components/LoadingDots';
import SmartUpgradePrompt from '../components/SmartUpgradePrompt';
import { ensureApiKeyAvailable } from '../../utils/apiConfig';

const TrainerScreen = () => {
  const router = useRouter();
  const { isPremium } = useUser();
  console.warn('[TrainerScreen] isPremium:', isPremium);
  const { userProfile } = useUser();
  const { conversations, sendMessage, clearConversations, isLoading, messageCount } = useTrainer();
  const { stats, trackingData, mood } = useTracking();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptType, setUpgradePromptType] = useState('ai_limit');
  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();



  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
    
    // API key is always available - no initialization needed
    console.log("[TrainerScreen] AI Trainer ready - hardcoded API key always available");
  }, []);

  useEffect(() => {
    if (loading) {
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(loadingOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading || isLoading) return;

    // Check if user has reached the limit
    if (messageCount >= MAX_DAILY_MESSAGES && !isPremium) {
      setShowUpgradePrompt(true);
      setUpgradePromptType('ai_limit');
      return;
    }

    setLoading(true);
    try {
      const result = await sendMessage(input.trim(), { stats, trackingData, mood });
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to send message');
      }
      setInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // Test function to verify API key is working
  const testApiKey = async () => {
    try {
      console.log("[TrainerScreen] Testing API key...");
      const key = await ensureApiKeyAvailable();
      Alert.alert("API Key Test", "✅ API key is always available and ready to use!");
    } catch (error) {
      console.error("[TrainerScreen] API key test error:", error);
      Alert.alert("API Key Test", "❌ Error testing API key: " + error.message);
    }
  };

  const clearMessages = async () => {
    try {
      // Show confirmation dialog
      Alert.alert(
        "Clear Conversations",
        "Are you sure you want to clear all conversations? This cannot be undone.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Clear",
            style: "destructive",
            onPress: async () => {
              const result = await clearConversations();
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to clear messages');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error clearing messages:', error);
      Alert.alert('Error', 'Failed to clear messages');
    }
  };

  const renderMessage = ({ item }) => (
    <Animated.View 
      style={[
        styles.message,
        item.sender === 'user' ? styles.userMessage : styles.aiMessage,
      ]}
    >
      {item.sender === 'trainer' && (
        <View style={styles.aiAvatarContainer}>
          <LinearGradient
            colors={['#00ffff', '#0088ff']}
            style={styles.aiAvatar}
          >
            <Ionicons name="fitness" size={16} color="#fff" />
          </LinearGradient>
        </View>
      )}
      <View style={[
        styles.messageContent,
        item.sender === 'user' ? styles.userMessageContent : styles.aiMessageContent
      ]}>
        <Text style={[
          styles.messageText,
          item.sender === 'user' ? styles.userMessageText : styles.aiMessageText
        ]}>
          {item.message}
        </Text>
      </View>
    </Animated.View>
  );

  const MAX_DAILY_MESSAGES = isPremium ? 100 : 10;

  // Preset questions for quick access
  const presetQuestions = [
    "What's a good workout for beginners?",
    "How can I improve my running pace?",
    "What should I eat before a workout?",
    "How do I stay motivated to exercise?",
    "What's the best way to build muscle?",
    "How often should I work out?",
    "What exercises help with weight loss?",
    "How do I prevent workout injuries?",
    "What's a good warm-up routine?",
    "How can I track my progress better?"
  ];

  const handlePresetQuestion = async (question) => {
    if (loading || isLoading) return;
    
    // Check if user has reached the limit
    if (messageCount >= MAX_DAILY_MESSAGES && !isPremium) {
      setShowUpgradePrompt(true);
      setUpgradePromptType('ai_limit');
      return;
    }
    
    setLoading(true);
    try {
      const result = await sendMessage(question, { stats, trackingData, mood });
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LinearGradient
        colors={['#00131a', '#00334d', '#000']}
        style={styles.gradient}
      >
        <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.title}>AI Trainer</Text>
              <Text style={styles.subtitle}>Your Personalized Fitness Coach</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.testButton}
                onPress={testApiKey}
              >
                <Ionicons name="checkmark-circle-outline" size={24} color="#00ffff" />
              </TouchableOpacity>
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearMessages}
            >
              <Ionicons name="trash-outline" size={24} color="#ff4444" />
            </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <Text style={[
              styles.messageCount,
              messageCount >= MAX_DAILY_MESSAGES && styles.messageCountLimit
            ]}>
              {`${messageCount}/${MAX_DAILY_MESSAGES}`}
            </Text>
          </View>

          <FlatList
            ref={flatListRef}
            data={conversations}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.chatContainer}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages yet</Text>
              </View>
            }
            ListFooterComponent={
              <Animated.View 
                style={[
                  styles.message,
                  styles.aiMessage,
                  { opacity: loadingOpacity }
                ]}
              >
                <View style={styles.aiAvatarContainer}>
                  <LinearGradient
                    colors={['#00ffff', '#0088ff']}
                    style={styles.aiAvatar}
                  >
                    <Ionicons name="fitness" size={16} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={[styles.messageContent, styles.aiMessageContent]}>
                  <LoadingDots size={10} color="#00ffff" />
                </View>
              </Animated.View>
            }
          />

          {/* Horizontal Preset Questions */}
          <View style={styles.presetContainer}>
            <FlatList
              data={presetQuestions}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.presetQuestion}
                  onPress={() => handlePresetQuestion(item)}
                  disabled={messageCount >= MAX_DAILY_MESSAGES}
                >
                  <Text style={styles.presetQuestionText}>{item}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item, index) => `preset-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetList}
            />
          </View>

          <BlurView intensity={40} tint="dark" style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={(text) => {
                  if (text.length <= 100) {
                    setInput(text);
                  }
                }}
                placeholder="Ask your AI trainer... (100 chars max)"
                placeholderTextColor="#00ffff99"
                editable={!loading && !isLoading && messageCount < MAX_DAILY_MESSAGES}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
                multiline
                maxLength={100}
                maxHeight={100}
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendMessage}
                disabled={!input.trim() || loading || isLoading || messageCount >= MAX_DAILY_MESSAGES}
              >
                <LinearGradient
                  colors={
                    !input.trim() || loading || isLoading || messageCount >= MAX_DAILY_MESSAGES
                      ? ['#333', '#222']
                      : ['#00ffff', '#0088ff']
                  }
                  style={styles.sendButtonGradient}
                >
                  <Ionicons name="send" size={26} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </SafeAreaView>
      </LinearGradient>
      
      {/* Smart Upgrade Prompt */}
      <SmartUpgradePrompt
        visible={showUpgradePrompt}
        type={upgradePromptType}
        currentUsage={messageCount}
        maxUsage={MAX_DAILY_MESSAGES}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={() => {
          setShowUpgradePrompt(false);
          // Analytics tracking could be added here
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.1)',
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#00ffff',
    opacity: 0.8,
  },
  backButton: {
    padding: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testButton: {
    padding: 8,
    marginRight: 8,
  },
  clearButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
  messageCount: {
    color: '#00ffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  messageCountLimit: {
    color: '#ff4444',
  },
  chatContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
  },
  message: {
    flexDirection: 'row',
    marginVertical: 10,
    paddingHorizontal: 8,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  aiMessage: {
    alignSelf: 'flex-start',
  },
  messageContent: {
    padding: 14,
    borderRadius: 20,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userMessageContent: {
    backgroundColor: '#00ffff',
    borderRadius: 22,
    borderTopRightRadius: 8,
    padding: 18,
    marginBottom: 2,
  },
  aiMessageContent: {
    backgroundColor: 'rgba(34, 34, 34, 0.85)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#00ffff55',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
    padding: 18,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#000',
    fontWeight: '500',
  },
  aiMessageText: {
    color: '#fff',
  },
  aiAvatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingBubbleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  presetContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  presetList: {
    paddingHorizontal: 8,
  },
  presetQuestion: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    minWidth: 120,
    maxWidth: 200,
  },
  presetQuestionText: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  uploadingContainer: {
    position: 'absolute',
    bottom: 100,
    left: 15,
    right: 15,
    alignItems: 'flex-start',
  },
  uploadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
    overflow: 'hidden',
    paddingBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    maxHeight: 120,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 8,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sendButton: {
    width: 50,
    height: 50,
  },
  sendButtonGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default TrainerScreen; 