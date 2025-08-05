import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { AppState } from 'react-native';

// Create context with default values
const TrackingContext = createContext({
  calories: { consumed: 0, goal: 2000 },
  water: { consumed: 0, goal: 2.0 },
  protein: { consumed: 0, goal: 150 }, // Add protein tracking with default goal of 150g
  mood: 'neutral',
  stats: {
    workouts: 0,
    minutes: 0,
    mental_sessions: 0,
    prs_this_month: 0,
    streak: 0,
    today_workout_completed: false,
    today_mental_completed: false
  },
  addCalories: async () => {},
  addWater: async () => {},
  addProtein: async () => {}, // Add protein function
  updateMood: async () => {},
  updateGoal: async () => {},
  updateStats: async () => {},
  incrementStat: async () => {},
  setMood: () => {}
});

export const TrackingProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [isMounted, setIsMounted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [calories, setCalories] = useState({
    consumed: 0,
    goal: 2000
  });
  
  const [water, setWater] = useState({
    consumed: 0,
    goal: 2.0
  });

  const [protein, setProtein] = useState({
    consumed: 0,
    goal: 150
  });

  const [mood, setMood] = useState('neutral');
  const [stats, setStats] = useState({
    workouts: 0,
    minutes: 0,
    mental_sessions: 0,
    prs_this_month: 0,
    streak: 0,
    today_workout_completed: false,
    today_mental_completed: false
  });

  const [trackingData, setTrackingData] = useState({
    workouts: [],
    exercises: [],
    currentWorkout: null,
    currentExercise: null,
    workoutHistory: [],
    exerciseHistory: [],
    personalRecords: [],
    workoutStats: {},
    exerciseStats: {},
    isLoading: true,
    error: null
  });

  const [initializationError, setInitializationError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Add retry logic for network requests
  const fetchWithRetry = async (operation, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error);
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };

  // Load initial stats and streak on profile load
  useEffect(() => {
    const loadInitialStats = async () => {
      if (!profile?.profile_id) return;
      
      try {
        setIsLoading(true);
        console.log('[TrackingContext] Loading initial stats for profile:', profile.profile_id);

        // Fetch user_stats with retry
        const { data: statsData, error: statsError } = await fetchWithRetry(() => 
          supabase
            .from('user_stats')
            .select('*')
            .eq('profile_id', profile.profile_id)
            .maybeSingle()
        );

        if (statsError) {
          console.error('Error fetching user stats:', statsError);
          return;
        }

        if (statsData) {
          console.log('[TrackingContext] Loaded user stats:', statsData);
          setStats(prev => ({
            ...prev,
            ...statsData,
            streak: prev.streak // Keep current streak until we fetch it
          }));
        }

        // Fetch streak with retry
        const { data: streakData, error: streakError } = await fetchWithRetry(() => 
          supabase
            .from('betteru_streaks')
            .select('*')
            .eq('profile_id', profile.profile_id)
            .maybeSingle()
        );

        if (streakError) {
          console.error('Error fetching streak:', streakError);
          return;
        }

        if (streakData) {
          console.log('[TrackingContext] Loaded streak data:', streakData);
          setStats(prev => ({
            ...prev,
            streak: streakData.current_streak || 0
          }));
        }
      } catch (error) {
        console.error('Error loading initial stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialStats();
  }, [profile?.profile_id]);

  // Safe state update function
  const safeSetState = (setter, value) => {
    if (isMounted) {
      setter(value);
    }
  };

  // Safe AsyncStorage operations
  const safeAsyncStorage = async (operation) => {
    try {
      return await operation();
    } catch (error) {
      console.error('AsyncStorage operation failed:', error);
      return null;
    }
  };

  // Safe Supabase operations with retry
  const safeSupabase = async (operation) => {
    try {
      return await fetchWithRetry(operation);
    } catch (error) {
      console.error('Supabase operation failed:', error);
      return { data: null, error };
    }
  };

  // Helper to get profile_id for the current user
  const getProfileId = async () => {
    console.log('[getProfileId] profile from AuthContext:', profile);
    if (profile?.id) return profile.id;
    console.log('No profile found in AuthContext');
    return null;
  };

  // Safe database operation wrapper with retry
  const safeDbOperation = async (operation) => {
    const profileId = await getProfileId();
    if (!profileId) {
      console.log('No profile ID found, skipping database operation');
      return { data: null, error: null };
    }
    try {
      return await fetchWithRetry(() => operation(profileId));
    } catch (error) {
      console.error('Error in database operation:', error);
      return { data: null, error };
    }
  };

  // Load saved data on mount
  useEffect(() => {
    setIsMounted(true);
    let retryTimeout;

    const loadSavedData = async () => {
      if (!profile?.id) {
        console.log('[TrackingContext] Profile not loaded yet, skipping loadSavedData');
        return;
      }
      try {
        console.log('[TrackingContext] Starting to load data for profile:', profile.id);
        setIsLoading(true);

        const today = new Date();
        const userMidnight = new Date(today);
        userMidnight.setHours(0, 0, 0, 0);
        const todayStr = userMidnight.toISOString().split('T')[0];

        console.log('[TrackingContext] Loading saved data for profile:', profile.id);
        console.log('[TrackingContext] Today\'s date:', todayStr);

        // Check if we need to reset based on last reset date
        const lastResetDate = await safeAsyncStorage(() => 
          AsyncStorage.getItem('lastResetDate')
        );

        if (lastResetDate) {
          const lastReset = new Date(lastResetDate);
          lastReset.setHours(0, 0, 0, 0);
          
          // If last reset was before today's midnight in user's timezone, reset everything
          if (lastReset.getTime() < userMidnight.getTime()) {
            console.log('[TrackingContext] Resetting daily data for new day');
            
            // Reset completion status in Supabase
            const { error } = await supabase
              .from('profiles')
              .update({
                today_workout_completed: false,
                today_mental_completed: false,
                daily_workouts_generated: 0,
                last_reset_date: todayStr
              })
              .eq('profile_id', profile.id);

            if (error) {
              console.error('[TrackingContext] Error resetting completion status:', error);
            }

            // Save reset date
            await safeAsyncStorage(() => 
              AsyncStorage.setItem('lastResetDate', userMidnight.toISOString())
            );

            // Reset calories and water in Supabase, but keep goals
            const { error: calorieError } = await supabase
              .from('calorie_tracking')
              .upsert({
                profile_id: profile.id,
                date: todayStr,
                consumed: 0,
                goal: calories.goal || 2000, // Keep existing goal
                updated_at: new Date().toISOString()
              });

            if (calorieError) {
              console.error('[TrackingContext] Error resetting calories:', calorieError);
            }

            const { error: waterError } = await supabase
              .from('water_tracking')
              .upsert({
                profile_id: profile.id,
                date: todayStr,
                glasses: 0,
                goal: water.goal || 8, // Keep existing goal
                updated_at: new Date().toISOString()
              });

            if (waterError) {
              console.error('[TrackingContext] Error resetting water:', waterError);
            }

            // Reset protein in Supabase, but keep goal
            const { error: proteinError } = await supabase
              .from('daily_macronutrients')
              .upsert({
                user_id: profile.id,
                date: todayStr,
                protein: 0,
                carbs: 0,
                fat: 0,
                fiber: 0,
                sugar: 0,
                sodium: 0,
                updated_at: new Date().toISOString()
              });

            if (proteinError) {
              console.error('[TrackingContext] Error resetting protein:', proteinError);
            }

            // Reset local state but keep goals
            setCalories(prev => ({ ...prev, consumed: 0 }));
            setWater(prev => ({ ...prev, consumed: 0 }));
            setProtein(prev => ({ ...prev, consumed: 0 }));
          }
        } else {
          // First time setup - save today as last reset date
          await safeAsyncStorage(() => 
            AsyncStorage.setItem('lastResetDate', userMidnight.toISOString())
          );
        }

        // Load mood from AsyncStorage
        const savedMood = await safeAsyncStorage(() => 
          AsyncStorage.getItem('mood')
        );
        if (savedMood) {
          setMood(savedMood);
        }

        // Load stats from AsyncStorage
        const savedStats = await safeAsyncStorage(() => 
          AsyncStorage.getItem('stats')
        );
        if (savedStats) {
          setStats(JSON.parse(savedStats));
        }

        console.log('[TrackingContext] Finished loading saved data for profile:', profile.id);
        setIsLoading(false);
      } catch (error) {
        console.error('[TrackingContext] Error loading saved data:', error);
        setIsLoading(false);
      }
    };

    loadSavedData();

    return () => {
      setIsMounted(false);
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [profile?.id]);

  // Update the checkMidnightReset function
  useEffect(() => {
    if (!user?.id || !profile?.profile_id) {
      console.log('[TrackingContext] User or profile not loaded, skipping checkMidnightReset');
      return;
    }

    let interval;
    let retryTimeout;

    const checkMidnightReset = async () => {
      try {
        if (!user?.id || !profile?.profile_id) return;

        const now = new Date();
        const userMidnight = new Date(now);
        userMidnight.setHours(24, 0, 0, 0);
        const lastResetDate = await safeAsyncStorage(() => 
          AsyncStorage.getItem('lastResetDate')
        );

        if (lastResetDate) {
          const lastReset = new Date(lastResetDate);
          lastReset.setHours(0, 0, 0, 0);
          
          // If last reset was before today's midnight in user's timezone, reset everything
          if (lastReset.getTime() < userMidnight.getTime()) {
            console.log('[TrackingContext] Resetting daily data for new day');
            
            // Delete ALL calorie tracking rows for this user
            const { error: calorieDeleteError } = await supabase
              .from('calorie_tracking')
              .delete()
              .eq('profile_id', profile.id);

            if (calorieDeleteError) {
              console.error('[TrackingContext] Error deleting calorie tracking rows:', calorieDeleteError);
            } else {
              console.log('[TrackingContext] Successfully deleted all calorie tracking rows for user');
            }

            // Delete ALL water tracking rows for this user
            const { error: waterDeleteError } = await supabase
              .from('water_tracking')
              .delete()
              .eq('profile_id', profile.id);

            if (waterDeleteError) {
              console.error('[TrackingContext] Error deleting water tracking rows:', waterDeleteError);
            } else {
              console.log('[TrackingContext] Successfully deleted all water tracking rows for user');
            }

            // Delete ALL daily macronutrient rows for this user
            const { error: macroDeleteError } = await supabase
              .from('daily_macronutrients')
              .delete()
              .eq('user_id', user.id);

            if (macroDeleteError) {
              console.error('[TrackingContext] Error deleting daily macronutrient rows:', macroDeleteError);
            } else {
              console.log('[TrackingContext] Successfully deleted all daily macronutrient rows for user');
            }

            // Save reset date
            await safeAsyncStorage(() => 
              AsyncStorage.setItem('lastResetDate', userMidnight.toISOString())
            );

            // Reset local state but keep goals
            setCalories(prev => ({ ...prev, consumed: 0 }));
            setWater(prev => ({ ...prev, consumed: 0 }));
          }
        } else {
          // First time setup - save today as last reset date
          await safeAsyncStorage(() => 
            AsyncStorage.setItem('lastResetDate', userMidnight.toISOString())
          );
        }
      } catch (error) {
        console.error('[TrackingContext] Error in midnight reset:', error);
      }
    };

    // Check for reset every minute
    interval = setInterval(checkMidnightReset, 60000);
    checkMidnightReset(); // Initial check

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [user, profile?.profile_id, calories.goal, water.goal]);

  // Add this effect to load data when profile changes
  useEffect(() => {
    if (profile?.id) {
      console.log('[TrackingContext] Profile changed, loading data for:', profile.id);
      loadTrackingData();
    }
  }, [profile?.id]);

  const loadTrackingData = async () => {
    if (!user?.id || !profile?.id) {
      console.log('[TrackingContext] No user or profile ID available');
      return;
    }

    try {
      console.log('[TrackingContext] Starting to load tracking data for profile:', profile.id);
      const today = new Date().toISOString().split('T')[0];
      
      // Load calories from Supabase for today
      const { data: calorieData, error: calorieError } = await supabase
        .from('calorie_tracking')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('date', today)
        .single();

      if (calorieError) {
        console.error('[TrackingContext] Error loading calorie data:', calorieError);
      } else {
        console.log('[TrackingContext] Loaded calorie data from Supabase:', calorieData);
        if (calorieData) {
          const newCalorieState = {
            consumed: calorieData.consumed || 0,
            goal: calorieData.goal || 2000
          };
          console.log('[TrackingContext] Setting calorie state to:', newCalorieState);
          setCalories(newCalorieState);
          await AsyncStorage.setItem('calories', JSON.stringify(newCalorieState));
        }
      }

      // Load water from Supabase for today
      const { data: waterData, error: waterError } = await supabase
        .from('water_tracking')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('date', today)
        .single();

      if (waterError) {
        console.error('[TrackingContext] Error loading water data:', waterError);
      } else {
        console.log('[TrackingContext] Loaded water data from Supabase:', waterData);
        if (waterData) {
          const newWaterState = {
            consumed: waterData.glasses * 250, // Convert glasses to ml
            goal: waterData.goal || 2.0
          };
          console.log('[TrackingContext] Setting water state to:', newWaterState);
          setWater(newWaterState);
          await AsyncStorage.setItem('water', JSON.stringify(newWaterState));
        }
      }

      // Load protein from Supabase for today
      const { data: proteinData, error: proteinError } = await supabase
        .from('daily_macronutrients')
        .select('*')
        .eq('user_id', profile.id)
        .eq('date', today)
        .single();

      if (proteinError) {
        console.error('[TrackingContext] Error loading protein data:', proteinError);
      } else {
        console.log('[TrackingContext] Loaded protein data from Supabase:', proteinData);
        if (proteinData) {
          const newProteinState = {
            consumed: proteinData.protein || 0,
            goal: protein.goal || 150 // Keep existing goal
          };
          console.log('[TrackingContext] Setting protein state to:', newProteinState);
          setProtein(newProteinState);
          await AsyncStorage.setItem('protein', JSON.stringify(newProteinState));
        }
      }

      // Load other tracking data from AsyncStorage
      const storedData = await AsyncStorage.getItem('trackingData');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          setTrackingData(prev => ({
            ...prev,
            ...parsedData,
            isLoading: false
          }));
        } catch (parseError) {
          console.error('Error parsing tracking data:', parseError);
          await AsyncStorage.removeItem('trackingData');
        }
      }

      setIsInitialized(true);
      setTrackingData(prev => ({
        ...prev,
        isLoading: false
      }));
      
      console.log('[TrackingContext] Finished loading tracking data for profile:', profile.id);
    } catch (error) {
      console.error('[TrackingContext] Error in loadTrackingData:', error);
      setInitializationError(error);
      setTrackingData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
      setIsInitialized(true);
    }
  };

  // Add a new effect to reload data when the app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('[TrackingContext] App came to foreground, reloading data');
        loadTrackingData();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user?.id, profile?.profile_id]);

  const addCalories = async (amount) => {
    try {
      const newCalories = { ...calories, consumed: calories.consumed + amount };
      
      // Update local state immediately for responsive UI
      safeSetState(setCalories, newCalories);
      
      // Save to AsyncStorage for offline persistence
      await safeAsyncStorage(() => 
        AsyncStorage.setItem('calories', JSON.stringify(newCalories))
      );

      if (user?.id) {
        const today = new Date().toISOString().split('T')[0];
        const profileId = await getProfileId();
        console.log('[addCalories] Updating calories for profile:', profileId, 'date:', today, 'consumed:', newCalories.consumed, 'goal:', newCalories.goal);

        // Upsert calorie tracking entry
        const { error: upsertError } = await safeDbOperation(async (profileId) =>
          supabase
            .from('calorie_tracking')
            .upsert({
              profile_id: profileId,
              date: today,
              consumed: newCalories.consumed,
              goal: newCalories.goal,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'profile_id,date'
            })
        );

        if (upsertError) {
          console.error('Error upserting calorie tracking:', upsertError);
          return;
        }

        // Fetch latest data from Supabase to ensure consistency
        const { data: latestData, error: latestError } = await safeDbOperation(async (profileId) =>
          supabase
            .from('calorie_tracking')
            .select('*')
            .eq('profile_id', profileId)
            .eq('date', today)
            .single()
        );

        if (!latestError && latestData) {
          safeSetState(setCalories, {
            consumed: latestData.consumed,
            goal: latestData.goal
          });
          console.log('[addCalories] Updated calories from Supabase:', latestData);
        }
      }
    } catch (error) {
      console.error('Error adding calories:', error);
    }
  };

  const addWater = async (amount) => {
    try {
      const newWater = { ...water, consumed: water.consumed + amount };
      safeSetState(setWater, newWater);
      await safeAsyncStorage(() => 
        AsyncStorage.setItem('water', JSON.stringify(newWater))
      );

      if (user?.id) {
        const today = new Date().toISOString().split('T')[0];
        const profileId = await getProfileId();
        console.log('[addWater] profile_id:', profileId, 'date:', today, 'amount_ml:', newWater.consumed, 'goal:', newWater.goal);

        // Upsert water tracking entry
        const { error: upsertError } = await safeDbOperation(async (profileId) =>
          supabase
            .from('water_tracking')
            .upsert({
              profile_id: profileId,
              date: today,
              glasses: Math.floor(newWater.consumed / 250), // Convert ml to glasses
              goal: newWater.goal,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'profile_id,date'
            })
        );

        if (upsertError) {
          console.error('Error upserting water tracking:', upsertError);
          return;
        }

        // Fetch latest water data from Supabase
        const { data: waterData, error: waterError } = await safeDbOperation(async (profileId) =>
          supabase
            .from('water_tracking')
            .select('*')
            .eq('profile_id', profileId)
            .eq('date', today)
            .single()
        );

        if (!waterError && waterData) {
          safeSetState(setWater, {
            consumed: waterData.glasses * 250, // Convert glasses to ml
            goal: waterData.goal
          });
          console.log('[addWater] Updated water from Supabase:', waterData);
        }
      }
    } catch (error) {
      console.error('Error adding water:', error);
    }
  };

  const addProtein = async (amount) => {
    try {
      const newProtein = { ...protein, consumed: protein.consumed + amount };
      
      // Update local state immediately for responsive UI
      safeSetState(setProtein, newProtein);
      
      // Save to AsyncStorage for offline persistence
      await safeAsyncStorage(() => 
        AsyncStorage.setItem('protein', JSON.stringify(newProtein))
      );

      if (user?.id) {
        const today = new Date().toISOString().split('T')[0];
        const profileId = await getProfileId();
        console.log('[addProtein] Updating protein for profile:', profileId, 'date:', today, 'consumed:', newProtein.consumed, 'goal:', newProtein.goal);

        // Upsert protein tracking entry in daily_macronutrients
        const { error: upsertError } = await safeDbOperation(async (profileId) =>
          supabase
            .from('daily_macronutrients')
            .upsert({
              user_id: profileId,
              date: today,
              protein: newProtein.consumed,
              carbs: 0, // Keep existing values or set to 0
              fat: 0,
              fiber: 0,
              sugar: 0,
              sodium: 0,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,date'
            })
        );

        if (upsertError) {
          console.error('Error upserting protein tracking:', upsertError);
          return;
        }

        // Fetch latest data from Supabase to ensure consistency
        const { data: latestData, error: latestError } = await safeDbOperation(async (profileId) =>
          supabase
            .from('daily_macronutrients')
            .select('*')
            .eq('user_id', profileId)
            .eq('date', today)
            .single()
        );

        if (!latestError && latestData) {
          safeSetState(setProtein, {
            consumed: latestData.protein || 0,
            goal: newProtein.goal
          });
          console.log('[addProtein] Updated protein from Supabase:', latestData);
        }
      }
    } catch (error) {
      console.error('Error adding protein:', error);
    }
  };

  const updateGoal = async (type, amount) => {
    try {
      // Validate inputs
      if (!type || (type !== 'calories' && type !== 'water' && type !== 'protein')) {
        throw new Error('Invalid goal type');
      }
      if (typeof amount !== 'number' || amount <= 0) {
        throw new Error('Invalid goal amount');
      }

      // Update state and AsyncStorage
      if (type === 'calories') {
        const newCalories = { ...calories, goal: amount };
        setCalories(newCalories);
        await safeAsyncStorage(() => 
          AsyncStorage.setItem('calories', JSON.stringify(newCalories))
        );
        console.log('[updateGoal] Updated calories goal:', amount);
      } else if (type === 'water') {
        const newWater = { ...water, goal: amount };
        setWater(newWater);
        await safeAsyncStorage(() => 
          AsyncStorage.setItem('water', JSON.stringify(newWater))
        );
        console.log('[updateGoal] Updated water goal:', amount);
      } else if (type === 'protein') {
        const newProtein = { ...protein, goal: amount };
        setProtein(newProtein);
        await safeAsyncStorage(() => 
          AsyncStorage.setItem('protein', JSON.stringify(newProtein))
        );
        console.log('[updateGoal] Updated protein goal:', amount);
      }
      return true; // Return success
    } catch (error) {
      console.error('[updateGoal] Error:', error);
      // Revert the state if there's an error
      if (type === 'calories') {
        setCalories(calories);
        await safeAsyncStorage(() => 
          AsyncStorage.setItem('calories', JSON.stringify(calories))
        );
      } else if (type === 'water') {
        setWater(water);
        await safeAsyncStorage(() => 
          AsyncStorage.setItem('water', JSON.stringify(water))
        );
      } else if (type === 'protein') {
        setProtein(protein);
        await safeAsyncStorage(() => 
          AsyncStorage.setItem('protein', JSON.stringify(protein))
        );
      }
      throw new Error(`Failed to update ${type} goal: ${error.message}`);
    }
  };

  const updateMood = async (newMood) => {
    try {
      setMood(newMood);
      await AsyncStorage.setItem('mood', newMood);

      // Update mental completion in stats
      await updateStats({
        today_mental_completed: true
      });

    } catch (error) {
      console.error('Error updating mood:', error);
    }
  };

  const updateStats = async (updates) => {
    try {
      const profileId = await getProfileId();
      if (!profileId) {
        console.error('No profile ID found');
        return;
      }

      // First get current stats
      const { data: currentStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('profile_id', profileId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching current stats:', fetchError);
        return;
      }

      // Prepare updates
      const newStats = {
        profile_id: profileId,
        ...currentStats,
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Update in Supabase
      const { error: updateError } = await supabase
        .from('user_stats')
        .upsert(newStats, {
          onConflict: 'profile_id'
        });

      if (updateError) {
        console.error('Error updating stats:', updateError);
        return;
      }

      // Update local state
      setStats(prev => ({
        ...prev,
        ...updates
      }));

      // Also update AsyncStorage
      const currentLocalStats = await AsyncStorage.getItem('stats');
      const localStats = currentLocalStats ? JSON.parse(currentLocalStats) : {};
      const newLocalStats = {
        ...localStats,
        ...updates
      };
      await AsyncStorage.setItem('stats', JSON.stringify(newLocalStats));

    } catch (error) {
      console.error('Error in updateStats:', error);
    }
  };

  // Helper to get today's date string
  const getTodayString = () => new Date().toISOString().split('T')[0];

  // Fetch streak from Supabase and update state
  const fetchStreak = async () => {
    const profileId = await getProfileId();
    if (!profileId) return;
    const { data: streakData, error } = await supabase
      .from('betteru_streaks')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (!error && streakData) {
      safeSetState(setStats, prev => ({ ...prev, streak: streakData.current_streak || 0 }));
      console.log('[fetchStreak] Updated streak from Supabase:', streakData);
    } else if (error) {
      console.error('[fetchStreak] Error fetching streak:', error);
    }
  };

  // Call fetchStreak on mount and when profile changes
  useEffect(() => {
    if (profile?.profile_id) {
      fetchStreak();
    }
  }, [profile?.profile_id]);

  // Robust incrementStat for streak
  const incrementStat = async (statName, amount = 1) => {
    try {
      const currentStats = await AsyncStorage.getItem('stats');
      const stats = currentStats ? JSON.parse(currentStats) : {
        workouts: 0,
        minutes: 0,
        calories: 0,
        water: 0,
        today_workout_completed: false
      };

      stats[statName] = (stats[statName] || 0) + amount;
      await AsyncStorage.setItem('stats', JSON.stringify(stats));
      setStats(stats);
    } catch (error) {
      console.error('Error incrementing stat:', error);
    }
  };

  const finishWorkout = async (workoutId, duration) => {
    try {
      const userId = await getProfileId();
      if (!userId) {
        console.log('[finishWorkout] No user ID found');
        return { success: false, error: 'No user ID found' };
      }

      // Update workout_logs
      const { data: logData, error: logError } = await supabase
        .from('user_workout_logs')
        .update({
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', workoutId)
        .select()
        .single();

      if (logError) {
        console.error('[finishWorkout] Error updating workout log:', logError);
        throw logError;
      }

      // Update stats in Supabase
      await updateStats({
        workouts: (stats.workouts || 0) + 1,
        minutes: (stats.minutes || 0) + Math.floor(duration / 60),
        today_workout_completed: true
      });

      return { success: true, data: { log: logData } };
    } catch (error) {
      console.error('[finishWorkout] Error:', error);
      return { success: false, error };
    }
  };

  return (
    <TrackingContext.Provider value={{
      calories,
      water,
      protein,
      mood,
      stats,
      addCalories,
      addWater,
      addProtein,
      updateMood,
      updateGoal,
      updateStats,
      incrementStat,
      setMood,
      setCalories,
      setWater,
      setProtein,
      setStats
    }}>
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
};

export const forceDailyReset = async (profile, calories, water, protein, setCalories, setWater, setProtein, setStats) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    const profileId = profile?.profile_id;
    console.log('[forceDailyReset] Forcing daily reset for profile:', profileId);

    // Reset completion status in user_stats
    if (profileId) {
      const { error: statsError } = await supabase
        .from('user_stats')
        .update({
          today_workout_completed: false,
          today_mental_completed: false,
          daily_workouts_generated: 0,
          last_reset_date: todayStr,
          updated_at: new Date().toISOString()
        })
        .eq('profile_id', profileId);

      if (statsError) {
        console.error('[forceDailyReset] Error resetting completion status:', statsError);
      }
    }

    // Reset calories in Supabase
    if (profileId) {
      const { error: calorieError } = await supabase
        .from('calorie_tracking')
        .upsert({
          profile_id: profileId,
          date: todayStr.split('T')[0],
          consumed: 0,
          goal: calories?.goal || 2000,
          updated_at: new Date().toISOString()
        }, { onConflict: 'profile_id,date' });

      if (calorieError) {
        console.error('[forceDailyReset] Error resetting calories:', calorieError);
      }
    }

    // Reset water in Supabase
    if (profileId) {
      const { error: waterError } = await supabase
        .from('water_tracking')
        .upsert({
          profile_id: profileId,
          date: todayStr.split('T')[0],
          glasses: 0,
          goal: water?.goal || 8,
          updated_at: new Date().toISOString()
        }, { onConflict: 'profile_id,date' });

      if (waterError) {
        console.error('[forceDailyReset] Error resetting water:', waterError);
      }
    }

    // Reset daily macronutrients in Supabase
    if (profileId) {
      const { error: macroError } = await supabase
        .from('daily_macronutrients')
        .delete()
        .eq('user_id', profileId);

      if (macroError) {
        console.error('[forceDailyReset] Error resetting daily macronutrients:', macroError);
      } else {
        console.log('[forceDailyReset] Successfully reset daily macronutrients');
      }
    }

    // Save reset date
    await AsyncStorage.setItem('lastResetDate', todayStr);

    // Reset calories, water, and protein in AsyncStorage
    const resetCalories = { consumed: 0, goal: calories?.goal || 2000 };
    const resetWater = { consumed: 0, goal: water?.goal || 2.0 };
    const resetProtein = { consumed: 0, goal: protein?.goal || 150 };
    
    await AsyncStorage.setItem('calories', JSON.stringify(resetCalories));
    await AsyncStorage.setItem('water', JSON.stringify(resetWater));
    await AsyncStorage.setItem('protein', JSON.stringify(resetProtein));
    
    console.log('[forceDailyReset] Reset calories in AsyncStorage:', resetCalories);
    console.log('[forceDailyReset] Reset water in AsyncStorage:', resetWater);
    console.log('[forceDailyReset] Reset protein in AsyncStorage:', resetProtein);

    // Update local state
    if (typeof setCalories === 'function') setCalories(resetCalories);
    if (typeof setWater === 'function') setWater(resetWater);
    if (typeof setProtein === 'function') setProtein(resetProtein);
    if (typeof setStats === 'function') setStats(prev => ({
      ...prev,
      today_workout_completed: false,
      today_mental_completed: false
    }));

    // Reload from Supabase and AsyncStorage to ensure UI is up to date
    if (profileId) {
      await reloadTrackingData(profileId, setCalories, setWater, setProtein);
    }

    console.log('[forceDailyReset] Local state and AsyncStorage reset complete');
  } catch (error) {
    console.error('[forceDailyReset] Error:', error);
  }
};

const reloadTrackingData = async (profileId, setCalories, setWater, setProtein) => {
  try {
    // Reload calories from Supabase
    const today = new Date().toISOString().split('T')[0];
    const { data: calorieData } = await supabase
      .from('calorie_tracking')
      .select('*')
      .eq('profile_id', profileId)
      .eq('date', today)
      .maybeSingle();
    if (calorieData) {
      setCalories({ consumed: calorieData.consumed || 0, goal: calorieData.goal || 2000 });
    }
    // Reload water from Supabase
    const { data: waterData } = await supabase
      .from('water_tracking')
      .select('*')
      .eq('profile_id', profileId)
      .eq('date', today)
      .maybeSingle();
    if (waterData) {
      setWater({ consumed: (waterData.glasses || 0) * 250, goal: waterData.goal || 2.0 });
    }
    // Reload from AsyncStorage as fallback
    const savedCalories = await AsyncStorage.getItem('calories');
    if (savedCalories) {
      const parsed = JSON.parse(savedCalories);
      setCalories(parsed);
    }
    const savedWater = await AsyncStorage.getItem('water');
    if (savedWater) {
      const parsed = JSON.parse(savedWater);
      setWater(parsed);
    }
    const savedProtein = await AsyncStorage.getItem('protein');
    if (savedProtein) {
      const parsed = JSON.parse(savedProtein);
      setProtein(parsed);
    }
  } catch (error) {
    console.error('[reloadTrackingData] Error:', error);
  }
};

export { reloadTrackingData }; 