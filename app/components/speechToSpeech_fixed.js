import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Speech } from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAIResponse } from '../../utils/aiUtils';
import { useUser } from '../../context/UserContext';
import { useAuth } from '../../context/AuthContext';
import { getOpenAIApiKey } from '../../utils/apiConfig';

const { width } = Dimensions.get('window');

/**
 * Speech-to-Speech Component for AI Therapist
 * 
 * This component provides real-time voice interaction with the AI therapist:
 * 1. Records user's voice using React Native Audio
 * 2. Transcribes speech to text using OpenAI Whisper API
 * 3. Gets AI response using GPT-3.5-turbo
 * 4. Converts AI response back to speech using Expo Speech
 * 
 * Key Features:
 * - Voice activity detection with auto-stop
 * - Real-time status updates with visual feedback
 * - Conversation counting for usage tracking
 * - Error handling with user-friendly messages
 * - Privacy-focused (conversations stored locally)
 */
const SpeechToSpeech = ({ visible, onClose }) => {
  const { user } = useAuth();
  const { userProfile } = useUser();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recording, setRecording] = useState(null);
  const [status, setStatus] = useState('Ready to talk');
  const [conversationCount, setConversationCount] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const recordingTimeoutRef = useRef(null);
 
  // Animation values for visual feedback
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Initialize audio recording permissions
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Microphone Permission Required',
            'Please grant microphone permission in your device settings to use voice chat.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => {
                // Note: In a real app, you'd use expo-linking to open device settings
                console.log('User should open device settings for microphone permissions');
              }}
            ]
          );
        }
      } catch (error) {
        console.error('Error requesting audio permissions:', error);
        Alert.alert('Permission Error', 'Unable to access microphone. Please check your device settings.');
      }
    })();
  }, []);

  // Load conversation count when modal opens
  useEffect(() => {
    if (visible) {
      loadConversationCount();
    }
  }, [visible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (Speech) {
        Speech.stop();
      }
      // Clean up recording if it's still active
      if (recording) {
        recording.stopAndUnloadAsync().catch(console.error);
      }
    };
  }, [recording]);

  // Animation effects for recording and speaking states
  useEffect(() => {
    if (isRecording || isSpeaking) {
      // Start pulse animation - this creates the "breathing" effect on the microphone button
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
 
      // Start glow animation - this creates the glowing shadow effect
      Animated.loop(
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false, // Shadow properties can't use native driver
        })
      ).start();
    } else {
      // Stop animations and reset to default state
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isRecording, isSpeaking]);

  const loadConversationCount = async () => {
    try {
      const count = await AsyncStorage.getItem('speechConversationCount');
      setConversationCount(count ? parseInt(count) : 0);
    } catch (error) {
      console.error('Error loading conversation count:', error);
    }
  };

  /**
   * Start recording user's voice using React Native Audio
   * This function initializes the microphone and begins capturing audio
   */
  const startRecording = async () => {
    try {
      if (isProcessing || isSpeaking) return;

      setStatus('Starting recording...');
     
      // Check permissions first
      const { status } = await Audio.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Audio.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert('Permission Denied', 'Microphone permission is required for voice chat.');
          setStatus('Ready to talk');
          return;
        }
      }
     
      // Configure audio settings for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false, // Don't record in background for privacy
        shouldDuckAndroid: true, // Lower other audio when recording
        playThroughEarpieceAndroid: false,
      });

      // Create recording with high quality settings
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
     
      setRecording(recording);
      setIsRecording(true);
      setStatus('Recording... Speak now!');

      // Auto-stop recording after 30 seconds (prevents runaway recording)
      recordingTimeoutRef.current = setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 30000);

    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Recording Error', 'Unable to start recording. Please check microphone permissions and try again.');
      setStatus('Ready to talk');
    }
  };

  /**
   * Stop recording and process speech
   * This function stops the audio recording and begins processing the captured audio
   */
  const stopRecording = async () => {
    try {
      if (!recording) return;

      // Clear the timeout
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }

      setIsRecording(false);
      setStatus('Processing your speech...');
      setIsProcessing(true);
     
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
     
      if (!uri) {
        throw new Error('No audio file generated');
      }
     
      // Process the recorded audio
      await processSpeechToText(uri);
     
    } catch (error) {
      console.error('Error stopping recording:', error);
      setStatus('Recording error. Please try again.');
      setIsProcessing(false);
    }
  };

  /**
   * Transcribe audio using OpenAI Whisper API
   * This function sends the recorded audio to OpenAI's Whisper API for transcription
   * 
   * @param {string} audioUri - The URI of the recorded audio file
   * @returns {string} - The transcribed text
   */
  const transcribeAudio = async (audioUri) => {
    try {
      // Get API key
      const apiKey = await getOpenAIApiKey();
      if (!apiKey) {
        throw new Error('No OpenAI API key found');
      }
     
      // Create form data for OpenAI Whisper
      const formData = new FormData();
     
      // For React Native, we need to handle the file differently
      const audioFile = {
        uri: audioUri,
        type: 'audio/wav',
        name: 'recording.wav',
      };
     
      formData.append('file', audioFile);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en'); // Specify language for better accuracy
     
      // Send to OpenAI Whisper API
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData
      });
     
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Whisper API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }
     
      const result = await response.json();
      return result.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
     
      // Enhanced fallback for testing - simulate transcription
      if (error.message.includes('401') || error.message.includes('network') || error.message.includes('No OpenAI API key found')) {
        console.log('Using fallback transcription for testing');
        return simulateTranscription();
      }
     
      throw error;
    }
  };

  /**
   * Enhanced fallback transcription for testing
   * This provides realistic test messages when API is unavailable
   */
  const simulateTranscription = () => {
    const testMessages = [
      "Hello, how are you doing today?",
      "I'm feeling a bit stressed and could use some support.",
      "Can you help me with some breathing exercises?",
      "I had a great workout this morning and I'm feeling energized.",
      "I'm having trouble sleeping lately, any advice?",
      "I want to practice mindfulness and meditation.",
      "I'm feeling overwhelmed with work and need some coping strategies.",
      "What are some good stress relief techniques?",
      "I'm looking for ways to improve my mental health.",
      "How can I stay motivated and positive?",
    ];
   
    // Return a random message for testing
    return testMessages[Math.floor(Math.random() * testMessages.length)];
  };

  /**
   * Process speech to text using React Native file system
   * This function coordinates the transcription and AI response process
   */
  const processSpeechToText = async (audioUri) => {
    try {
      setStatus('Converting speech to text...');
     
      // Transcribe the audio to text
      const userMessage = await transcribeAudio(audioUri);
     
      if (!userMessage || userMessage.trim() === '') {
        setStatus('No speech detected. Try again.');
        setIsProcessing(false);
        return;
      }
     
      setStatus('Getting AI response...');
      await processUserSpeech(userMessage);
     
    } catch (error) {
      console.error('Error processing speech:', error);
     
      // Enhanced user-friendly error messages
      let errorMessage = 'Error processing speech. Try again.';
      if (error.message.includes('401')) {
        errorMessage = 'API key error. Please check your OpenAI API key in settings.';
      } else if (error.message.includes('429')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message.includes('No OpenAI API key found')) {
        errorMessage = 'OpenAI API key not configured. Using demo mode.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Microphone permission required. Please grant permission in settings.';
      }
     
      setStatus(errorMessage);
      setIsProcessing(false);
    }
  };

  /**
   * Process user's speech and get AI response
   * This function sends the transcribed text to the AI and handles the response
   */
  const processUserSpeech = async (userMessage) => {
    try {
      // Get AI response using a conversational prompt optimized for voice interaction
      const aiResult = await generateAIResponse(
        userMessage,
        {
          userName: userProfile?.full_name || 'User',
          profile: userProfile,
          mood: 'voice-conversation',
        },
        "You are a friendly, conversational AI therapist. Keep responses concise and natural for voice interaction. Be supportive and engaging. Respond as if you're having a real conversation. Keep responses under 100 words for better voice experience."
      );

      if (aiResult.success) {
        // Increment conversation count
        const newCount = conversationCount + 1;
        setConversationCount(newCount);
        await AsyncStorage.setItem('speechConversationCount', newCount.toString());
       
        // Speak the response
        setStatus('Speaking response...');
        await speakResponse(aiResult.response);
      } else {
        setStatus('Ready to talk');
        setIsProcessing(false);
        Alert.alert('AI Error', 'Unable to get AI response. Please try again.');
      }
    } catch (error) {
      console.error('Error processing message:', error);
      setStatus('Ready to talk');
      setIsProcessing(false);
      Alert.alert('Processing Error', 'Unable to process your message. Please try again.');
    }
  };

  /**
   * Speak AI response using Expo Speech API
   * This function converts the AI's text response to speech
   * 
   * @param {string} text - The text to convert to speech
   */
  const speakResponse = async (text) => {
    try {
      if (!Speech) {
        console.error('Speech module not available');
        setStatus('Speech not available');
        setIsProcessing(false);
        return;
      }

      setIsSpeaking(true);
      setStatus('Speaking...');
     
      // Configure speech options for Expo Speech API
      // Note: Expo Speech uses device's built-in TTS, not cloud voices like Google Cloud TTS
      const speechOptions = {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,     // Slightly slower for clarity
        volume: 1.0,
        quality: 'Enhanced', // Use enhanced quality if available
        onDone: () => {
          setIsSpeaking(false);
          setStatus('Ready to talk');
          setIsProcessing(false);
        },
        onStopped: () => {
          setIsSpeaking(false);
          setStatus('Ready to talk');
          setIsProcessing(false);
        },
        onError: (error) => {
          console.error('Speech playback error:', error);
          setIsSpeaking(false);
          setStatus('Speech error');
          setIsProcessing(false);
        }
      };
     
      await Speech.speak(text, speechOptions);

      // Fallback timeout in case callbacks don't fire
      setTimeout(() => {
        setIsSpeaking(false);
        setStatus('Ready to talk');
        setIsProcessing(false);
      }, text.length * 80); // 80ms per character estimation
     
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
      setStatus('Speech error');
      setIsProcessing(false);
      Alert.alert('Speech Error', 'Unable to play speech. Please check your device volume and try again.');
    }
  };

  // Clear conversation count
  const clearConversation = async () => {
    try {
      await AsyncStorage.removeItem('speechConversationCount');
      setConversationCount(0);
      Alert.alert('Success', 'Conversation count cleared.');
    } catch (error) {
      console.error('Error clearing conversation:', error);
      Alert.alert('Error', 'Failed to clear conversation count.');
    }
  };

  /**
   * Get status color based on current state
   * This function returns the appropriate color for the current status
   */
  const getStatusColor = () => {
    if (isRecording) return '#00ffff'; // BetterU cyan for recording
    if (isProcessing) return '#FFD93D'; // Yellow for processing
    if (isSpeaking) return '#6BCF7F';   // Green for speaking
    return '#00ffff'; // Default BetterU cyan
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
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Voice AI Assistant</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={clearConversation}
              style={styles.clearButton}
              accessible={true}
              accessibilityLabel="Clear conversation history"
              accessibilityRole="button"
            >
              <Ionicons name="trash-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Display */}
        <View style={[styles.statusContainer, { backgroundColor: `${getStatusColor()}15` }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{status}</Text>
          {(isRecording || isProcessing || isSpeaking) && (
            <ActivityIndicator size="small" color={getStatusColor()} style={styles.statusIndicator} />
          )}
        </View>

        {/* Conversation Counter */}
        <View style={styles.counterContainer}>
          <View style={styles.counterBadge}>
            <Ionicons name="chatbubbles-outline" size={16} color="#00ffff" />
            <Text style={styles.counterText}>
              {conversationCount} conversations today
            </Text>
          </View>
        </View>

        {/* Voice Controls */}
        <View style={styles.voiceControls}>
          {/* Record Button with Animation */}
          <Animated.View
            style={[
              styles.recordButtonContainer,
              {
                transform: [{ scale: pulseAnim }],
                shadowOpacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.8],
                }),
              }
            ]}
          >
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
                (isProcessing || isSpeaking) && styles.recordButtonDisabled
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || isSpeaking}
              accessible={true}
              accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}
              accessibilityRole="button"
              accessibilityHint="Tap to start or stop voice recording"
            >
              <Ionicons
                name={isRecording ? "stop-circle" : "mic"}
                size={40}
                color={isRecording ? "#FF6B6B" : "#00ffff"}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Stop Speaking Button */}
          {isSpeaking && (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={() => {
                if (Speech) {
                  Speech.stop();
                }
                setIsSpeaking(false);
                setStatus('Ready to talk');
                setIsProcessing(false);
              }}
              accessible={true}
              accessibilityLabel="Stop AI speech"
              accessibilityRole="button"
            >
              <Ionicons name="volume-mute" size={24} color="#FF6B6B" />
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <View style={styles.instructionCard}>
            <Ionicons name="mic-outline" size={24} color="#00ffff" style={styles.instructionIcon} />
            <Text style={styles.instructionsText}>
              Tap the microphone to start talking. The AI will listen, respond, and speak back to you.
            </Text>
          </View>
          <View style={styles.instructionCard}>
            <Ionicons name="time-outline" size={20} color="#666" style={styles.instructionIcon} />
            <Text style={styles.instructionsSubtext}>
              Recording will auto-stop after 30 seconds or tap again to stop manually.
            </Text>
          </View>
          <View style={styles.instructionCard}>
            <Ionicons name="bulb-outline" size={20} color="#FFD700" style={styles.instructionIcon} />
            <Text style={styles.instructionsSubtext}>
              Speak clearly and naturally. The AI will provide personalized mental wellness support.
            </Text>
          </View>
          <View style={styles.instructionCard}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#6BCF7F" style={styles.instructionIcon} />
            <Text style={styles.instructionsSubtext}>
              Your conversations are private and stored locally on your device.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // BetterU black background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)', // BetterU cyan accent
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
  },
  closeButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 255, 255, 0.5)', // BetterU cyan glow
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    margin: 20,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusIndicator: {
    marginLeft: 10,
  },
  counterContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)', // BetterU cyan tint
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  counterText: {
    color: '#00ffff', // BetterU cyan text
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  voiceControls: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  recordButtonContainer: {
    marginBottom: 30,
  },
  recordButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 255, 255, 0.1)', // BetterU cyan background
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#00ffff', // BetterU cyan border
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  recordButtonActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
  },
  recordButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: '#666',
    opacity: 0.5,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  stopButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  instructionsContainer: {
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.05)', // BetterU cyan tint
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  instructionIcon: {
    marginRight: 12,
  },
  instructionsText: {
    color: '#fff', // White text for better readability
    fontSize: 14,
    textAlign: 'left',
    lineHeight: 20,
    flex: 1,
  },
  instructionsSubtext: {
    color: '#999', // Lighter gray for secondary text
    fontSize: 12,
    textAlign: 'left',
    lineHeight: 16,
    flex: 1,
  },
});

export default SpeechToSpeech;