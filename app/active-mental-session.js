"use client";

import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTracking } from '../context/TrackingContext';
import { supabase } from '../lib/supabase';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import PremiumFeature from './components/PremiumFeature';
import { useUser } from '../context/UserContext';

const ActiveMentalSession = () => {
  const router = useRouter();
  const { incrementStat } = useTracking();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const [timeLeft, setTimeLeft] = useState(params.duration * 60);
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(1)).current;
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const soundRef = useRef(null);
  const { isPremium } = useUser();

  const session = {
    id: params.id,
    title: params.title,
    duration: parseInt(params.duration),
    description: params.description,
    steps: JSON.parse(params.steps),
    session_type: params.type
  };

  // Map session.id to audio file
  const getAudioFile = () => {
    if (session.id === 'box-breathing') {
      return require('../assets/audio/box_breathing.mp3');
    } else if (session.id === '478-breathing') {
      return require('../assets/audio/478_breathing.mp3');
    } else if (session.id === 'body_scan' || session.id === 'body-scan') {
      return require('../assets/audio/body_scan_meditation.mp3');
    } else if (
      session.id === 'mindful_awareness' ||
      session.id === 'mindful-awareness' ||
      session.id === 'mindful-meditation'
    ) {
      return require('../assets/audio/mindful_awareness_meditation.mp3');
    } else if (
      session.id === 'progressive_relaxation' ||
      session.id === 'progressive-relaxation'
    ) {
      return require('../assets/audio/progressive_relaxation_meditation.mp3');
    } else if (
      session.id === 'visualization' ||
      session.id === 'peaceful_place' ||
      session.id === 'peaceful-place'
    ) {
      return require('../assets/audio/peaceful_place_meditation.mp3');
    }
    return null;
  };

  // Load audio when session starts or session.id changes
  useEffect(() => {
    let isMounted = true;
    const loadAudio = async () => {
      try {
        // Unload any existing sound
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }
        // Only load audio for premium users
        if (!isPremium) {
          soundRef.current = null;
          if (isMounted) {
            setSound(null);
            setIsPlaying(false);
          }
          return;
        }
        const audioFile = getAudioFile();
        console.log('Audio file for session', session.id, audioFile ? 'FOUND' : 'NOT FOUND');
        if (audioFile) {
          // Configure audio session for iOS builds
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
          });
          
          const { sound: audioSound } = await Audio.Sound.createAsync(
            audioFile,
            { 
              shouldPlay: false, 
              volume: volume,
              progressUpdateIntervalMillis: 1000,
              positionMillis: 0,
              isLooping: false,
            }
          );
          
          // Set up audio status updates
          audioSound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded) {
              console.log('Audio status:', status.positionMillis, status.durationMillis);
            }
          });
          
          await audioSound.setRateAsync(0.80, true);
          soundRef.current = audioSound;
          if (isMounted) {
            setSound(audioSound);
            setIsPlaying(false);
          }
        } else {
          soundRef.current = null;
          if (isMounted) {
            setSound(null);
            setIsPlaying(false);
          }
        }
      } catch (error) {
        console.error('Error loading audio:', error);
        console.error('Audio error details:', {
          sessionId: session.id,
          audioFile: getAudioFile(),
          isPremium: isPremium,
          errorMessage: error.message,
          errorCode: error.code
        });
        Alert.alert('Error', `Failed to load audio: ${error.message}`);
      }
    };
    loadAudio();
    return () => {
      isMounted = false;
      if (soundRef.current) {
        soundRef.current.stopAsync();
        soundRef.current.unloadAsync();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, isPremium]);

  // Play audio when session is activated
  useEffect(() => {
    if (!sound) {
      console.log('No sound loaded, skipping play/pause');
      return;
    }
    if (isActive && !isPlaying) {
      sound.playAsync();
      sound.setRateAsync(0.80, true);
      setIsPlaying(true);
    } else if (!isActive && isPlaying) {
      sound.pauseAsync();
      setIsPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, sound]);

  // Handle volume change
  const handleVolumeChange = async (value) => {
    setVolume(value);
    if (sound) {
      await sound.setVolumeAsync(value);
    }
  };

  // Handle mute toggle
  const toggleMute = async () => {
    if (sound) {
      if (isMuted) {
        await sound.setVolumeAsync(volume);
      } else {
        await sound.setVolumeAsync(0);
      }
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          const newTime = time - 1;
          // Update progress animation
          Animated.timing(progressAnimation, {
            toValue: 1 - (newTime / (session.duration * 60)),
            duration: 1000,
            useNativeDriver: true
          }).start();
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      handleFinishSession();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Rotate through steps
  useEffect(() => {
    if (isActive) {
      const stepInterval = setInterval(() => {
        // Fade out current step
        Animated.timing(fadeAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }).start(() => {
          // Update step index
          setCurrentStepIndex(current => (current + 1) % session.steps.length);
          // Fade in new step
          Animated.timing(fadeAnimation, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
          }).start();
        });
      }, 4000);
      return () => clearInterval(stepInterval);
    }
  }, [isActive]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Save and go to summary
  const handleFinishSession = async () => {
    if (!user) {
      console.error('No user found');
      return;
    }

      setIsActive(false);

      // Navigate to summary
      router.push({
        pathname: '/mental-session-summary',
        params: {
          sessionType: session.session_type || 'meditation',
          duration: session.duration,
        },
      });
  };

  // Replay audio from the beginning
  const replayAudio = async () => {
    if (sound) {
      try {
        await sound.setPositionAsync(0);
        await sound.setRateAsync(0.80, true);
        await sound.playAsync();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error replaying audio:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => {
            if (isActive) {
              Alert.alert(
                'End Session',
                'Are you sure you want to end this session early?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'End Session', style: 'destructive', onPress: () => router.back() }
                ]
              );
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{session.title}</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
      {/* Timer Circle */}
      <View style={styles.timerContainer}>
        <View style={styles.timerCircle}>
          <Animated.View 
            style={[
              styles.progressCircle,
              {
                transform: [{
                  rotateZ: progressAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg']
                  })
                }]
              }
            ]}
          />
          <View style={styles.timerContent}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
              {/* Timer play/pause button: free users can use timer, only premium gets audio */}
            <TouchableOpacity
              style={[styles.timerButton, isActive && styles.timerButtonActive]}
                onPress={() => {
                  setIsActive(!isActive);
                  if (isPremium) {
                    if (!sound) {
                      console.log('Play pressed but sound is not loaded');
                      return;
                    }
                    if (!isActive) {
                      sound && sound.playAsync();
                    } else {
                      sound && sound.pauseAsync();
                    }
                  }
                }}
                disabled={isPremium ? !sound : false}
            >
              <Ionicons 
                name={isActive ? "pause" : "play"} 
                size={30} 
                color={isActive ? "#000" : "#00ffff"} 
              />
            </TouchableOpacity>
          </View>
        </View>
          {/* Red upgrade message for free users */}
          {!isPremium && (
            <Text style={{ color: '#ff4444', textAlign: 'center', marginTop: 10, fontWeight: 'bold' }}>
              Upgrade to Premium to access guided audio for this session.
            </Text>
          )}
      </View>

        {/* Audio Controls: only for premium users */}
        {isPremium && sound && (
          <PremiumFeature isPremium={isPremium} onPress={() => {}}>
            <View style={styles.audioControls}>
              <TouchableOpacity onPress={toggleMute} style={styles.muteButton}>
                <Ionicons 
                  name={isMuted ? "volume-mute" : "volume-high"} 
                  size={24} 
                  color="#00ffff" 
                />
              </TouchableOpacity>
              <Slider
                style={styles.volumeSlider}
                minimumValue={0}
                maximumValue={1}
                value={isMuted ? 0 : volume}
                onValueChange={handleVolumeChange}
                minimumTrackTintColor="#00ffff"
                maximumTrackTintColor="rgba(0, 255, 255, 0.3)"
                thumbTintColor="#00ffff"
              />
              <TouchableOpacity onPress={replayAudio} style={styles.muteButton}>
                <Ionicons name="refresh" size={24} color="#00ffff" />
              </TouchableOpacity>
            </View>
          </PremiumFeature>
        )}

      {/* Current Step */}
      <Animated.View 
        style={[
          styles.stepContainer, 
          { 
            opacity: fadeAnimation,
            transform: [{
              translateY: fadeAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })
            }]
          }
        ]}
      >
        <Text style={styles.stepNumber}>Step {currentStepIndex + 1}/{session.steps.length}</Text>
        <Text style={styles.stepText}>{session.steps[currentStepIndex]}</Text>
      </Animated.View>

      {/* Description */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionText}>{session.description}</Text>
      </View>
      </ScrollView>

      {/* Finish Button */}
      <View style={styles.finishButtonContainer}>
      <TouchableOpacity
          style={styles.finishButton}
        onPress={handleFinishSession}
      >
        <Text style={styles.finishButtonText}>Finish Session</Text>
      </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  closeButton: {
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 15,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  timerCircle: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  progressCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 5,
    borderColor: '#00ffff',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 8,
    transform: [{ rotate: '-90deg' }],
  },
  timerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  timerText: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  timerButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00ffff',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  timerButtonActive: {
    backgroundColor: '#00ffff',
  },
  stepContainer: {
    padding: 25,
    marginTop: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  stepNumber: {
    fontSize: 18,
    color: '#00ffff',
    marginBottom: 12,
    fontWeight: '600',
  },
  stepText: {
    fontSize: 22,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 32,
    fontWeight: '500',
  },
  descriptionContainer: {
    padding: 25,
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  descriptionText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
  finishButtonContainer: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  finishButton: {
    backgroundColor: '#00ffff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  finishButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  muteButton: {
    padding: 10,
    marginRight: 10,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
  },
});

export default ActiveMentalSession; 