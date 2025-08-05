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
  Linking,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { LogoImage } from "../../utils/imageUtils";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");
const isIphoneX = Platform.OS === "ios" && (height >= 812 || width >= 812);

const SignupScreen = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();

  const handleSignup = async () => {
    if (fullName === "" || email === "" || password === "" || confirmPassword === "") {
      setError("Please fill in all fields");
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        console.error("Auth error:", error);
        setError(error.message);
        Alert.alert("Error", error.message);
        setIsLoading(false);
        return;
      }

      if (!data?.user) {
        setError("Failed to create user");
        Alert.alert("Error", "Failed to create user. Please try again.");
        setIsLoading(false);
        return;
      }

      // Show success modal instead of alert
      setUserEmail(email);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Unexpected error:", error);
      setError("An unexpected error occurred");
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
    setIsLoading(false);
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={22} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#888"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

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
              />
              <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={22} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#888"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#888" />
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="black" /> : <Text style={styles.buttonText}>Sign Up</Text>}
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.push("/login")}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>By signing up, you agree to our </Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://www.betteruai.com/terms-of-service')}>
                <Text style={styles.termsLink}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.termsText}> and </Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://www.betteruai.com/privacy-policy')}>
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Email Verification Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#00ffff" />
            </View>
            
            {/* Header */}
            <Text style={styles.successTitle}>Account Created Successfully!</Text>
            
            {/* Email Info */}
            <View style={styles.emailInfoContainer}>
              <Ionicons name="mail-outline" size={20} color="#00ffff" />
              <Text style={styles.emailText}>
                We've sent a verification email to:
              </Text>
              <Text style={styles.userEmail}>{userEmail}</Text>
            </View>
            
            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>Next Steps:</Text>
              <View style={styles.instructionItem}>
                <Ionicons name="1" size={16} color="#00ffff" />
                <Text style={styles.instructionText}>
                  Check your email inbox (and spam folder)
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="2" size={16} color="#00ffff" />
                <Text style={styles.instructionText}>
                  Click the verification link in the email
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="3" size={16} color="#00ffff" />
                <Text style={styles.instructionText}>
                  Return to the app and sign in
                </Text>
              </View>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.openEmailButton}
                onPress={() => {
                  // Try to open the user's email app
                  Linking.openURL('mailto:');
                }}
              >
                <Ionicons name="mail" size={18} color="#fff" />
                <Text style={styles.openEmailButtonText}>Open Email App</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.goToLoginButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.push("/(auth)/login");
                }}
              >
                <Text style={styles.goToLoginButtonText}>Go to Login</Text>
              </TouchableOpacity>
            </View>
            
            {/* Help Text */}
            <Text style={styles.helpText}>
              Didn't receive the email? Check your spam folder or contact support.
            </Text>
          </View>
        </View>
      </Modal>
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
  termsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  termsText: {
    color: '#888',
    fontSize: 12,
  },
  termsLink: {
    color: '#00ffff',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  emailInfoContainer: {
    alignItems: 'center',
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  emailText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00ffff',
    textAlign: 'center',
  },
  instructionsContainer: {
    width: '100%',
    marginBottom: 25,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 12,
    flex: 1,
  },
  modalButtonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  openEmailButton: {
    backgroundColor: '#00ffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  openEmailButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  goToLoginButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  goToLoginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default SignupScreen; 