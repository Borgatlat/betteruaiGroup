import { useRouter } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);
  const router = useRouter();

  console.log('Index.js loaded');

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(initialSession);
          
          // Check onboarding status if we have a session
          if (initialSession?.user?.id) {
            try {
              // First and only check - does the user have a profile?
              const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, onboarding_completed')
                .eq('id', initialSession.user.id);

              if (profileError) {
                console.error('Error checking profile:', profileError);
                setOnboardingCompleted(false);
                router.replace('/(auth)/onboarding/welcome');
                return;
              }

              // If no profile exists, go straight to onboarding
              if (!profiles || profiles.length === 0) {
                console.log('No profile found for user, redirecting to onboarding');
                setOnboardingCompleted(false);
                router.replace('/(auth)/onboarding/welcome');
                return;
              }

              // If we get here, we have a profile, so check its onboarding status
              const profile = profiles[0];
              setOnboardingCompleted(!!profile.onboarding_completed);
            } catch (err) {
              console.error('Error in profile check:', err);
              setOnboardingCompleted(false);
              router.replace('/(auth)/onboarding/welcome');
            }
          } else {
            setOnboardingCompleted(false); // No session, treat as not onboarded
          }
          
          setIsLoading(false);
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (mounted) {
            setSession(session);
            
            // Check onboarding status on auth change
            if (session?.user?.id) {
              try {
                // Check if the user has a profile
                const { data: profiles, error: profileError } = await supabase
                  .from('profiles')
                  .select('id')
                  .eq('id', session.user.id);

                if (profileError) {
                  console.error('Error checking profile:', profileError);
                  setOnboardingCompleted(false);
                  router.replace('/(auth)/onboarding/welcome');
                  return;
                }

                if (!profiles || profiles.length === 0) {
                  // No profile exists, go straight to onboarding
                  console.log('No profile found, redirecting to onboarding');
                  setOnboardingCompleted(false);
                  router.replace('/(auth)/onboarding/welcome');
                  return;
                }

                // Only check onboarding status if we found a profile
                const { data: profile, error } = await supabase
                  .from('profiles')
                  .select('onboarding_completed')
                  .eq('id', session.user.id)
                  .single();

                if (error) {
                  console.error('Error checking onboarding status:', error);
                  setOnboardingCompleted(false);
                  router.replace('/(auth)/onboarding/welcome');
                  return;
                }

                setOnboardingCompleted(!!profile.onboarding_completed);
              } catch (err) {
                console.error('Error in profile check:', err);
                setOnboardingCompleted(false);
                router.replace('/(auth)/onboarding/welcome');
              }
            } else {
              setOnboardingCompleted(false); // No session, treat as not onboarded
            }
            
            setIsLoading(false);
          }
        });

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();
  }, []);

  // Log the values for debugging
  console.log('session:', session, 'onboardingCompleted:', onboardingCompleted, 'isLoading:', isLoading);

  useEffect(() => {
    console.log('useEffect running', { isLoading, session, onboardingCompleted });
    if (!isLoading && session) {
      if (onboardingCompleted === false || onboardingCompleted === null) {
        console.log('Redirecting to onboarding');
        router.replace('/(auth)/onboarding/welcome');
      } else if (onboardingCompleted === true) {
        console.log('Redirecting to home');
        router.replace('/(tabs)/home');
      }
    } else if (!isLoading && !session) {
      console.log('Redirecting to login');
      router.replace('/(auth)/login');
    } else if (!isLoading) {
      console.log('Fallback: Redirecting to onboarding');
      router.replace('/(auth)/onboarding/welcome');
    }
  }, [isLoading, session, onboardingCompleted]);

  if (isLoading || onboardingCompleted === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00ffff" />
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  // Optionally, render nothing since navigation will happen in useEffect
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#00ffff',
    marginTop: 10,
  },
}); 