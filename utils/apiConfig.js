import AsyncStorage from "@react-native-async-storage/async-storage"

// Placeholder for API key - should be set via environment variables
const FALLBACK_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "YOUR_API_KEY_HERE";

// Function to securely get the OpenAI API key
export const getOpenAIApiKey = async () => {
  try {
    // Try to get from environment variables first
    const envKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (envKey && envKey !== "YOUR_API_KEY_HERE") {
      console.log("[API Config] Using environment API key");
      await AsyncStorage.setItem("openai_api_key", envKey);
      return envKey;
    }
    
    // Try to get from AsyncStorage
    const storedKey = await AsyncStorage.getItem("openai_api_key");
    if (storedKey && storedKey !== "YOUR_API_KEY_HERE") {
      console.log("[API Config] Using stored API key");
      return storedKey;
    }
    
    console.log("[API Config] No valid API key found");
    return null;
  } catch (error) {
    console.error("Error getting API key:", error);
    return null;
  }
};

// Function to test API key availability
export const testApiKeyAvailability = async () => {
  console.log("=== API KEY AVAILABILITY TEST ===");
  
  const key = await getOpenAIApiKey();
  console.log("[Test] API key result:", key ? "Available" : "Not available");
  
  return key;
};

// Function to ensure API key is always available
export const ensureApiKeyAvailable = async () => {
  try {
    const key = await getOpenAIApiKey();
    if (!key) {
      console.log("[API Config] No API key available - please set EXPO_PUBLIC_OPENAI_API_KEY");
      return null;
    }
    return key;
  } catch (error) {
    console.error("[API Config] Error ensuring API key availability:", error);
    return null;
  }
};


