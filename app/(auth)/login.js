"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { LogoImage } from "../../utils/imageUtils";
import { useRouter } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest, ResponseType } from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';

// Initialize WebBrowser for auth
WebBrowser.maybeCompleteAuthSession();

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get("window");
const isIphoneX = Platform.OS === "ios" && (height >= 812 || width >= 812);
const isExpoGo = Constants.appOwnership === 'expo';

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const router = useRouter();

  // Set up the auth request
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: 'com.enriqueortiz.service',
      redirectUri: 'https://auth.expo.io/@easbetteru/betterU_TestFlight_v7',
      responseType: 'code',
      scopes: ['name', 'email'],
      state: Math.random().toString(36).substring(2, 18),
      responseMode: 'fragment',
    },
    {
      authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
      tokenEndpoint: 'https://appleid.apple.com/auth/token',
    }
  );

  // Handle the auth response
  useEffect(() => {
    if (response?.type === 'success') {
      handleAppleSignInSuccess(response.params);
    }
  }, [response]);

  const handleAppleSignInSuccess = async (params) => {
    try {
      setIsLoading(true);
      setError("");
      console.log('Processing Apple Sign In response...');

      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: params.id_token,
      });

      if (error) {
        console.error('Supabase sign in error:', error);
        throw error;
      }

      console.log('Supabase sign in successful:', data);

      // Check onboarding status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Error checking onboarding status:', profileError);
        setError('Failed to check onboarding status');
        return;
      }

      if (!profile?.onboarding_completed) {
        router.replace('/(auth)/onboarding/welcome');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      console.error('Apple Sign In error:', error);
      setError('Failed to sign in with Apple');
      Alert.alert('Error', 'Failed to sign in with Apple. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setIsLoading(true);
      setError("");
      console.log('Starting Apple Sign In...');
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('Apple Sign In successful, processing credential...');
      
      // Sign in with Supabase using the identityToken
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        console.error('Supabase sign in error:', error);
        throw error;
      }

      console.log('Supabase sign in successful:', data);

      // Check onboarding status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Error checking onboarding status:', profileError);
        setError('Failed to check onboarding status');
        return;
      }

      if (!profile?.onboarding_completed) {
        router.replace('/(auth)/onboarding/welcome');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') {
        console.error('Apple Sign In error:', error);
        setError('Failed to sign in with Apple');
        Alert.alert('Error', 'Failed to sign in with Apple. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add connection check on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // First check if the URL is reachable
      const reachability = await supabase.isUrlReachable();
      if (!reachability.mainEndpoint || !reachability.authEndpoint) {
        const errorMessage = !reachability.authEndpoint
          ? 'Authentication service is not responding. Please try again in a few minutes.'
          : 'Unable to reach the server. Please check your internet connection.';
        
        setConnectionStatus({
          connected: false,
          error: errorMessage,
          details: reachability,
          timestamp: new Date().toISOString()
        });
        setError(errorMessage);
        return;
      }

      const status = await supabase.checkSupabaseStatus();
      setConnectionStatus(status);
      
      if (!status.connected) {
        let errorMessage = status.error;
        if (status.details) {
          console.log('Connection error details:', status.details);
          if (status.details.endpoints) {
            console.log('Endpoint status:', status.details.endpoints);
          }
        }
        if (status.responseTime) {
          console.log('Response time:', status.responseTime, 'ms');
        }
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setConnectionStatus({
        connected: false,
        error: 'Failed to check connection status',
        details: error.message,
        timestamp: new Date().toISOString()
      });
      setError('Unable to check server connection');
    }
  };

  const handleLogin = async () => {
    if (email === "" || password === "") {
      setError("Please fill in all fields");
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(`Login attempt ${retryCount + 1}/${maxRetries}`);

        // Check connection before attempting login
        try {
          const reachability = await supabase.isUrlReachable();
          if (!reachability.mainEndpoint || !reachability.authEndpoint) {
            const errorMessage = !reachability.authEndpoint
              ? 'Authentication service is not responding. Please try again in a few minutes.'
              : 'Unable to reach the server. Please check your internet connection.';
            throw new Error(errorMessage);
          }

          const status = await supabase.checkSupabaseStatus();
          if (!status.connected) {
            throw new Error(status.error || 'Connection error');
          }
        } catch (error) {
          console.error('Connection check failed:', error);
          if (retryCount < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
            console.log(`Connection check failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
            continue;
          }
          throw error;
        }

        const { data, error } = await Promise.race([
          supabase.auth.signInWithPassword({
        email,
        password,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Login timeout')), 15000)
          )
        ]);

      if (error) {
          console.error('Login error:', error);
          
          if (error.message?.includes('Invalid login credentials')) {
            setError('Invalid email or password');
            Alert.alert('Error', 'Invalid email or password');
            break;
          }
          
          if (error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
            if (retryCount < maxRetries - 1) {
              const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
              console.log(`Network error, retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              retryCount++;
              continue;
            }
            setError('Network connection error. Please check your internet connection.');
            Alert.alert(
              'Connection Error',
              'Unable to connect to server. Please check your internet connection and try again.'
            );
            break;
          }

        setError(error.message);
          Alert.alert('Error', error.message);
          break;
        }

        if (!data?.user) {
          console.error('No user data returned');
          setError('Login failed. Please try again.');
          Alert.alert('Error', 'Login failed. Please try again.');
          break;
        }

        // Check onboarding status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error checking onboarding status:', profileError);
          setError('Failed to check onboarding status');
          break;
        }

        console.log('Login successful, checking onboarding status...');
        if (!profile?.onboarding_completed) {
          router.replace('/(auth)/onboarding/welcome');
        } else {
        router.replace('/(tabs)/home');
        }
        return;

      } catch (error) {
        console.error('Unexpected error during login:', error);
        
        if (error.message === 'Login timeout') {
          setError('Login request timed out. Please try again.');
          Alert.alert('Error', 'Login request timed out. Please try again.');
          break;
        }
        
        if (retryCount < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
      } else {
          setError('Connection error. Please check your internet and try again.');
          Alert.alert(
            'Connection Error',
            'Unable to connect to the server. Please check your internet connection and try again.'
          );
          break;
        }
      }
    }

    setIsLoading(false);
  };

  // Native Apple login for standalone/dev builds
  const handleNativeAppleSignIn = async () => {
    try {
      setIsLoading(true);
      setError("");
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      // Sign in with Supabase using the identityToken
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
      // Check onboarding status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', data.user.id)
        .single();
      if (profileError) {
        setError('Failed to check onboarding status');
        return;
      }
      if (!profile?.onboarding_completed) {
        router.replace('/(auth)/onboarding/welcome');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') {
        setError('Failed to sign in with Apple');
        Alert.alert('Error', 'Failed to sign in with Apple. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.logoContainer}>
            <LogoImage size={120} style={styles.logo} />
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            {connectionStatus && !connectionStatus.connected && (
              <View style={styles.connectionError}>
                <Ionicons name="warning-outline" size={20} color="#FF6B6B" />
                <Text style={styles.connectionErrorText}>
                  Connection issues detected. Please check your internet connection.
                </Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={22} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={22} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity 
                style={styles.passwordToggle} 
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#888" />
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity 
              style={styles.forgotPassword} 
              onPress={() => router.push("/(auth)/reset-password")}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={handleLogin} 
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="black" />
                  <Text style={styles.loadingText}>Signing in...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Apple Sign In Button - Temporarily Hidden */}
            {/* 
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={10}
                style={[styles.appleButton, { height: 50, marginBottom: 16 }]}
                onPress={handleAppleSignIn}
                disabled={isLoading}
              />
            )}
            */}

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => router.push("/signup")} disabled={isLoading}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "black",
    paddingTop: Platform.OS === "ios" ? (isIphoneX ? 50 : 20) : 0,
  },
  container: {
    flexGrow: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: "center",
  },
  logo: {
    // No additional styling needed as LogoImage component handles the circular shape
  },
  formContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    padding: 25,
    width: "90%",
    maxWidth: 400,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#B3B3B3",
    marginBottom: 30,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  inputIcon: {
    marginHorizontal: 15,
  },
  input: {
    flex: 1,
    height: 50,
    color: "white",
    paddingRight: 15,
  },
  passwordToggle: {
    padding: 15,
  },
  errorText: {
    color: "#FF6B6B",
    marginBottom: 15,
    textAlign: "center",
  },
  forgotPassword: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: "cyan",
    fontSize: 14,
  },
  button: {
    backgroundColor: "cyan",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  signupText: {
    color: "#B3B3B3",
    fontSize: 14,
    marginRight: 5,
  },
  signupLink: {
    color: "cyan",
    fontSize: 14,
    fontWeight: "bold",
  },
  connectionError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
  },
  connectionErrorText: {
    color: '#FF6B6B',
    marginLeft: 10,
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'black',
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: '#B3B3B3',
    marginHorizontal: 10,
    fontSize: 14,
  },
  appleButton: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  appleIcon: {
    marginRight: 10,
  },
  appleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen; 