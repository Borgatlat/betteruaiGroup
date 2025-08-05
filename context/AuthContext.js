"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { supabase } from "../lib/supabase"
import AsyncStorage from "@react-native-async-storage/async-storage"

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false)

  // PROFILE FETCH REMOVED: Commented out all profile fetching and logging
  /*
  // All code that fetches or logs profile data is now commented out.
  */

  // Update the fetchProfile function to properly handle RLS
  const fetchProfile = async (userId) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist yet, this is expected during onboarding
          return null;
        }
        throw error;
      }

      return profile;
    } catch (error) {
      console.error('[AuthContext] Error fetching profile:', error);
      return null;
    }
  };

  // Add a function to create an initial profile
  const createInitialProfile = async (userId) => {
    // PROFILE FETCH REMOVED: Commented out all profile fetching and logging
    /*
    try {
      if (!userId) return

      const user = await supabase.auth.getUser()
      const email = user?.data?.user?.email

      const initialProfile = {
        profile_id: userId,
        full_name: email ? email.split("@")[0] : "New User",
        email: email,
        training_level: "intermediate",
      }

      const { data, error } = await supabase.from("profiles").insert([initialProfile]).select()

      if (error) {
        console.error("AuthContext: Error creating initial profile:", error)
      } else {
        console.log("AuthContext: Initial profile created:", data)
        setProfile(data[0])
      }
    } catch (error) {
      console.error("AuthContext: Error in createInitialProfile:", error)
    }
    */
  }

  // Update the auth state change handler
  useEffect(() => {
    let mounted = true;
    let subscription = null;

    const initializeAuth = async () => {
      try {
        // Get initial session
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted) {
              setSession(session);
              setUser(session?.user ?? null);
              if (session?.user?.id) {
            const profile = await fetchProfile(session.user.id);
              if (mounted) {
              setProfile(profile);
              }
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error("AuthContext: Error in initializeAuth:", error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      try {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user?.id) {
          const profile = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(profile);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("AuthContext: Error handling auth state change:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    });

    subscription = authSubscription;

    return () => {
      mounted = false;
      if (subscription) {
      subscription.unsubscribe();
      }
    };
  }, []); // Remove fetchProfile from dependencies

  // Update the signUp function to better handle the auth state:

  const signUp = async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        }
      });

      if (error) {
        console.error("Supabase signup error:", error);
        return { error, user: null };
      }

      if (data?.user) {
        console.log("User created in Supabase:", data.user.id);

        // Set the user state immediately to trigger auth state change
        setUser(data.user);

        // Create onboarding data with full_name from auth metadata
        const { error: onboardingError } = await supabase
          .from("onboarding_data")
          .upsert({
            id: data.user.id,
            full_name: fullName,
            email: email,
          });

        if (onboardingError) {
          console.error("Error creating onboarding data:", onboardingError);
          return { error: onboardingError, user: data.user };
        }

        console.log("Onboarding data created successfully");

        // Fetch the profile to update the profile state
        fetchProfile(data.user.id);

        return { error: null, user: data.user };
      }

      return { error: new Error("No user data returned from signup"), user: null };
    } catch (error) {
      console.error("Signup error:", error);
      return { error, user: null };
    }
  };

  // Improve error handling in the AuthContext
  // Add this function to the AuthContext:

  const handleAuthError = (error, operation) => {
    console.error(`Error during ${operation}:`, error)
    if (error.message) {
      console.error(`Error message: ${error.message}`)
    }
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`)
    }
    return { error }
  }

  // Then update the signIn function to use it:
  const signIn = async (email, password) => {
    try {
      console.log('Attempting to sign in with email:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }

      console.log('Sign in successful, user:', data?.user?.id);
      return { error: null, data };
    } catch (error) {
      console.error('Unexpected error during sign in:', error);
      return { error };
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  // Update the updateProfile function to use id instead of user_id
  const updateProfile = async (updates) => {
    if (!user) return { error: "No user logged in" }

    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (!error) {
        // Update local profile state
        setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      }

      return { error };
    } catch (error) {
      return { error };
    }
  }

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "betteru://reset-password",
      })
      return { error }
    } catch (error) {
      return { error }
    }
  }

  const updatePassword = async (password) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })
      return { error }
    } catch (error) {
      return { error }
    }
  }

  // Update the refetchProfile method to use the same function
  const refetchProfile = useCallback(
    (userId) => {
      if (!userId && user) userId = user.id
      if (userId) {
        fetchProfile(userId)
      }
    },
    [user, fetchProfile],
  )

  const clearUserData = async () => {
    try {
      const { error } = await supabase
        .from('onboarding_data')
        .delete()
        .eq('profile_id', session?.user?.id);

      if (error) throw error;

      // Clear AsyncStorage preferences
      await AsyncStorage.clear();
      
      // Sign out after clearing data
      await signOut();
    } catch (error) {
      console.error('Error clearing user data:', error);
      throw error;
    }
  };

  const checkOnboardingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsOnboardingComplete(false);
        return;
      }

      // First check if profile exists
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id);

      if (profileError) {
        console.error('Error checking profile:', profileError);
        setIsOnboardingComplete(false);
        return;
      }

      // If no profile exists, treat as not onboarded
      if (!profiles || profiles.length === 0) {
        console.log('No profile found, treating as not onboarded');
        setIsOnboardingComplete(false);
        return;
      }

      // If we have a profile, check its onboarding status
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking onboarding status:', error);
        setIsOnboardingComplete(false);
        return;
      }

      setIsOnboardingComplete(!!profile.onboarding_completed);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboardingComplete(false);
    }
  };

  // Include refetchProfile in the value object
  const value = {
    user,
    profile,
    session,
    isLoading,
    isOnboardingComplete,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    refetchProfile,
    clearUserData,
    checkOnboardingStatus,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

