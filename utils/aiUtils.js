import { getOpenAIApiKey, ensureApiKeyAvailable } from "./apiConfig"
import { useUser } from "../context/UserContext"
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Generates an AI response using the OpenAI API
 * @param {string} userMessage - The user's message to generate a response for
 * @param {object} userData - The user's full data (profile, stats, history, PRs, goals, mood, etc)
 * @param {string} systemPrompt - The system prompt for the AI
 * @returns {Promise<{success: boolean, response?: string, error?: string}>} - The result object
 */
export const generateAIResponse = async (userMessage, userData = {}, systemPrompt = '') => {
  console.warn('=== AI TRAINER MESSAGE SENT: generateAIResponse CALLED ===');
  console.warn('[AI] generateAIResponse called');
  console.log("[AI] Generating AI response for:", userMessage)

  try {
    // Fallback responses for development/demo
    const fallbackResponses = [
      "I understand you want to know about fitness. Let me help you with that!",
      "That's a great question about health and wellness. Here's what I think...",
      "I can help you with your fitness journey. Let's work on that together!",
      "Thanks for asking! Here's my suggestion for your workout routine...",
      "I'm here to support your fitness goals. Let's break this down..."
    ];

    // Get a random fallback response
    const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

    // Get the API key - always available from hardcoded source
    let key = await ensureApiKeyAvailable();
    console.log("[AI] API Key status: Always available (hardcoded)");

    // Get conversation history from AsyncStorage
    let conversationHistory = [];
    try {
      const storedConversations = await AsyncStorage.getItem('trainerConversations');
      if (storedConversations) {
        conversationHistory = JSON.parse(storedConversations);
      }
    } catch (error) {
      console.error("[AI] Error loading conversation history:", error);
    }

    // Format conversation history for context
    const conversationMessages = conversationHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.message
    }));

    // Compose a detailed context message with all user data
    const contextMessage = userData && Object.keys(userData).length > 0
      ? `Detailed User Profile Context (use this data to personalize responses):

User Name: ${userData.userName || 'User'}
Age: ${userData.age || 'Not specified'}
Gender: ${userData.gender || 'Not specified'}
Weight: ${userData.weight || 'Not specified'} ${userData.weight ? 'kg' : ''}
Height: ${userData.height || 'Not specified'} ${userData.height ? 'cm' : ''}
Training Level: ${userData.trainingLevel || 'Not specified'}
Fitness Goal: ${userData.goals || 'Not specified'}
Bio: ${userData.bio || 'Not specified'}
Current Mood: ${userData.mood || 'Not specified'}

Workout History: ${userData.allTimeWorkoutHistory ? userData.allTimeWorkoutHistory.length + ' sessions' : 'No data'}
Mental Session History: ${userData.allTimeMentalHistory ? userData.allTimeMentalHistory.length + ' sessions' : 'No data'}
Personal Records: ${userData.prs ? userData.prs.length + ' records' : 'No data'}

Full Profile Data: ${JSON.stringify(userData.profile, null, 2)}`
      : '';

    // Prepare the request payload
    const systemPrompt = `You are a personalized fitness and wellness AI coach. Your responses should be highly personalized, detailed, structured, and actionable. Follow these guidelines:

1. ALWAYS address the user by their name when appropriate
2. Start with a brief, empathetic introduction that acknowledges the user's question/concern
3. Break down your response into clear, numbered sections with descriptive headers
4. Use bullet points for specific recommendations or steps
5. Include specific numbers, ranges, and actionable advice tailored to their profile
6. Reference the user's specific data when relevant (age, weight, height, training level, goals, history, PRs, mood)
7. End with a motivating conclusion and next steps
8. Keep responses comprehensive but well-organized
9. Use markdown formatting for better readability
10. Make recommendations specific to their training level and fitness goals

Example structure:
- Brief intro acknowledging the question and using their name
- Main sections with numbered headers
- Bullet points for specific recommendations tailored to their profile
- Specific numbers and ranges appropriate for their level
- Actionable steps considering their current situation
- Motivating conclusion

IMPORTANT: Always personalize your responses based on the user's specific profile data, training level, and goals. Reference their actual data when discussing progress, making recommendations, or providing motivation.`;

    const payload = {
      model: "gpt-3.5-turbo",
      messages: [
        systemPrompt ? { role: "system", content: systemPrompt } : { role: "system", content: "You are an AI fitness trainer assistant. You provide helpful, encouraging, and accurate advice about workouts, nutrition, and fitness goals. Keep your responses concise and focused on fitness advice. Always maintain context from previous messages in the conversation." },
        contextMessage ? { role: "system", content: contextMessage } : null,
        ...conversationMessages,
        { role: "user", content: userMessage },
      ].filter(Boolean),
      max_tokens: 1000,
      temperature: 0.7,
    };
    console.log("[AI] OpenAI request payload:", JSON.stringify(payload, null, 2));

    // Create the request to OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    })

    console.log("[AI] OpenAI API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log("[AI] OpenAI API error:", errorText);
      return {
        success: false,
        error: `API request failed: ${response.status} - ${errorText}`
      }
    }

    const data = await response.json()
    console.log("[AI] OpenAI API raw response:", JSON.stringify(data, null, 2));
    if (!data.choices || !data.choices[0]?.message?.content) {
      console.log("[AI] Invalid API response format")
      return {
        success: false,
        error: "Invalid response format from AI service"
      }
    }

    return {
      success: true,
      response: data.choices[0].message.content
    }
  } catch (error) {
    console.error("[AI] Error in generateAIResponse:", error)
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    }
  }
};

