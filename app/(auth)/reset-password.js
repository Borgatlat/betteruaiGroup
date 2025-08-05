"use client";

import { useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { LogoImage } from "../../utils/imageUtils";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");
const isIphoneX = Platform.OS === "ios" && (height >= 812 || width >= 812);

const ResetPasswordScreen = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address");
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      console.log("[ResetPassword] Attempting to send reset email to:", email);
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'betteru://reset-password',
      });

      if (error) {
        console.error("[ResetPassword] Reset password error:", error);
        setError(error.message);
        Alert.alert("Error", error.message);
        return;
      }

      console.log("[ResetPassword] Reset email sent successfully");
      
      Alert.alert(
        "Reset Email Sent",
        "Please check your email for a password reset link. If you don't see it, please check your spam folder. The email may take a few minutes to arrive.",
        [{ text: "OK", onPress: () => router.push("/(auth)/login") }]
      );
    } catch (error) {
      console.error("[ResetPassword] Unexpected error:", error);
      setError("An unexpected error occurred");
      Alert.alert(
        "Error", 
        "An unexpected error occurred. Please try again. If the problem persists, please contact support."
      );
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
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your email to receive a reset link</Text>

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

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={handleResetPassword} 
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="black" />
              ) : (
                <Text style={styles.buttonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Remember your password?</Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text style={styles.loginLink}>Sign In</Text>
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
  errorText: {
    color: "#FF6B6B",
    marginBottom: 15,
    textAlign: "center",
  },
  button: {
    backgroundColor: "cyan",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  loginText: {
    color: "#B3B3B3",
    fontSize: 14,
    marginRight: 5,
  },
  loginLink: {
    color: "cyan",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default ResetPasswordScreen; 