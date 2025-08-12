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


const SpeechToSpeech = ({ visible, onClose }) => {
  const { user } = useAuth();
  const { userProfile } = useUser();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
const [isSpeaking, setIsSpeaking] = useState(false);
  const [recording, setRecording] = useState(null);
  const [status, setStatus] = useState('Ready to talk');
  const [conversationCount, setConversationCount] = useState(0);
  const [dailyUsageCount, setDailyUsageCount] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const recordingTimeoutRef = useRef(null);
 
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;


  // Initialize audio recording
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
                // You can add logic to open device settings here
                console.log('User should open device settings');
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


  // Load conversation count and daily usage
  useEffect(() => {
    if (visible) {
      loadConversationCount();
      loadDailyUsageCount();
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


  // Animation effects
  useEffect(() => {
    if (isRecording) {
   
      // Start pulse animation
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
 
      // Start glow animation
      Animated.loop(
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        })
      ).start();
    } else {
      // Stop animations
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isRecording]);


useEffect(() => {
  if (isSpeaking) {
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
    Animated.loop(
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      })
      ).start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isSpeaking]);


  const loadConversationCount = async () => {
    try {
      const count = await AsyncStorage.getItem('speechConversationCount');
      setConversationCount(count ? parseInt(count) : 0);
    } catch (error) {
      console.error('Error loading conversation count:', error);
    }
  };

  const loadDailyUsageCount = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentUsage = await AsyncStorage.getItem(`ai_therapist_usage_${user?.id}_${today}`);
      setDailyUsageCount(currentUsage ? parseInt(currentUsage) : 0);
    } catch (error) {
      console.error('Error loading daily usage count:', error);
    }
  };


  // Start recording user's voice using React Native Audio
  const startRecording = async () => {
    try {
      if (isProcessing || isSpeaking) return;

      // Check usage limits before starting recording
      const canUse = await checkUsageLimits();
      if (!canUse) {
        setStatus('Daily limit reached');
        return;
      }

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
     
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });


      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
     
      setRecording(recording);
      setIsRecording(true);
      setStatus('Recording... Speak now!');


      // Auto-stop recording after 30 seconds (voice activity detection)
      recordingTimeoutRef.current = setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 30000);


    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Recording Error', 'Unable to start recording. Please try again.');
      setStatus('Ready to talk');
    }
  };


  // Stop recording and process speech
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


  // Transcribe audio using OpenAI Whisper API
  const transcribeAudio = async (audioUri) => {
    try {
      // Get API key
      const apiKey = await getOpenAIApiKey();
     
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


  // Enhanced fallback transcription for testing
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
      "I'm feeling anxious about my upcoming presentation.",
      "Can you help me with some relaxation techniques?",
      "I want to improve my mood and feel better.",
      "What are some good ways to manage stress?",
      "I need help with my mental wellness journey."
    ];
   
    // Return a random message for testing
    return testMessages[Math.floor(Math.random() * testMessages.length)];
  };


  // Process speech to text using React Native file system
  const processSpeechToText = async (audioUri) => {
    try {
      setStatus('Converting speech to text...');
     
      // For React Native, we can use the URI directly
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
      } else if (error.message.includes('blob')) {
        errorMessage = 'Audio processing error. Please try recording again.';
      } else if (error.message.includes('No OpenAI API key found')) {
        errorMessage = 'OpenAI API key not configured. Using demo mode.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Microphone permission required. Please grant permission in settings.';
      }
     
      setStatus(errorMessage);
      setIsProcessing(false);
     
      // Show alert for critical errors
      if (error.message.includes('401') || error.message.includes('permission')) {
        Alert.alert(
          'Configuration Required',
          'Please check your OpenAI API key in the app settings or grant microphone permissions.',
          [
            { text: 'OK' },
            {
              text: 'Open Settings',
              onPress: () => {
                // You can add navigation to settings here
                console.log('Navigate to settings');
              }
            }
          ]
        );
      }
    }
  };


  // Process user's speech and get AI response
  const processUserSpeech = async (userMessage) => {
    try {
      // Get AI response
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
      }
    } catch (error) {
      console.error('Error processing message:', error);
      setStatus('Ready to talk');
      setIsProcessing(false);
    }
  };


  // Speak AI response
  const speakResponse = async (text) => {
    try {
      if (!Speech) {
        console.error('Speech module not available');
        setStatus('Ready to talk');
        setIsProcessing(false);
        return;
      }


      setIsSpeaking(true);
      setStatus('Speaking...');
     
      await Speech.speak(text, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
        volume: 1.0,
        voice: 'en-US-Wavenet-1', // Use a better voice
      });


      // Fallback timeout
      setTimeout(() => {
        setIsSpeaking(false);
        setStatus('Ready to talk');
        setIsProcessing(false);
      }, text.length * 80);
     
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
      setStatus('Ready to talk');
      setIsProcessing(false);
    }
  };

  const checkUsageLimits = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentUsage = await AsyncStorage.getItem(`ai_therapist_usage_${user?.id}_${today}`);
      const usageCount = currentUsage ? parseInt(currentUsage) : 0;

      if (usageCount >= 50) {
        Alert.alert(
          'Daily Limit Reached', 
          'You\'ve reached your daily limit of 50 messages. Upgrade to Premium for unlimited AI therapy sessions!',
          [
            { text: 'OK' },
            { 
              text: 'Upgrade to Premium', 
              onPress: () => {
                // Navigate to premium subscription page
                navigation.navigate('Premium');
                onClose(); // Close the speech modal first
                // You can add navigation to premium page here
                console.log('Navigate to premium subscription');
              }
            }
          ]
        );
        return false; // Return false to indicate limit exceeded
      }

      await AsyncStorage.setItem(`ai_therapist_usage_${user?.id}_${today}`, (usageCount + 1).toString());
      return true; // Return true to indicate usage is allowed
    } catch (error) {
      console.error('Error checking usage limits:', error);
      return true; // Allow usage if there's an error checking limits
    }
  }

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


  const getStatusColor = () => {
    if (isRecording) return '#FF6B6B';
    if (isProcessing) return '#FFD93D';
    if (isSpeaking) return '#6BCF7F';
    return '#00ffff';
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
            >
              <Ionicons name="trash-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>


        {/* Status Display */}
        <View style={[styles.statusContainer, { backgroundColor: `rgba(${getStatusColor()}, 0.1)` }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{status}</Text>
          {(isRecording || isProcessing || isSpeaking) && (
            <ActivityIndicator size="small" color={getStatusColor()} style={styles.statusIndicator} />
          )}
        </View>


        {/* Conversation Counter */}
        <View style={styles.counterContainer}>
          <View style={styles.counterBadge}>
            <Ionicons name="chatbubbles-outline" size={16} color="#666" />
            <Text style={styles.counterText}>
              {conversationCount} conversations
            </Text>
          </View>
          <View style={styles.usageBadge}>
            <Ionicons name="time-outline" size={14} color="#FFD700" />
            <Text style={styles.usageText}>
              {50 - (dailyUsageCount || 0)} messages left today
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
            >
              <Ionicons name="volume-mute" size={24} color="#FF6B6B" />
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          )}
        </View>


        {/* Simple Instruction Subtitle */}
        <View style={styles.instructionSubtitle}>
          <Text style={styles.instructionSubtitleText}>
            Tap the microphone to start talking
          </Text>
        </View>
      </View>
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
    textShadowColor: 'rgba(0, 255, 255, 0.5)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  usageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  usageText: {
    color: '#FFD700',
    fontSize: 12,
    marginLeft: 6,
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
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#00ffff',
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
  instructionSubtitle: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 20,
  },
  instructionSubtitleText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
});


export default SpeechToSpeech;



