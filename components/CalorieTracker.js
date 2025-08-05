import React, { useState, useEffect, useImperativeHandle } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { AIMealGenerator } from './AIMealGenerator';
import { CompactMealCard } from './CompactMealCard';
import { getDailyNutrition } from '../utils/aiMealGenerator';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

export const CalorieTracker = React.forwardRef(({ onMealConsumed, isPremium = false }, ref) => {
  const { user } = useAuth();
  const router = useRouter();
  const [dailyNutrition, setDailyNutrition] = useState({
    total_calories: 0,
    total_protein: 0,
    total_carbs: 0,
    total_fat: 0,
    total_fiber: 0,
    total_sugar: 0,
    total_sodium: 0
  });
  const [generatedMeals, setGeneratedMeals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load daily nutrition and meals on component mount
  useEffect(() => {
    if (user) {
      loadDailyData();
    }
  }, [user]);

  // Load daily nutrition data
  const loadDailyNutrition = async () => {
    try {
      const nutrition = await getDailyNutrition(user.id);
      setDailyNutrition(nutrition);
    } catch (error) {
      console.error('Error loading daily nutrition:', error);
    }
  };

  // Load user's generated meals
  const loadGeneratedMeals = async () => {
    try {
      const { data: meals, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_ai_generated', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setGeneratedMeals(meals || []);
    } catch (error) {
      console.error('Error loading generated meals:', error);
    }
  };

  // Load all daily data
  const loadDailyData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadDailyNutrition(),
        loadGeneratedMeals()
      ]);
    } catch (error) {
      console.error('Error loading daily data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Expose refresh method to parent component
  useImperativeHandle(ref, () => ({
    refresh: loadDailyData
  }));

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadDailyData();
    setRefreshing(false);
  };

  // Handle new meal generation
  const handleMealGenerated = (newMeal) => {
    setGeneratedMeals(prev => [newMeal, ...prev]);
    // Refresh daily nutrition after a short delay
    setTimeout(() => {
      loadDailyNutrition();
    }, 1000);
  };

  // Handle meal deletion
  const handleMealDeleted = async (mealId) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting meal:', error);
        Alert.alert('Error', 'Failed to delete meal. Please try again.');
        return;
      }

      // Remove from local state
      setGeneratedMeals(prev => prev.filter(meal => meal.id !== mealId));
      
      Alert.alert('Success', 'Meal deleted successfully.');
    } catch (error) {
      console.error('Error deleting meal:', error);
      Alert.alert('Error', 'Failed to delete meal. Please try again.');
    }
  };

  // Handle meal consumption
  const handleMealConsumed = async (meal, servingSize) => {
    // Refresh daily nutrition
    await loadDailyNutrition();
    
    // Call the parent callback to update the main calorie tracker
    if (onMealConsumed) {
      const caloriesToAdd = Math.round(meal.calories * servingSize);
      onMealConsumed(caloriesToAdd);
    }
    
    // Show success message
    Alert.alert(
      'Meal Tracked!',
      `Added ${Math.round(meal.calories * servingSize)} calories to your daily total.`,
      [{ text: 'OK' }]
    );
  };

  // Calculate macro percentages
  const totalMacros = dailyNutrition.total_protein + dailyNutrition.total_carbs + dailyNutrition.total_fat;
  const proteinPercentage = totalMacros > 0 ? (dailyNutrition.total_protein / totalMacros) * 100 : 0;
  const carbsPercentage = totalMacros > 0 ? (dailyNutrition.total_carbs / totalMacros) * 100 : 0;
  const fatPercentage = totalMacros > 0 ? (dailyNutrition.total_fat / totalMacros) * 100 : 0;

  return (
    <View style={styles.container}>
                      {/* Daily Nutrition Summary */}
        <View style={styles.nutritionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Macronutrients</Text>
          </View>
          
          {/* Macro Breakdown */}
          <View style={styles.macroSection}>
            <View style={styles.macroGrid}>
              <View style={styles.macroItem}>
                <View style={[styles.macroBar, { backgroundColor: '#FF6B6B' }]}>
                  <View 
                    style={[
                      styles.macroFill, 
                      { 
                        backgroundColor: '#FF6B6B',
                        width: `${proteinPercentage}%` 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroValue}>{dailyNutrition.total_protein.toFixed(1)}g</Text>
              </View>
              
              <View style={styles.macroItem}>
                <View style={[styles.macroBar, { backgroundColor: '#4ECDC4' }]}>
                  <View 
                    style={[
                      styles.macroFill, 
                      { 
                        backgroundColor: '#4ECDC4',
                        width: `${carbsPercentage}%` 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroValue}>{dailyNutrition.total_carbs.toFixed(1)}g</Text>
              </View>
              
              <View style={styles.macroItem}>
                <View style={[styles.macroBar, { backgroundColor: '#45B7D1' }]}>
                  <View 
                    style={[
                      styles.macroFill, 
                      { 
                        backgroundColor: '#45B7D1',
                        width: `${fatPercentage}%` 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.macroLabel}>Fat</Text>
                <Text style={styles.macroValue}>{dailyNutrition.total_fat.toFixed(1)}g</Text>
              </View>
            </View>
          </View>

          {/* Additional Nutrition */}
          <View style={styles.additionalNutrition}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Fiber</Text>
              <Text style={styles.nutritionValue}>{dailyNutrition.total_fiber.toFixed(1)}g</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Sugar</Text>
              <Text style={styles.nutritionValue}>{dailyNutrition.total_sugar.toFixed(1)}g</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Sodium</Text>
              <Text style={styles.nutritionValue}>{dailyNutrition.total_sodium.toFixed(0)}mg</Text>
            </View>
          </View>
        </View>

      {/* Generated Meals */}
      <View style={styles.mealsSection}>
        <Text style={styles.sectionTitle}>Your AI Generated Meals</Text>
        {!isPremium ? (
          <View style={styles.premiumLockedState}>
            <View style={styles.premiumLockedIcon}>
              <Text style={styles.premiumLockedIconText}>🔒</Text>
            </View>
            <Text style={styles.premiumLockedTitle}>Premium Feature</Text>
            <Text style={styles.premiumLockedSubtext}>
              Upgrade to Premium to unlock AI meal generation and track your nutrition with AI-powered meal suggestions!
            </Text>
            <TouchableOpacity 
              style={styles.premiumUpgradeButton}
              onPress={() => router.push('/settings')}
            >
              <Text style={styles.premiumUpgradeButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          </View>
        ) : generatedMeals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No meals generated yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Use the AI meal generator above to create your first meal!
            </Text>
          </View>
        ) : (
          generatedMeals.map(meal => (
            <CompactMealCard
              key={meal.id}
              meal={meal}
              onMealConsumed={handleMealConsumed}
              onMealDeleted={handleMealDeleted}
            />
          ))
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },

  nutritionCard: {
    backgroundColor: '#111',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },

  macroSection: {
    marginBottom: 25,
  },

  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroBar: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginBottom: 8,
  },
  macroFill: {
    height: '100%',
    borderRadius: 2,
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  additionalNutrition: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  mealsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  premiumLockedState: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
    marginTop: 10,
  },
  premiumLockedIcon: {
    marginBottom: 15,
  },
  premiumLockedIconText: {
    fontSize: 40,
  },
  premiumLockedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff4444',
    marginBottom: 10,
    textAlign: 'center',
  },
  premiumLockedSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  premiumUpgradeButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ff6666',
  },
  premiumUpgradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 20,
  },
}); 