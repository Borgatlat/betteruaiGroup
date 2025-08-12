import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAIResponse } from '../../utils/aiUtils';
import { useUser } from '../../context/UserContext';
import { useAuth } from '../../context/AuthContext';
import SpeechToSpeech from './speechToSpeech';
/**
 * AI Therapist Component - Provides speech-to-speech therapy using OpenAI API
 *
 * This component creates an interactive AI therapist that:
 * 1. Accepts text input from users
 * 2. Sends messages to OpenAI API for therapeutic responses
 * 3. Converts AI responses to speech using text-to-speech
 * 4. Maintains conversation history for context
 *
 * Key Features:
 * - Real-time AI responses using GPT-3.5-turbo
 * - Text-to-speech playback of therapist responses
 * - Conversation history tracking
 * - Personalized responses based on user profile
 * - Professional therapeutic approach
 */
const AITherapist = ({ visible, onClose }) => {
  const { user } = useAuth();
  const { userProfile } = useUser();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef(null);
  const [showSpeechToSpeech, setShowSpeechToSpeech] = useState(false);
 


  // Initialize conversation with a welcoming message or load previous conversation
  useEffect(() => {
    if (visible && messages.length === 0) {
      loadPreviousConversation();
    }
  }, [visible, userProfile]);


  /**
   * Loads previous conversation from AsyncStorage
   * This function retrieves saved conversation history when the therapist opens
   */
  const loadPreviousConversation = async () => {
    try {
      const savedConversation = await AsyncStorage.getItem('aiTherapistConversation');
      if (savedConversation) {
        const conversation = JSON.parse(savedConversation);
        setMessages(conversation);
      } else {
        // Start with welcome message if no previous conversation
        const welcomeMessage = {
          id: Date.now(),
          type: 'therapist',
          text: `Hello ${userProfile?.full_name || 'there'}, I'm your AI therapist. I'm here to provide a safe space for you to talk about your thoughts, feelings, and concerns. What would you like to discuss today?


⚠️ **IMPORTANT DISCLAIMER:**
This AI is for general support and conversation only. It is NOT a replacement for professional medical care, therapy, or crisis intervention.


• If you're in crisis or having thoughts of self-harm, call 988 (Suicide & Crisis Lifeline) or 911 immediately
• For medical emergencies, contact emergency services
• Always consult with qualified healthcare professionals for medical advice


I'm here to listen and provide general support, but please seek professional help when needed.`,
          timestamp: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      // Fallback to welcome message
      const welcomeMessage = {
        id: Date.now(),
        type: 'therapist',
        text: `Hello ${userProfile?.full_name || 'there'}, I'm your AI therapist. I'm here to provide a safe space for you to talk about your thoughts, feelings, and concerns. What would you like to discuss today?`,
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  };


  // Cleanup speech when component unmounts
  useEffect(() => {
    return () => {
      // No speech cleanup needed as expo-speech is removed
    };
  }, []);


  /**
   * Converts text to speech using Expo Speech API
   * This function takes the AI therapist's response and plays it as audio
   *
   * @param {string} text - The text to convert to speech
   */
  const speakText = async (text) => {
    try {
      // Check if Speech is available
      // This function is no longer available as expo-speech is removed
      console.error('Text-to-speech functionality is currently unavailable.');
      return;
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      // Show error to user
      Alert.alert(
        'Speech Error',
        'Unable to play speech audio. Text-to-speech functionality is currently unavailable.'
      );
    }
  };

  /**
   * Cleans up AI response text by removing markdown formatting, hashtags, and other unwanted formatting
   * This function ensures clean, readable text for users
   *
   * @param {string} text - The raw AI response text
   * @returns {string} Cleaned text without formatting
   */
  const cleanAIResponse = (text) => {
    if (!text) return '';
    
    return text
      // Remove markdown bold formatting (**text**)
      .replace(/\*\*(.*?)\*\*/g, '$1')
      // Remove markdown italic formatting (*text*)
      .replace(/\*(.*?)\*/g, '$1')
      // Remove hashtags (#hashtag)
      .replace(/#\w+/g, '')
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      // Remove extra line breaks
      .replace(/\n\s*\n/g, '\n')
      // Remove leading/trailing whitespace
      .trim();
  };

  /**
   * Sends a message to the AI therapist and gets a response
   * This function handles the conversation flow with OpenAI API
   *
   * @param {string} message - The user's message
   */
  const sendMessage = async (message) => {
    if (!message.trim()) return;

    // Content filtering - check for inappropriate content
    const inappropriateKeywords = [
      'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'cock', 'cunt',
      'kill you', 'hate you', 'stupid', 'idiot', 'moron'
    ];
   
    const hasInappropriateContent = inappropriateKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    );
   
    if (hasInappropriateContent) {
      Alert.alert(
        'Inappropriate Content',
        'Please keep our conversation respectful and appropriate. I\'m here to help, but I need you to communicate respectfully.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Usage limits - check daily usage
    try {
      const today = new Date().toISOString().split('T')[0];
      const usageKey = `ai_therapist_usage_${user?.id}_${today}`;
      const currentUsage = await AsyncStorage.getItem(usageKey);
      const usageCount = currentUsage ? parseInt(currentUsage) : 0;
     
      if (usageCount >= 50) {
        Alert.alert(
          'Daily Limit Reached',
          'You\'ve reached your daily limit of 50 messages. Please try again tomorrow or consider speaking with a human therapist.',
          [{ text: 'OK' }]
        );
        return;
      }
     
      // Increment usage
      await AsyncStorage.setItem(usageKey, (usageCount + 1).toString());
    } catch (error) {
      console.error('Error checking usage limits:', error);
    }

    setIsLoading(true);

    // Add user message to conversation
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: message,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    try {
      // Create a therapeutic system prompt for the AI
      const systemPrompt = `You are a compassionate, professional AI therapist specializing in mental health support. Your role is to:

1. Provide empathetic, non-judgmental responses
2. Use evidence-based therapeutic techniques
3. Help users explore their thoughts and feelings
4. Offer coping strategies and mindfulness techniques
5. Maintain professional boundaries
6. Encourage self-reflection and growth
7. Provide crisis resources when needed

IMPORTANT GUIDELINES:
- Always respond with empathy and understanding
- Use active listening techniques
- Ask open-ended questions to encourage exploration
- Provide practical coping strategies
- Never give medical advice or diagnose
- If someone is in crisis, provide crisis resources
- Keep responses conversational but therapeutic
- Use the user's name when appropriate
- Offer specific breathing exercises or mindfulness techniques when relevant
- Suggest journaling prompts for self-reflection
- Do not use markdown formatting, hashtags, or special formatting in your responses
- Write in plain text only

User Profile: ${userProfile?.full_name || 'User'}
Current Context: Mental wellness session
Remember: You are a supportive presence, not a replacement for professional therapy.`;

      // Crisis detection and response
      const crisisKeywords = [
        'suicide', 'kill myself', 'want to die', 'end it all', 'no reason to live',
        'self-harm', 'hurt myself', 'cut myself', 'self injury',
        'suicidal', 'suicidal thoughts', 'suicidal ideation',
        'depression', 'depressed', 'hopeless', 'worthless',
        'anxiety', 'panic attack', 'can\'t breathe', 'overwhelmed',
        'emergency', 'crisis', 'help me', 'can\'t take it anymore'
      ];

      const hasCrisisContent = crisisKeywords.some(keyword =>
        message.toLowerCase().includes(keyword)
      );

      if (hasCrisisContent) {
        const crisisResponse = {
          success: true,
          response: `I'm concerned about what you're sharing and want to make sure you're safe.

CRISIS RESOURCES - PLEASE READ:

If you're in immediate danger:
• Call 911 (Emergency Services)
• Call 988 (Suicide & Crisis Lifeline) - Available 24/7
• Text HOME to 741741 (Crisis Text Line)

Professional Help:
• Talk to a mental health professional
• Contact your doctor or therapist
• Visit your nearest emergency room

Remember: You're not alone, and help is available. Your life has value, and there are people who care about you and want to help.

Would you like to talk more about what's going on, or would you prefer to connect with one of these crisis resources right now?`
        };
       
        const crisisMessage = {
          id: Date.now() + 1,
          type: 'therapist',
          text: cleanAIResponse(crisisResponse.response),
          timestamp: new Date().toISOString(),
          isCrisis: true
        };

        setMessages(prev => [...prev, crisisMessage]);

        // Save conversation
        try {
          const conversationHistory = messages.concat([userMessage, crisisMessage]);
          await AsyncStorage.setItem('aiTherapistConversation', JSON.stringify(conversationHistory));
        } catch (error) {
          console.error('Error saving crisis conversation:', error);
        }

        return;
      }

      // Get AI response using the existing generateAIResponse function
      const aiResult = await generateAIResponse(
        message,
        {
          userName: userProfile?.full_name || 'User',
          profile: userProfile,
          mood: 'seeking support', // Context for mental health session
        },
        systemPrompt
      );

      if (aiResult.success) {
        // Clean the AI response before displaying
        const cleanedResponse = cleanAIResponse(aiResult.response);
        
        const therapistMessage = {
          id: Date.now() + 1,
          type: 'therapist',
          text: cleanedResponse,
          timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, therapistMessage]);

        // Save conversation to AsyncStorage for persistence
        try {
          const conversationHistory = messages.concat([userMessage, therapistMessage]);
          await AsyncStorage.setItem('aiTherapistConversation', JSON.stringify(conversationHistory));
        } catch (error) {
          console.error('Error saving conversation:', error);
        }

        // Speech functionality removed - no longer calling speakText
        // await speakText(cleanedResponse);
      } else {
        // Handle AI response failure
        const errorMessage = {
          id: Date.now() + 1,
          type: 'therapist',
          text: "I'm having trouble connecting right now. Please try again in a moment, or feel free to continue typing. I'm here to listen.",
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'therapist',
        text: "I'm experiencing some technical difficulties. Please try again, or you can continue our conversation by typing.",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  /**
   * Handles sending message when user presses enter or send button
   */
  const handleSend = () => {
    if (inputText.trim() && !isLoading) {
      sendMessage(inputText.trim());
    }
  };


  /**
   * Formats timestamp for display
   * @param {string} timestamp - ISO timestamp string
   * @returns {string} Formatted time string
   */
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };


  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            // No speech stop needed as expo-speech is removed
            onClose();
          }} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Therapist</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Privacy & Terms',
                  'This AI therapist conversation is private and stored locally on your device. By using this feature, you agree to our terms of service and privacy policy.',
                  [
                    { text: 'OK' },
                    {
                      text: 'View Terms',
                      onPress: () => {
                        // You can add a link to your terms of service here
                        Alert.alert('Terms of Service', 'Please visit betteruai.com/terms-of-service');
                      }
                    }
                  ]
                );
              }}
              style={styles.infoButton}
            >
              <Ionicons name="information-circle-outline" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Clear Conversation',
                  'Are you sure you want to clear the conversation history?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: async () => {
                        await AsyncStorage.removeItem('aiTherapistConversation');
                        setMessages([]);
                        loadPreviousConversation();
                      }
                    }
                  ]
                );
              }}
              style={styles.clearButton}
            >
              <Ionicons name="trash-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>


        {/* Quick Actions */}
        {messages.length <= 1 && (
          <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionsTitle}>Quick Start Topics</Text>
            <View style={styles.quickActionsGrid}>
              {[
                { text: "I'm feeling anxious", icon: "nervous" },
                { text: "I need stress relief", icon: "leaf" },
                { text: "I'm having trouble sleeping", icon: "moon" },
                { text: "I want to practice mindfulness", icon: "heart" },
              ].map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickActionButton}
                  onPress={() => sendMessage(action.text)}
                >
                  <Ionicons name={action.icon} size={16} color="#00ffff" />
                  <Text style={styles.quickActionText}>{action.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}


        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.type === 'user' ? styles.userMessage : styles.therapistMessage,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  message.type === 'user' ? styles.userBubble :
                  message.isCrisis ? styles.crisisBubble : styles.therapistBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.type === 'user' ? styles.userText : styles.therapistText,
                  ]}
                >
                  {message.text}
                </Text>
                <Text style={styles.timestamp}>
                  {formatTime(message.timestamp)}
                </Text>
                <View style={styles.messageActions}>
                  {message.type === 'therapist' && (
                    <View>
                      <TouchableOpacity
                        style={styles.messageActionButton}
                        onPress={() => speakText(message.text)}
                      >
                        <Ionicons name="volume-high" size={16} color="#FF6B6B" />
                      </TouchableOpacity>
                     
                      {/* isSpeaking and currentSpeech are no longer available */}
                      {/* <TouchableOpacity
                        style={styles.messageActionButton}
                        onPress={() => {
                          if (Speech) {
                            Speech.stop();
                          }
                          setIsSpeaking(false);
                        }}
                      >
                        <Ionicons name="stop-circle" size={16} color="#FF6B6B" />
                      </TouchableOpacity> */}
                      <TouchableOpacity
                        style={styles.messageActionButton}
                        onPress={() => setShowSpeechToSpeech(true)}
                      >
                        <Ionicons name = "audio-outline" size = {16} color = "#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
         
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FF6B6B" />
              <Text style={styles.loadingText}>Therapist is thinking...</Text>
            </View>
          )}
        </ScrollView>


        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Share your thoughts..."
            placeholderTextColor="#666"
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Ionicons name="send" size={20} color="#000" />
            )}
          </TouchableOpacity>
        </View>


        {/* Speaking Indicator */}
        {/* isSpeaking is no longer available */}
        {/* {isSpeaking && (
          <View style={styles.speakingIndicator}>
            <Ionicons name="volume-high" size={16} color="#FF6B6B" />
            <Text style={styles.speakingText}>Therapist is speaking...</Text>
          </View>
        )} */}
      </View>
      <SpeechToSpeech
        visible={showSpeechToSpeech}
        onClose={() => setShowSpeechToSpeech(false)}
      />
    </Modal>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
  },
  closeButton: {
    padding: 8,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(255, 107, 107, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopButton: {
    padding: 8,
    marginRight: 8,
  },
  infoButton: {
    padding: 8,
    marginRight: 8,
  },
  clearButton: {
    padding: 8,
  },
  messageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    marginRight: 16,
    marginBottom: 8,


  },
  messageActionButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
   
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messagesContent: {
    paddingVertical: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  therapistMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#00ffff',
    borderBottomRightRadius: 4,
  },
  therapistBubble: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  crisisBubble: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    borderBottomLeftRadius: 4,
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  userText: {
    color: '#000000',
  },
  therapistText: {
    color: '#ffffff',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#FF6B6B',
    marginLeft: 10,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#FF6B6B',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  speakingText: {
    color: '#FF6B6B',
    marginLeft: 8,
    fontSize: 14,
  },
  // Quick Actions Styles
  quickActionsContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
});


export default AITherapist;

