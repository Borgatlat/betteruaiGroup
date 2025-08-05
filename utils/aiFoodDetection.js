import { Platform } from 'react-native';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';
import { checkUsageLimit, incrementUsage } from './usageTracker';
import { ENHANCED_FOOD_DATABASE, findBestFoodMatch } from './enhancedFoodDatabase';

// Check network connectivity
const checkNetworkConnection = async () => {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    throw new Error('No internet connection. Please check your network and try again.');
  }
  return true;
};

// Enhanced food database imported from separate file
// Contains 200+ foods with accurate nutritional information

// Enhanced food matching algorithm imported from separate file
// Uses improved scoring system with synonyms and category-based matching

// Convert image to base64
const imageToBase64 = async (imageUri) => {
  try {
    // For React Native, we need to handle the URI differently
    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // For mobile platforms, we need to read the file differently
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error('Failed to process image. Please try again.');
  }
};

// Analyze food using OpenAI Vision API
export const analyzeFoodWithAI = async (imageUri) => {
  try {
    // Check network connectivity first
    await checkNetworkConnection();

    // Check usage limits
    const usageCheck = await checkUsageLimit();
    if (!usageCheck.allowed) {
      const dailyRemaining = usageCheck.daily.remaining;
      const hourlyRemaining = usageCheck.hourly.remaining;
      
      if (dailyRemaining <= 0) {
        throw new Error('Daily AI usage limit reached. Please try again tomorrow.');
      } else if (hourlyRemaining <= 0) {
        throw new Error('Hourly AI usage limit reached. Please wait an hour and try again.');
      } else {
        throw new Error('Usage limit reached. Please try again later.');
      }
    }

    // Validate API key
    const apiKey = getOpenAIKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please check your environment variables.');
    }

    // Validate image URI
    if (!imageUri) {
      throw new Error('No image provided for analysis.');
    }

    console.log('Starting AI food analysis...');
    const base64Image = await imageToBase64(imageUri);
    
    // Add timeout to the request
    const controller = new AbortController();
    const timeoutMs = parseInt(process.env.EXPO_PUBLIC_AI_TIMEOUT_MS) || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this food image and provide a detailed, specific description. Focus on:

1. **Main Food Items**: Identify the primary food items (e.g., "grilled chicken breast", "pepperoni pizza slice", "chocolate chip cookie")
2. **Ingredients**: List visible ingredients (e.g., "cheese, tomato sauce, pepperoni" for pizza)
3. **Preparation Method**: Describe how it's cooked (grilled, fried, baked, steamed, raw, etc.)
4. **Portion Size**: Estimate the serving size (slice, piece, cup, bowl, etc.)
5. **Visual Details**: Color, texture, presentation (e.g., "golden brown", "crispy", "melted cheese")
6. **Multiple Items**: If you see multiple foods, describe each one separately

Be as specific as possible. Instead of "meat", say "beef steak" or "chicken breast". Instead of "bread", say "toast" or "sandwich bread". Instead of "drink", say "coffee" or "orange juice".

Format your response as a clear, detailed description that could be used to identify the exact food item.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', response.status, errorData);
      
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI configuration.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (response.status === 400) {
        throw new Error('Invalid request. The image may be too large or in an unsupported format.');
      } else {
        throw new Error(`API error: ${response.status}. Please try again.`);
      }
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from AI service.');
    }

    const description = data.choices[0].message.content;
    console.log('AI Description:', description);
    
    // Find the best matching food using enhanced algorithm
    const detectedFood = findBestFoodMatch(description);
    
    if (!detectedFood) {
      // Try to estimate calories from description
      const estimatedFood = estimateCaloriesFromDescription(description);
      const result = {
        name: 'Unknown Food (Estimated)',
        calories: estimatedFood.calories,
        protein: estimatedFood.protein,
        carbs: estimatedFood.carbs,
        fat: estimatedFood.fat,
        fiber: estimatedFood.fiber,
        confidence: 0.6,
        description: description
      };
      
      // Increment usage only on successful analysis
      await incrementUsage();
      
      return result;
    }

    // Calculate confidence based on description quality and match accuracy
    const confidence = Math.min(0.95, 0.7 + (description.length / 1000) * 0.25);
    
    const result = {
      name: detectedFood.name,
      calories: detectedFood.calories,
      protein: detectedFood.protein,
      carbs: detectedFood.carbs,
      fat: detectedFood.fat,
      fiber: detectedFood.fiber,
      confidence: confidence,
      description: description
    };
    
    // Increment usage only on successful analysis
    await incrementUsage();
    
    return result;
    
  } catch (error) {
    console.error('Error analyzing food with AI:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    
    throw error;
  }
};

