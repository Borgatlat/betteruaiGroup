// AI Meal Generation Utility
// This file handles AI meal generation using the same API key as other parts of the app

import { supabase } from '../lib/supabase';
import { getOpenAIApiKey, ensureApiKeyAvailable } from "./apiConfig";

export const generateAIMeal = async (preferences) => {
  try {
    console.log('Generating AI meal with preferences:', preferences);
    
    // Construct the AI prompt based on meal type
    const prompt = constructMealPrompt(preferences);
    
    // Get the API key using the same method as other AI features
    const key = await ensureApiKeyAvailable();
    
    // Call OpenAI API (using the same key as your existing AI features)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a nutrition expert and chef. Create detailed, healthy meals with exact nutrition information and cooking instructions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const mealData = JSON.parse(data.choices[0].message.content);
    
    console.log('AI generated meal:', mealData);
    return mealData;
    
  } catch (error) {
    console.error('Error generating AI meal:', error);
    throw error;
  }
};

const constructMealPrompt = (preferences) => {
  const { calorieRange, mealType, cuisineType, dietaryRestrictions } = preferences;
  
  const isSnack = mealType === 'snack';
  const calorieText = isSnack ? 
    `${calorieRange.min}-${calorieRange.max} calories (keep it light and simple)` :
    `${calorieRange.min}-${calorieRange.max} calories`;
  
  const instructionText = isSnack ?
    'For snacks: focus on simple ingredients, minimal prep time, and portable options. Keep instructions brief.' :
    'For meals: include detailed cooking instructions with clear steps.';
  
  return `Create a detailed ${mealType} with these requirements:
- Calories: ${calorieText}
- Meal type: ${mealType}
- Cuisine: ${cuisineType}
- Dietary restrictions: ${dietaryRestrictions.join(', ') || 'none'}

${instructionText}

Return ONLY a JSON object with this exact structure (no additional text):
{
  "name": "Meal Name",
  "description": "Brief description of the meal",
  "ingredients": [
    {"name": "ingredient name", "amount": 1, "unit": "medium"}
  ],
  "instructions": "${isSnack ? 'Simple preparation steps or "No cooking required" for raw snacks' : 'Step 1... Step 2...'}",
  "nutrition": {
    "calories": {"value": 450, "unit": "kcal"},
    "protein": {"value": 25, "unit": "g"},
    "carbs": {"value": 45, "unit": "g"},
    "fat": {"value": 20, "unit": "g"},
    "fiber": {"value": 8, "unit": "g"},
    "sugar": {"value": 12, "unit": "g"},
    "sodium": {"value": 500, "unit": "mg"}
  },
  "prep_time": ${isSnack ? '0-5' : '10-30'},
  "cook_time": ${isSnack ? '0' : '15-45'},
  "cuisine_type": "${cuisineType}",
  "meal_type": "${mealType}"
}`;
};

export const saveGeneratedMeal = async (mealData, userId) => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .insert({
        user_id: userId,
        name: mealData.name,
        description: mealData.description,
        ingredients: mealData.ingredients,
        instructions: mealData.instructions,
        nutrition: mealData.nutrition,
        calories: mealData.nutrition.calories.value,
        meal_type: mealData.meal_type,
        cuisine_type: mealData.cuisine_type,
        prep_time: mealData.prep_time,
        cook_time: mealData.cook_time,
        is_ai_generated: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving meal:', error);
      throw error;
    }

    console.log('Meal saved successfully:', data);
    return data;
    
  } catch (error) {
    console.error('Error saving generated meal:', error);
    throw error;
  }
};

export const consumeMeal = async (mealId, userId, servingSize = 1.0) => {
  try {
    // Get the meal to calculate actual nutrition
    const { data: meal, error: mealError } = await supabase
      .from('meals')
      .select('calories, nutrition')
      .eq('id', mealId)
      .single();

    if (mealError) throw mealError;

    const actualCalories = Math.round(meal.calories * servingSize);
    const nutrition = meal.nutrition;

    // Calculate actual macros based on serving size
    const actualMacros = {
      protein: nutrition.protein.value * servingSize,
      carbs: nutrition.carbs.value * servingSize,
      fat: nutrition.fat.value * servingSize,
      fiber: nutrition.fiber.value * servingSize,
      sugar: nutrition.sugar.value * servingSize,
      sodium: nutrition.sodium.value * servingSize
    };

    // Insert meal consumption
    const { data, error } = await supabase
      .from('meal_consumptions')
      .insert({
        user_id: userId,
        meal_id: mealId,
        serving_size: servingSize,
        actual_calories: actualCalories
      })
      .select()
      .single();

    if (error) {
      console.error('Error consuming meal:', error);
      throw error;
    }

    // Update daily macros
    const today = new Date().toISOString().split('T')[0];
    
    // First try to get existing record
    const { data: existingRecord, error: fetchError } = await supabase
      .from('daily_macronutrients')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching daily macros:', fetchError);
    }

    if (existingRecord) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('daily_macronutrients')
        .update({
          protein: existingRecord.protein + actualMacros.protein,
          carbs: existingRecord.carbs + actualMacros.carbs,
          fat: existingRecord.fat + actualMacros.fat,
          fiber: existingRecord.fiber + actualMacros.fiber,
          sugar: existingRecord.sugar + actualMacros.sugar,
          sodium: existingRecord.sodium + actualMacros.sodium,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('date', today);

      if (updateError) {
        console.error('Error updating daily macros:', updateError);
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('daily_macronutrients')
        .insert({
          user_id: userId,
          date: today,
          protein: actualMacros.protein,
          carbs: actualMacros.carbs,
          fat: actualMacros.fat,
          fiber: actualMacros.fiber,
          sugar: actualMacros.sugar,
          sodium: actualMacros.sodium
        });

      if (insertError) {
        console.error('Error creating daily macros record:', insertError);
      }
    }

    console.log('Meal consumed successfully:', data);
    return data;
    
  } catch (error) {
    console.error('Error consuming meal:', error);
    throw error;
  }
};

export const getDailyNutrition = async (userId, date = new Date()) => {
  try {
    const targetDate = date.toISOString().split('T')[0];
    
    // Get daily macros from the dedicated table
    const { data, error } = await supabase
      .from('daily_macronutrients')
      .select('*')
      .eq('user_id', userId)
      .eq('date', targetDate)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting daily nutrition:', error);
      throw error;
    }

    // If no record exists, return zeros
    if (!data) {
      return {
        total_calories: 0, // Calories are tracked separately
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
        total_fiber: 0,
        total_sugar: 0,
        total_sodium: 0
      };
    }

    return {
      total_calories: 0, // Calories are tracked separately
      total_protein: data.protein || 0,
      total_carbs: data.carbs || 0,
      total_fat: data.fat || 0,
      total_fiber: data.fiber || 0,
      total_sugar: data.sugar || 0,
      total_sodium: data.sodium || 0
    };
    
  } catch (error) {
    console.error('Error getting daily nutrition:', error);
    throw error;
  }
}; 