/**
 * Generates a personalized workout using the OpenAI API
 * @param {object} userData - The user's profile data (training level, goals, etc)
 * @returns {Promise<{success: boolean, workout?: object, error?: string}>} - The result object
 */
export const generateWorkout = async (userData = {}) => {
  console.log("[AI] Generating workout for user:", userData);

  try {
    // Get the API key
    const key = await getOpenAIApiKey();
    if (!key) {
      console.log("[AI] No API key available for workout generation");
      return {
        success: false,
        error: "API key not available"
      };
    }

    // Create a system prompt for workout generation
    const systemPrompt = `You are an expert fitness trainer creating personalized workouts. 
    Create a workout based on the user's profile data and their specific request. 
    The workout should include:
    - A name
    - A list of 5-6 exercises
    - For each exercise: name, target muscles, instructions, and sets/reps
    - Format the response as a JSON object with this exact structure:
    {
      "name": "Workout Name",
      "exercises": [
        {
          "name": "Exercise Name",
          "target_muscles": "Target Muscles",
          "instructions": "Exercise Instructions",
          "sets": 3,
          "reps": "8-12"
        }
      ]
    }
    - Keep exercises appropriate for the user's training level
    - Focus on the user's fitness goals
    - Return ONLY the JSON object, no other text`;

    // Prepare the request payload
    const payload = {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a workout for this user profile: ${JSON.stringify(userData)}. The user specifically wants: ${userData.custom_prompt}` }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    };

    // Make the API call
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI] Workout generation failed:", errorText);
      return {
        success: false,
        error: "Failed to generate workout"
      };
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0]?.message?.content) {
      return {
        success: false,
        error: "Invalid response from AI"
      };
    }

    // Parse the workout data from the response
    try {
      const workoutData = JSON.parse(data.choices[0].message.content);
      return {
        success: true,
        workout: workoutData
      };
    } catch (parseError) {
      console.error("[AI] Failed to parse workout data:", parseError);
      return {
        success: false,
        error: "Failed to parse workout data"
      };
    }
  } catch (error) {
    console.error("[AI] Error in generateWorkout:", error);
    return {
      success: false,
      error: error.message
    };
  }
};