// Enhanced calorie estimation for unknown foods based on description
export const estimateCaloriesFromDescription = (description) => {
  const words = description.toLowerCase();
  
  // More detailed calorie estimation based on food categories and preparation methods
  if (words.includes('salad') || words.includes('vegetable') || words.includes('lettuce')) {
    return { calories: 45, protein: 2, carbs: 8, fat: 0.5, fiber: 3 };
  } else if (words.includes('grilled chicken') || words.includes('chicken breast')) {
    return { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 };
  } else if (words.includes('fried chicken') || words.includes('chicken nugget')) {
    return { calories: 297, protein: 14, carbs: 18, fat: 19, fiber: 1 };
  } else if (words.includes('beef') || words.includes('steak') || words.includes('hamburger')) {
    return { calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0 };
  } else if (words.includes('salmon') || words.includes('fish')) {
    return { calories: 208, protein: 25, carbs: 0, fat: 12, fiber: 0 };
  } else if (words.includes('pasta') || words.includes('noodle') || words.includes('spaghetti')) {
    return { calories: 200, protein: 7, carbs: 40, fat: 1, fiber: 2 };
  } else if (words.includes('rice')) {
    return { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 };
  } else if (words.includes('bread') || words.includes('toast') || words.includes('sandwich')) {
    return { calories: 80, protein: 3, carbs: 15, fat: 1, fiber: 1 };
  } else if (words.includes('pizza') || words.includes('pizza slice')) {
    return { calories: 285, protein: 12, carbs: 33, fat: 12, fiber: 2.5 };
  } else if (words.includes('burger') || words.includes('hamburger')) {
    return { calories: 350, protein: 20, carbs: 30, fat: 15, fiber: 2 };
  } else if (words.includes('french fries') || words.includes('fries')) {
    return { calories: 365, protein: 4, carbs: 63, fat: 17, fiber: 4 };
  } else if (words.includes('apple') || words.includes('banana') || words.includes('orange')) {
    return { calories: 80, protein: 1, carbs: 20, fat: 0.3, fiber: 3 };
  } else if (words.includes('ice cream')) {
    return { calories: 137, protein: 2.3, carbs: 16, fat: 7.2, fiber: 0 };
  } else if (words.includes('cake') || words.includes('dessert')) {
    return { calories: 257, protein: 3.4, carbs: 38, fat: 9.3, fiber: 0.8 };
  } else if (words.includes('cookie') || words.includes('brownie')) {
    return { calories: 132, protein: 1.8, carbs: 18, fat: 6.3, fiber: 0.8 };
  } else if (words.includes('coffee') || words.includes('latte') || words.includes('espresso')) {
    return { calories: 135, protein: 9, carbs: 10, fat: 7, fiber: 0 };
  } else if (words.includes('soda') || words.includes('pop')) {
    return { calories: 150, protein: 0, carbs: 39, fat: 0, fiber: 0 };
  } else if (words.includes('juice')) {
    return { calories: 111, protein: 0.5, carbs: 26, fat: 0.2, fiber: 0.5 };
  } else if (words.includes('milk')) {
    return { calories: 103, protein: 8, carbs: 12, fat: 2.4, fiber: 0 };
  } else if (words.includes('cheese')) {
    return { calories: 113, protein: 7, carbs: 0.4, fat: 9, fiber: 0 };
  } else if (words.includes('egg')) {
    return { calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0 };
  } else if (words.includes('chips') || words.includes('crisps')) {
    return { calories: 152, protein: 2, carbs: 15, fat: 10, fiber: 1 };
  } else if (words.includes('nuts') || words.includes('almond') || words.includes('cashew')) {
    return { calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3 };
  } else if (words.includes('chocolate')) {
    return { calories: 546, protein: 4.9, carbs: 61, fat: 31, fiber: 7 };
  } else {
    // Default estimation based on general food characteristics
    if (words.includes('fried') || words.includes('deep fried')) {
      return { calories: 300, protein: 15, carbs: 25, fat: 20, fiber: 2 };
    } else if (words.includes('grilled') || words.includes('baked')) {
      return { calories: 200, protein: 20, carbs: 15, fat: 8, fiber: 2 };
    } else if (words.includes('raw') || words.includes('fresh')) {
      return { calories: 100, protein: 5, carbs: 15, fat: 3, fiber: 3 };
    } else {
      return { calories: 150, protein: 5, carbs: 20, fat: 5, fiber: 2 };
    }
  }
};

// Get nutritional information for a specific food
export const getFoodNutrition = (foodName) => {
  const normalizedName = foodName.toLowerCase().trim();
  return ENHANCED_FOOD_DATABASE[normalizedName] || null;
};

// Get all available foods
export const getAllFoods = () => {
  return Object.keys(ENHANCED_FOOD_DATABASE);
};

// Get API key from environment variables
const getOpenAIKey = () => {
  // Try different ways to access the API key
  const apiKey = Constants.expoConfig?.extra?.openaiApiKey || 
         process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
         Constants.manifest?.extra?.openaiApiKey;
  
  // Log for debugging (remove in production)
  if (!apiKey) {
    console.warn('OpenAI API key not found in environment variables');
  }
  
  return apiKey;
}; 