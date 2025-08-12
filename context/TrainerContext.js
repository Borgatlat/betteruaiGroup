"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from "@react-native-async-storage/async-storage"
import { generateAIResponse } from "../utils/aiUtils"
import { useUser } from '../context/UserContext';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const TrainerContext = createContext();

export const TrainerProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messageCount, setMessageCount] = useState(0);
  const { userProfile } = useUser();
  const { isPremium } = useUser();
  console.warn('[TrainerProvider] isPremium:', isPremium);

  // Set message limits - FREE MODE: Unlimited messages for all users
  const MAX_DAILY_MESSAGES = 1000; // Effectively unlimited

  /**
   * Cleans up AI response text by removing markdown formatting, hashtags, and other unwanted formatting
   * This function ensures clean, readable text for users in the trainer interface
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

  // Helper to get today's date string
  const getTodayString = () => new Date().toISOString().split('T')[0];

  // Function to check if we need to reset message count
  const checkAndResetMessageCount = async () => {
    try {
      const lastResetDate = await AsyncStorage.getItem("lastMessageCountReset");
      const today = new Date().toDateString();
      
      if (lastResetDate !== today) {
        // Reset message count and update last reset date
        await AsyncStorage.setItem("messageCount", "0");
        await AsyncStorage.setItem("lastMessageCountReset", today);
        setMessageCount(0);
      } else {
        // Load existing message count
        const count = await AsyncStorage.getItem("messageCount");
        const parsedCount = parseInt(count || "0");
        setMessageCount(parsedCount);
        console.log("Loaded message count:", parsedCount); // Debug log
      }
    } catch (error) {
      console.error("Error checking/resetting message count:", error);
    }
  };

  // Load today's conversations from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    const timeoutId = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 5000);

    const initConversations = async () => {
      try {
        await checkAndResetMessageCount();
        // Fetch today's messages from Supabase
        const userId = userProfile?.user_id || userProfile?.id;
        if (userId) {
          const { data, error } = await supabase
            .from('trainer_messages')
            .select('*')
            .eq('user_id', userId)
            .eq('date', getTodayString())
            .order('created_at', { ascending: true });
          if (!error && data && data.length > 0) {
            const formatted = data.map(msg => ({
              id: msg.id,
              sender: msg.is_user ? 'user' : 'trainer',
              message: msg.message,
              timestamp: msg.created_at,
            }));
            setConversations(formatted);
            await AsyncStorage.setItem('trainerConversations', JSON.stringify(formatted));
          } else if (isMounted) {
            // Fallback to initial message with personalized greeting
            const userName = userProfile?.full_name || userProfile?.name || 'there';
            const initialMessage = {
              id: Date.now().toString(),
              sender: 'trainer',
              message: `Hello ${userName}! I'm your AI trainer. I have access to your profile data including your fitness goals, workout history, and personal records. How can I help you today?`,
              timestamp: new Date().toISOString(),
            };
            setConversations([initialMessage]);
            await AsyncStorage.setItem('trainerConversations', JSON.stringify([initialMessage]));
          }
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    initConversations();
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [userProfile?.user_id, userProfile?.id]);

  const sendMessage = async (message, { stats = {}, trackingData = {}, mood = '' } = {}) => {
    console.warn('=== AI TRAINER MESSAGE SENT: sendMessage CALLED ===');
    console.warn('[TrainerProvider] sendMessage isPremium:', isPremium);
    try {
      await checkAndResetMessageCount();
      if (messageCount >= MAX_DAILY_MESSAGES) {
        if (!isPremium) {
          const aiMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'trainer',
            message: "You've reached your daily limit of 10 messages. Upgrade to Premium for 100 messages per day!",
            timestamp: new Date().toISOString(),
          };
          const finalConversations = [...conversations, aiMessage];
          setConversations(finalConversations);
          await AsyncStorage.setItem('trainerConversations', JSON.stringify(finalConversations));
        }
        return { success: false, error: 'Message limit reached' };
      }
      // Add user message
      const userMessage = {
        id: Date.now().toString(),
        sender: 'user',
        message: message,
        timestamp: new Date().toISOString(),
      };
      const updatedConversations = [...conversations, userMessage];
      setConversations(updatedConversations);
      await AsyncStorage.setItem('trainerConversations', JSON.stringify(updatedConversations));
      // Save user message to Supabase
      const userId = userProfile?.user_id || userProfile?.id;
      if (userId) {
        await supabase.from('trainer_messages').insert({
          user_id: userId,
          message: message,
          is_user: true,
          date: getTodayString(),
        });
      }
      // Get AI response with all user data
      let aiResponse;
      console.warn('=== ENTERING AI RESPONSE TRY BLOCK ===');
      try {
        // Compose a comprehensive system prompt for the AI
        const userName = userProfile?.full_name || userProfile?.name || 'User';
        const systemPrompt = `You are a personalized fitness and wellness AI coach for ${userName} using the BetterU app. You have access to their complete profile data and should use it to provide highly personalized responses.

IMPORTANT: Always address the user by their name (${userName}) when appropriate and reference their specific data.

BETTERU APP FEATURES & CAPABILITIES:
You are integrated into the BetterU fitness app, which has the following features:

FREE FEATURES (Available to all users):
- Workout Tracking: Users can log and track their workouts
- Mental Wellness Sessions: Guided meditation and mental health tracking
- Run Tracking: GPS-based run tracking with pace, distance, and route mapping
- Community Feed: Share workouts, runs, and mental sessions with friends
- Basic Profile: Track personal stats, goals, and progress
- AI Trainer: Basic AI coaching (limited messages for free users)
- Workout Logs: View workout history and progress
- Run Logs: View run history and statistics
- Edit Features: Edit workouts, runs, and mental sessions
- Photo Uploads: Add photos to activities
- Map Visibility: Control who can see your run routes

PREMIUM FEATURES (Available to premium users):
- AI Trainer: 100 messages per day (vs 10 for free users)
- Personalized Workout Generation: AI creates custom workouts based on user's goals, level, and preferences
- Advanced Analytics: Detailed progress tracking and insights
- Priority Support: Enhanced customer support
- Exclusive Content: Premium workout plans and content

APP NAVIGATION & LOCATIONS:
- Home Tab: Main dashboard with quick stats and recent activities
- Workout Tab: Generate workouts (premium), track workouts, view workout logs
- Run Tab: Start runs, view run history, access run logs
- Mental Tab: Mental wellness sessions and mood tracking
- Community Tab: Social feed with friends' activities
- Profile Tab: Personal stats, settings, and profile management
- Trainer Tab: AI coaching (where you are now)

User Profile Data Available:
- Name: ${userName}
- Age: ${userProfile?.age || 'Not specified'}
- Gender: ${userProfile?.gender || 'Not specified'}
- Weight: ${userProfile?.weight || 'Not specified'} ${userProfile?.weight ? 'kg' : ''}
- Height: ${userProfile?.height || 'Not specified'} ${userProfile?.height ? 'cm' : ''}
- Training Level: ${userProfile?.training_level || 'Not specified'}
- Fitness Goal: ${userProfile?.fitness_goal || 'Not specified'}
- Bio: ${userProfile?.bio || 'Not specified'}
- Premium Status: ${isPremium ? 'Premium' : 'Free'}

Additional Data:
- Workout History: ${trackingData.workoutHistory ? trackingData.workoutHistory.length + ' sessions' : 'No data'}
- Mental Session History: ${trackingData.mentalHistory ? trackingData.mentalHistory.length + ' sessions' : 'No data'}
- Personal Records: ${trackingData.personalRecords ? trackingData.personalRecords.length + ' records' : 'No data'}
- Current Mood: ${mood || 'Not specified'}

RESPONSE GUIDELINES:
1. Use the user's name (${userName}) in your responses
2. Reference their specific fitness goals, training level, and history
3. Mention their personal records when discussing progress
4. Consider their age, weight, and height for exercise recommendations
5. Reference their workout and mental session history for context
6. Be encouraging and motivational while being specific to their situation
7. If they ask about progress, reference their actual data
8. If they ask for recommendations, consider their current fitness level and goals
9. ALWAYS mention BetterU app features when relevant:
   - For workout requests: "Go to the Workouts tab and click 'Generate Workout' for a personalized workout (Premium feature)"
   - For run tracking: "Use the Run tab to track your runs with GPS and see your route"
   - For mental wellness: "Check out the Mental tab for guided meditation sessions"
   - For community: "Share your progress in the Community tab to stay motivated"
   - For premium features: "Upgrade to Premium to unlock personalized workout generation and more AI messages"
10. Direct users to specific app locations when appropriate
11. Mention premium vs free features clearly
12. Encourage use of the app's tracking features for better progress

FORMATTING & STYLE:
- Keep responses SHORT (2-4 sentences total)
- Use 1-2 short paragraphs maximum
- Be direct and actionable
- Avoid unnecessary repetition
- Focus on the most important information first
- Use bullet points sparingly (only when essential)
- Keep each sentence brief and clear`;

        // Add log before calling generateAIResponse
        console.warn('=== ABOUT TO CALL generateAIResponse ===');
        const aiResult = await generateAIResponse(
          message,
          {
            userName: userName,
            profile: userProfile,
            stats,
            allTimeWorkoutHistory: trackingData.workoutHistory,
            allTimeMentalHistory: trackingData.mentalHistory,
            prs: trackingData.personalRecords,
            goals: userProfile?.fitness_goal || stats?.goal || '',
            bio: userProfile?.bio || '',
            mood,
            age: userProfile?.age,
            gender: userProfile?.gender,
            weight: userProfile?.weight,
            height: userProfile?.height,
            trainingLevel: userProfile?.training_level,
          },
          systemPrompt
        );
        if (aiResult.success) {
          aiResponse = cleanAIResponse(aiResult.response);
        } else {
          console.error('=== AI RESPONSE FAILED ===', aiResult.error);
          aiResponse = `Sorry, I'm having trouble connecting to my AI service right now. Error: ${aiResult.error}`;
        }
      } catch (aiError) {
        console.error('=== ERROR IN AI RESPONSE TRY BLOCK ===', aiError);
        aiResponse = `Sorry, I encountered an unexpected error: ${aiError.message}`;
      }
      // Add AI message
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'trainer',
        message: aiResponse,
        timestamp: new Date().toISOString(),
      };
      const finalConversations = [...updatedConversations, aiMessage];
      setConversations(finalConversations);
      await AsyncStorage.setItem('trainerConversations', JSON.stringify(finalConversations));
      // Save AI message to Supabase
      if (userId) {
        await supabase.from('trainer_messages').insert({
          user_id: userId,
          message: aiResponse,
          is_user: false,
          date: getTodayString(),
        });
      }
      // Update message count
      const newCount = messageCount + 1;
      setMessageCount(newCount);
      await AsyncStorage.setItem('messageCount', newCount.toString());
      return { success: true, response: aiResponse };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const clearConversations = async () => {
    try {
      const userName = userProfile?.full_name || userProfile?.name || 'there';
      const initialMessage = {
        id: Date.now().toString(),
        sender: 'trainer',
        message: `Hello ${userName}! I'm your AI trainer. I have access to your profile data including your fitness goals, workout history, and personal records. How can I help you today?`,
        timestamp: new Date().toISOString(),
      };
      setConversations([initialMessage]);
      await AsyncStorage.setItem('trainerConversations', JSON.stringify([initialMessage]));
      // Delete today's messages from Supabase
      const userId = userProfile?.user_id || userProfile?.id;
      if (userId) {
        await supabase.from('trainer_messages')
          .delete()
          .eq('user_id', userId)
          .eq('date', getTodayString());
        // Insert the initial message
        await supabase.from('trainer_messages').insert({
          user_id: userId,
          message: initialMessage.message,
          is_user: false,
          date: getTodayString(),
        });
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    conversations,
    setConversations,
    sendMessage,
    clearConversations,
    isLoading,
    messageCount,
  };

  return <TrainerContext.Provider value={value}>{children}</TrainerContext.Provider>;
};

export const useTrainer = () => {
  const context = useContext(TrainerContext);
  if (!context) {
    throw new Error('useTrainer must be used within a TrainerProvider');
  }
  return context;
};

