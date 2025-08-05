import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Dimensions
} from 'react-native';
import { generateAIMeal, saveGeneratedMeal } from '../utils/aiMealGenerator';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export const AIMealGenerator = ({ onMealGenerated, onClose, isInModal = false }) => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // State for meal preferences
  const [preferences, setPreferences] = useState({
    calorieRange: { min: 400, max: 600 },
    mealType: 'lunch',
    cuisineType: 'any',
    dietaryRestrictions: []
  });

  // Available options for meal types and cuisines
  const mealTypes = [
    { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { value: 'lunch', label: 'Lunch', icon: '☀️' },
    { value: 'dinner', label: 'Dinner', icon: '🌙' },
    { value: 'snack', label: 'Snack', icon: '🍎' }
  ];

  const cuisineTypes = [
    { value: 'any', label: 'Any Cuisine' },
    { value: 'italian', label: 'Italian' },
    { value: 'mexican', label: 'Mexican' },
    { value: 'asian', label: 'Asian' },
    { value: 'mediterranean', label: 'Mediterranean' },
    { value: 'american', label: 'American' },
    { value: 'indian', label: 'Indian' },
    { value: 'french', label: 'French' }
  ];

  const dietaryRestrictions = [
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'gluten-free', label: 'Gluten-Free' },
    { value: 'dairy-free', label: 'Dairy-Free' },
    { value: 'low-carb', label: 'Low-Carb' },
    { value: 'keto', label: 'Keto' },
    { value: 'paleo', label: 'Paleo' }
  ];

  // Function to get calorie range based on meal type
  const getCalorieRange = (mealType) => {
    switch(mealType) {
      case 'breakfast': return { min: 300, max: 500 };
      case 'lunch': return { min: 400, max: 700 };
      case 'dinner': return { min: 400, max: 700 };
      case 'snack': return { min: 100, max: 300 };
      default: return { min: 300, max: 600 };
    }
  };

  // Update calorie range when meal type changes
  const handleMealTypeChange = (mealType) => {
    const newCalorieRange = getCalorieRange(mealType);
    setPreferences(prev => ({
      ...prev,
      mealType,
      calorieRange: newCalorieRange
    }));
  };

  // Handle dietary restriction toggle
  const toggleDietaryRestriction = (restriction) => {
    setPreferences(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction]
    }));
  };

  // Generate meal using AI
  const handleGenerateMeal = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to generate meals');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('Generating meal with preferences:', preferences);
      
      // Generate meal using AI
      const mealData = await generateAIMeal(preferences);
      
      // Save meal to Supabase
      const savedMeal = await saveGeneratedMeal(mealData, user.id);
      
      console.log('Meal generated and saved:', savedMeal);
      
      // Call the callback to update parent component
      if (onMealGenerated) {
        onMealGenerated(savedMeal);
      }
      
      setShowModal(false);
      Alert.alert('Success', 'Your AI meal has been generated!');
      
    } catch (error) {
      console.error('Error generating meal:', error);
      Alert.alert('Error', 'Failed to generate meal. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* If component is used inside a modal, show preferences directly */}
      {isInModal ? (
        <View style={styles.singleModalContent}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            style={styles.scrollView}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Meal Generator</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Meal Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Meal Type</Text>
              <View style={styles.optionsGrid}>
                {mealTypes.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.optionButton,
                      preferences.mealType === type.value && styles.selectedOption
                    ]}
                    onPress={() => handleMealTypeChange(type.value)}
                  >
                    <Text style={styles.optionIcon}>{type.icon}</Text>
                    <Text style={[
                      styles.optionText,
                      preferences.mealType === type.value && styles.selectedOptionText
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Calorie Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Calories: {preferences.calorieRange.min}-{preferences.calorieRange.max}
              </Text>
              <Text style={styles.sectionSubtitle}>
                Based on {preferences.mealType} recommendations
              </Text>
            </View>

            {/* Cuisine Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cuisine Type</Text>
              <View style={styles.optionsGrid}>
                {cuisineTypes.map(cuisine => (
                  <TouchableOpacity
                    key={cuisine.value}
                    style={[
                      styles.optionButton,
                      preferences.cuisineType === cuisine.value && styles.selectedOption
                    ]}
                    onPress={() => setPreferences(prev => ({ ...prev, cuisineType: cuisine.value }))}
                  >
                    <Text style={[
                      styles.optionText,
                      preferences.cuisineType === cuisine.value && styles.selectedOptionText
                    ]}>
                      {cuisine.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Dietary Restrictions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
              <Text style={styles.sectionSubtitle}>Select all that apply</Text>
              <View style={styles.optionsGrid}>
                {dietaryRestrictions.map(restriction => (
                  <TouchableOpacity
                    key={restriction.value}
                    style={[
                      styles.optionButton,
                      preferences.dietaryRestrictions.includes(restriction.value) && styles.selectedOption
                    ]}
                    onPress={() => toggleDietaryRestriction(restriction.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      preferences.dietaryRestrictions.includes(restriction.value) && styles.selectedOptionText
                    ]}>
                      {restriction.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              style={[
                styles.generateMealButton,
                isGenerating && styles.disabledButton
              ]}
              onPress={handleGenerateMeal}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.generateMealButtonText}>Generating...</Text>
                </View>
              ) : (
                <Text style={styles.generateMealButtonText}>Generate Meal</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      ) : (
        <View style={styles.container}>
          {/* Main Generate Button */}
          <TouchableOpacity
            style={styles.generateButton}
            onPress={() => setShowModal(true)}
          >
            <Text style={styles.generateButtonText}>🤖 Generate AI Meal</Text>
          </TouchableOpacity>

          {/* Preferences Modal */}
          <Modal
            visible={showModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                  style={styles.scrollView}
                >
                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>AI Meal Generator</Text>
                    <TouchableOpacity
                      onPress={() => setShowModal(false)}
                      style={styles.closeButton}
                    >
                      <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Meal Type Selection */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Meal Type</Text>
                    <View style={styles.optionsGrid}>
                      {mealTypes.map(type => (
                        <TouchableOpacity
                          key={type.value}
                          style={[
                            styles.optionButton,
                            preferences.mealType === type.value && styles.selectedOption
                          ]}
                          onPress={() => handleMealTypeChange(type.value)}
                        >
                          <Text style={styles.optionIcon}>{type.icon}</Text>
                          <Text style={[
                            styles.optionText,
                            preferences.mealType === type.value && styles.selectedOptionText
                          ]}>
                            {type.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Calorie Range */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      Calories: {preferences.calorieRange.min}-{preferences.calorieRange.max}
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Based on {preferences.mealType} recommendations
                    </Text>
                  </View>

                  {/* Cuisine Type */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cuisine Type</Text>
                    <View style={styles.optionsGrid}>
                      {cuisineTypes.map(cuisine => (
                        <TouchableOpacity
                          key={cuisine.value}
                          style={[
                            styles.optionButton,
                            preferences.cuisineType === cuisine.value && styles.selectedOption
                          ]}
                          onPress={() => setPreferences(prev => ({ ...prev, cuisineType: cuisine.value }))}
                        >
                          <Text style={[
                            styles.optionText,
                            preferences.cuisineType === cuisine.value && styles.selectedOptionText
                          ]}>
                            {cuisine.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Dietary Restrictions */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
                    <Text style={styles.sectionSubtitle}>Select all that apply</Text>
                    <View style={styles.optionsGrid}>
                      {dietaryRestrictions.map(restriction => (
                        <TouchableOpacity
                          key={restriction.value}
                          style={[
                            styles.optionButton,
                            preferences.dietaryRestrictions.includes(restriction.value) && styles.selectedOption
                          ]}
                          onPress={() => toggleDietaryRestriction(restriction.value)}
                        >
                          <Text style={[
                            styles.optionText,
                            preferences.dietaryRestrictions.includes(restriction.value) && styles.selectedOptionText
                          ]}>
                            {restriction.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Generate Button */}
                  <TouchableOpacity
                    style={[
                      styles.generateMealButton,
                      isGenerating && styles.disabledButton
                    ]}
                    onPress={handleGenerateMeal}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#000" />
                        <Text style={styles.generateMealButtonText}>Generating...</Text>
                      </View>
                    ) : (
                      <Text style={styles.generateMealButtonText}>Generate Meal</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  generateButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  generateButtonText: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  modalContent: {
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    height: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // Fix for when used inside another modal
    margin: 0,
    alignSelf: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  singleModalContent: {
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 20,
    width: '98%',
    height: '95%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  section: {
    marginBottom: 25,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#111',
    minWidth: 80,
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#00ffff',
    borderColor: '#00ffff',
  },
  optionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
  generateMealButton: {
    backgroundColor: '#00ffff',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    marginHorizontal: 5,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  generateMealButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
}); 