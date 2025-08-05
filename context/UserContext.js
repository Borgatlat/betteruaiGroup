"use client"

import React, { createContext, useState, useContext, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { supabase } from "../lib/supabase"
import { AppState } from "react-native"
import { useAuth } from "../context/AuthContext"

// Create user context with proper type
const UserContext = createContext({
  userProfile: null,
  isLoading: true,
  initializationError: null,
  updateProfile: () => {},
  personalRecords: [],
  fetchPersonalRecords: () => {},
  addPersonalRecord: () => {},
  isPremium: false,
  checkSubscriptionStatus: () => {},
});

export const UserProvider = ({ children, onReady }) => {
  console.warn('[UserContext] UserProvider mounted');
  const [userProfile, setUserProfile] = useState({
    name: "",
    age: "",
    weight: "",
    height: "",
    goal: "",
    trainingLevel: "intermediate",
    fitness_goal: "",
    gender: "",
    bio: ""
  })

  const [isLoading, setIsLoading] = useState(true)
  const [initializationError, setInitializationError] = useState(null)
  const [personalRecords, setPersonalRecords] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState(null);
  const { user, profile } = useAuth();

  // Initial check of premium status
  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
    }
  }, []);

  useEffect(() => {
    console.warn('[UserContext] useEffect running. user:', user, 'profile:', profile);
    if (user) {
      checkSubscriptionStatus();
    } else {
      setIsPremium(false);
      setSubscriptionEndDate(null);
    }
  }, [user, profile]);

  // Check subscription status
  const checkSubscriptionStatus = async () => {
    try {
      console.log('[UserContext] Checking subscription status...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[UserContext] No user found, setting isPremium to false');
        setIsPremium(false);
        return;
      }

      // Check premium status from profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[UserContext] Error fetching premium status:', error);
        setIsPremium(false);
        return;
      }

      const premiumStatus = profile?.is_premium || false;
      console.log('[UserContext] Premium status from database:', premiumStatus);
      setIsPremium(premiumStatus);
        
    } catch (error) {
      console.error('[UserContext] Error in checkSubscriptionStatus:', error);
      setIsPremium(false);
    }
  };

  // Sync profile from Supabase to context and AsyncStorage
  const syncProfileFromSupabase = async () => {
    try {
      console.log('[UserContext] syncProfileFromSupabase called');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[UserContext] No user found during profile sync');
        await AsyncStorage.removeItem('userProfile');
        setIsLoading(false);
        return;
      }

      // First try to get the profile
      const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

      if (profileError) {
        console.log('Profile fetch result:', profile, profileError);
        
        if (profileError.code === 'PGRST116') {
          // Profile doesn't exist, initialize it
          const { error: initError } = await supabase.rpc('initialize_existing_user', { user_id: user.id });
          
          if (initError) {
            console.error('Error initializing user data:', initError);
            throw initError;
          }
          
          // Try fetching again
          const { data: newProfile, error: newProfileError } = await supabase
              .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (newProfileError) {
            console.error('Error fetching profile after initialization:', newProfileError);
            throw newProfileError;
          }
          
          // Initialize profile data
          await supabase.rpc('initialize_profile_data', { user_id: user.id });
          
          // Fetch one more time to get the updated data
          const { data: finalProfile, error: finalError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
              .single();

          if (finalError) {
            throw finalError;
          }
          
          await AsyncStorage.setItem('userProfile', JSON.stringify(finalProfile));
          setUserProfile(finalProfile);
          return;
        }
        
        throw profileError;
      }

      if (profile) {
        console.log('[UserContext] Profile data from Supabase:', profile);
        // Check if the profile has completed onboarding
        const hasCompletedOnboarding = profile.onboarding_completed === true;
        console.log('[UserContext] Onboarding status:', hasCompletedOnboarding);
        
        // If onboarding is completed, ensure we don't reset it
        if (hasCompletedOnboarding) {
          await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
          setUserProfile(profile);
        } else {
          // If onboarding is not completed, initialize the profile
          await supabase.rpc('initialize_profile_data', { user_id: user.id });
          
          // Fetch the updated profile
          const { data: updatedProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (fetchError) {
            throw fetchError;
          }
          
          await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
          setUserProfile(updatedProfile);
        }
      }
    } catch (err) {
      console.error('[UserContext] Error in syncProfileFromSupabase:', err);
      setInitializationError(err);
      await AsyncStorage.removeItem('userProfile');
    } finally {
      setIsLoading(false);
    }
  };

  // Load user data from storage and then sync from Supabase
  useEffect(() => {
    let isMounted = true;
    let retryTimeout;
    let loadingTimeout;
    let subscriptionCheckInterval;

    const loadUserData = async () => {
      try {
        console.log('[UserContext] loadUserData called');
        setIsLoading(true);
        setInitializationError(null);

        // Load profile from AsyncStorage
        const profileData = await AsyncStorage.getItem('userProfile');
        if (profileData) {
          try {
            const parsedProfile = JSON.parse(profileData);
            if (isMounted) {
              setUserProfile(parsedProfile);
              console.log('[UserContext] Loaded profile from AsyncStorage:', parsedProfile);
            }
          } catch (parseError) {
            await AsyncStorage.removeItem('userProfile');
          }
        }

        // Check subscription status first
        await checkSubscriptionStatus();

        // Set up interval to check subscription status every 5 minutes
        subscriptionCheckInterval = setInterval(checkSubscriptionStatus, 5 * 60 * 1000);

        // Sync profile from Supabase with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries && isMounted) {
          try {
            await syncProfileFromSupabase();
            break;
          } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
              console.log('[UserContext] Keeping existing profile data after failed sync');
            } else {
              await new Promise(resolve => {
                retryTimeout = setTimeout(resolve, 1000 * retryCount);
              });
            }
          }
        }

        if (isMounted) {
          setIsLoading(false);
          onReady?.();
          console.log('[UserContext] Finished loading user data, setIsLoading(false)');
        }
      } catch (error) {
        console.error('[UserContext] Error in loadUserData:', error);
        if (isMounted) {
          setInitializationError(error);
          setIsLoading(false);
        }
      }
    };

    loadUserData();

    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (loadingTimeout) clearTimeout(loadingTimeout);
      if (subscriptionCheckInterval) clearInterval(subscriptionCheckInterval);
    };
  }, []);

  // Add AppState listener to check subscription status when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('[UserContext] App came to foreground, checking subscription status');
        checkSubscriptionStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Save profile changes to Supabase and local state
  const updateProfile = async (updates) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'No user logged in' };
      }

      // Update Supabase
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      // Check for errors
      if (error) {
        console.error('[UserContext] Error updating profile:', error);
        return { success: false, error: error.message };
      }

      // If successful, update local state
      if (data) {
        const updatedProfile = { ...userProfile, ...updates };
      setUserProfile(updatedProfile);
        await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
        return { success: true, data };
      }

      // If no data returned
      return { success: false, error: 'No data returned from update' };
    } catch (err) {
      console.error('[UserContext] Error in updateProfile:', err);
      return { success: false, error: err.message || 'An error occurred' };
    }
  };

  // Fetch personal records from Supabase
  const fetchPersonalRecords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('personal_records')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching PRs from Supabase:', error);
        setPersonalRecords([]);
        return;
      }
      setPersonalRecords(data || []);
    } catch (error) {
      console.error('Error fetching PRs:', error);
      setPersonalRecords([]);
    }
  };

  // Optionally, call fetchPersonalRecords in useEffect after profile loads
  useEffect(() => {
    if (!isLoading && userProfile && userProfile.email) {
      fetchPersonalRecords();
    }
  }, [isLoading, userProfile]);

  // Add a method to update PRs
  const addPersonalRecord = async (record) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'No user' };
      const { data, error } = await supabase
        .from('personal_records')
        .insert([{ ...record, profile_id: user.id }])
        .select();
      if (error) return { error };
      setPersonalRecords((prev) => [data[0], ...prev]);
      return { success: true };
    } catch (error) {
      return { error };
    }
  };

  const value = {
    userProfile,
    isLoading,
    initializationError,
    updateProfile,
    personalRecords,
    fetchPersonalRecords,
    addPersonalRecord,
    isPremium,
    checkSubscriptionStatus,
  };

  console.log('[UserContext] Current isPremium value:', isPremium);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}

export default { UserProvider, useUser }

const fetchProfile = async (userId) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      // First try to get the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.log('Profile fetch result:', profile, profileError);
        
        if (profileError.code === 'PGRST116') {
          // Profile doesn't exist, initialize it
          const { error: initError } = await supabase.rpc('initialize_existing_user', { user_id: userId });
          
          if (initError) {
            console.error('Error initializing user data:', initError);
            throw initError;
          }
          
          // Try fetching again
          const { data: newProfile, error: newProfileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
          if (newProfileError) {
            console.error('Error fetching profile after initialization:', newProfileError);
            throw newProfileError;
          }
          
          return newProfile;
        }
        
        throw profileError;
      }

      return profile;
    } catch (error) {
      console.error('[UserContext] Error fetching profile from Supabase:', error);
      throw error;
    }
  };

