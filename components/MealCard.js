import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Dimensions
} from 'react-native';
import { consumeMeal } from '../utils/aiMealGenerator';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export const MealCard = ({ meal, onMealConsumed }) => {
  const { user } = useAuth();
  const [isConsuming, setIsConsuming] = useState(false);
  const [servingSize, setServingSize] = useState(1.0);

  // Helper function to get meal type icon
  const getMealTypeIcon = (mealType) => {
    switch(mealType) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'dinner': return '🌙';
      case 'snack': return '🍎';
      default: return '🍽️';
    }
  };

  // Helper function to format time
  const formatTime = (minutes) => {
    if (minutes === 0) return 'No cooking';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Handle meal consumption
  const handleConsumeMeal = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to track meals');
      return;
    }

    setIsConsuming(true);
    try {
      await consumeMeal(meal.id, user.id, servingSize);
      
      Alert.alert(
        'Meal Consumed!',
        `Added ${Math.round(meal.calories * servingSize)} calories to your daily total.`,
        [{ text: 'OK' }]
      );

      // Call the callback to update parent component
      if (onMealConsumed) {
        onMealConsumed(meal, servingSize);
      }
      
    } catch (error) {
      console.error('Error consuming meal:', error);
      Alert.alert('Error', 'Failed to track meal consumption. Please try again.');
    } finally {
      setIsConsuming(false);
    }
  };

  // Calculate actual nutrition based on serving size
  const getActualNutrition = (nutritionValue) => {
    return Math.round(nutritionValue * servingSize);
  };

  return (
    <View style={styles.container}>
      {/* Meal Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.mealTypeIcon}>{getMealTypeIcon(meal.meal_type)}</Text>
          <View style={styles.titleTextContainer}>
            <Text style={styles.mealName}>{meal.name}</Text>
            <Text style={styles.mealDescription}>{meal.description}</Text>
          </View>
        </View>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </View>

      {/* Nutrition Facts */}
      <View style={styles.nutritionSection}>
        <Text style={styles.sectionTitle}>Nutrition Facts</Text>
        <View style={styles.nutritionGrid}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>
              {getActualNutrition(meal.nutrition.calories.value)}
            </Text>
            <Text style={styles.nutritionLabel}>Calories</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>
              {getActualNutrition(meal.nutrition.protein.value)}g
            </Text>
            <Text style={styles.nutritionLabel}>Protein</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>
              {getActualNutrition(meal.nutrition.carbs.value)}g
            </Text>
            <Text style={styles.nutritionLabel}>Carbs</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>
              {getActualNutrition(meal.nutrition.fat.value)}g
            </Text>
            <Text style={styles.nutritionLabel}>Fat</Text>
          </View>
        </View>
      </View>

      {/* Ingredients */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        <ScrollView style={styles.ingredientsList} showsVerticalScrollIndicator={false}>
          {meal.ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientItem}>
              <Text style={styles.ingredientText}>
                • {ingredient.amount} {ingredient.unit} {ingredient.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.instructionsText}>{meal.instructions}</Text>
      </View>

      {/* Time and Cuisine Info */}
      <View style={styles.infoSection}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Prep Time:</Text>
          <Text style={styles.infoValue}>{formatTime(meal.prep_time)}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Cook Time:</Text>
          <Text style={styles.infoValue}>{formatTime(meal.cook_time)}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Cuisine:</Text>
          <Text style={styles.infoValue}>{meal.cuisine_type}</Text>
        </View>
      </View>

      {/* Serving Size and Consume Button */}
      <View style={styles.consumptionSection}>
        <View style={styles.servingSizeContainer}>
          <Text style={styles.servingSizeLabel}>Serving Size:</Text>
          <View style={styles.servingSizeButtons}>
            {[0.5, 0.75, 1.0, 1.25, 1.5].map(size => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.servingSizeButton,
                  servingSize === size && styles.selectedServingSize
                ]}
                onPress={() => setServingSize(size)}
              >
                <Text style={[
                  styles.servingSizeText,
                  servingSize === size && styles.selectedServingSizeText
                ]}>
                  {size === 1.0 ? '1x' : `${size}x`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.consumeButton,
            isConsuming && styles.disabledButton
          ]}
          onPress={handleConsumeMeal}
          disabled={isConsuming}
        >
          <Text style={styles.consumeButtonText}>
            {isConsuming ? 'Adding to Tracker...' : `Consume Meal (${Math.round(meal.calories * servingSize)} cal)`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  mealTypeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  titleTextContainer: {
    flex: 1,
  },
  mealName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  mealDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  aiBadge: {
    backgroundColor: '#00ffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  nutritionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00ffff',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  ingredientsList: {
    maxHeight: 100,
  },
  ingredientItem: {
    marginBottom: 4,
  },
  ingredientText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  instructionsText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  consumptionSection: {
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingTop: 15,
  },
  servingSizeContainer: {
    marginBottom: 15,
  },
  servingSizeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  servingSizeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  servingSizeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#111',
  },
  selectedServingSize: {
    backgroundColor: '#00ffff',
    borderColor: '#00ffff',
  },
  servingSizeText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  selectedServingSizeText: {
    color: '#fff',
  },
  consumeButton: {
    backgroundColor: '#00ffff',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  consumeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
}); 