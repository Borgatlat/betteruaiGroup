import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { LogoImage } from '../utils/imageUtils';
import { useAuth } from '../context/AuthContext';
import { getOfferings, purchasePackage, restorePurchases, initializePurchases } from '../lib/purchases';
import { Purchases } from 'react-native-purchases';
import { supabase } from '../lib/supabase';

function PurchaseSubscriptionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [error, setError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('monthly'); // 'monthly' or 'yearly'

  useEffect(() => {
    if (user?.id) {
      loadOfferings();
    }
  }, [user?.id]);

  const loadOfferings = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading offerings...');

      // Initialize RevenueCat first
      console.log('Initializing RevenueCat...');
      await initializePurchases(user.id);
      console.log('RevenueCat initialized successfully');

      const offeringsData = await getOfferings();
      console.log('Offerings data received:', offeringsData);

      if (!offeringsData?.current) {
        console.log('No current offering found');
        setError('No subscription options available');
        return;
      }

      if (!offeringsData.current.availablePackages?.length) {
        console.log('No available packages found');
        setError('No subscription packages available');
        return;
      }

      console.log('Setting offerings:', offeringsData.current);
      setOfferings(offeringsData.current);

      // Log all available packages
      console.log('All available packages:', offeringsData.current.availablePackages.map(pkg => ({
        identifier: pkg.identifier,
        title: pkg.product.title,
        price: pkg.product.priceString,
        period: pkg.product.subscriptionPeriod
      })));

      // Set default selected package to monthly
      const monthlyPackage = offeringsData.current.availablePackages.find(
        pkg => pkg.product.subscriptionPeriod === 'P1M' || pkg.packageType === 'MONTHLY'
      );
      console.log('Monthly package found:', monthlyPackage);

      if (monthlyPackage) {
        console.log('Setting default package to monthly');
        setSelectedPackage(monthlyPackage);
      } else {
        console.log('No monthly package found, using first available package');
        setSelectedPackage(offeringsData.current.availablePackages[0]);
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
      setError('Failed to load subscription options');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a subscription plan');
      return;
    }

    try {
      setLoading(true);
      console.log('Starting purchase for package:', selectedPackage.identifier);
      
      const result = await purchasePackage(selectedPackage);
      
      if (!result.success) {
        if (result.error === 'User cancelled the purchase') {
          console.log('Purchase cancelled by user');
          return;
        }
        throw new Error(result.error || 'Failed to complete purchase');
      }

      console.log('Purchase successful, checking entitlements...');
      
      // Create subscription record in Supabase
      const transactionId = `preview_${Date.now()}_${user.id}`; // Create a unique preview transaction ID
      const now = new Date();
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          profile_id: user.id,
          product_id: selectedPackage.product.identifier,
          original_transaction_id: transactionId,
          status: 'active',
          purchase_date: now.toISOString(),
          start_date: now.toISOString(),
          end_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          platform: Platform.OS
        });

      if (error) {
        console.error('Error creating subscription record:', error);
        Alert.alert('Error', 'Failed to create subscription record. Please contact support.');
        return;
      }

      Alert.alert('Success', 'Subscription activated successfully!');
      router.replace('/');
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', error.message || 'Failed to complete purchase. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setLoading(true);
      const result = await restorePurchases();
      
      if (result.success) {
        Alert.alert('Success', 'Purchases restored successfully!');
        router.replace('/settings');
      } else {
        Alert.alert('Error', result.error || 'Failed to restore purchases');
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      Alert.alert('Error', 'Failed to restore purchases');
    } finally {
      setLoading(false);
    }
  };

  const getMonthlyPackage = () => {
    if (!offerings?.availablePackages) {
      console.log('No available packages found');
      return null;
    }
    const monthly = offerings.availablePackages.find(
      pkg => pkg.product.subscriptionPeriod === 'P1M' || pkg.packageType === 'MONTHLY'
    );
    console.log('Getting monthly package:', monthly ? {
      identifier: monthly.identifier,
      price: monthly.product.priceString,
      period: monthly.product.subscriptionPeriod,
      type: monthly.packageType
    } : 'No monthly package found');
    return monthly;
  };

  const getYearlyPackage = () => {
    if (!offerings?.availablePackages) {
      console.log('No available packages found');
      return null;
    }
    const yearly = offerings.availablePackages.find(
      pkg => pkg.product.subscriptionPeriod === 'P1Y' || pkg.packageType === 'ANNUAL'
    );
    console.log('Getting yearly package:', yearly ? {
      identifier: yearly.identifier,
      price: yearly.product.priceString,
      period: yearly.product.subscriptionPeriod,
      type: yearly.packageType
    } : 'No yearly package found');
    return yearly;
  };

  const renderSubscriptionButton = (pkg, isSelected) => {
    if (!pkg) {
      console.log('No package provided for button');
      return null;
    }

    const getPeriodText = (pkg) => {
      if (pkg.packageType === 'MONTHLY') return 'month';
      if (pkg.packageType === 'ANNUAL') return 'year';
      if (pkg.product.subscriptionPeriod === 'P1M') return 'month';
      if (pkg.product.subscriptionPeriod === 'P1Y') return 'year';
      return 'month';
    };
    
    // Show 'Monthly' instead of 'Preview Product' for preview mode
    let displayTitle = pkg.product.title;
    if (displayTitle === 'Preview Product' && getPeriodText(pkg) === 'month') {
      displayTitle = 'Monthly';
    }
    if (displayTitle === 'Yearly Premium' && getPeriodText(pkg) === 'year') {
      displayTitle = 'Yearly';
    }

    return (
      <View style={isSelected ? styles.selectedOutline : null}>
        <TouchableOpacity
          style={[styles.subscriptionButton, isSelected && styles.selectedSubscriptionButton]}
          onPress={() => setSelectedPackage(pkg)}
        >
          <LinearGradient
            colors={isSelected ? ['#00ffff', '#0088ff'] : ['#222', '#111']}
            style={styles.subscriptionButtonGradient}
          >
            <Text style={[styles.subscriptionButtonText, isSelected && styles.selectedButtonText]}>
              {displayTitle}
            </Text>
            <Text style={[styles.subscriptionPrice, isSelected && styles.selectedButtonText]}>
              {pkg.product.priceString || '$9.99'}
            </Text>
            <Text style={[styles.subscriptionPeriod, isSelected && styles.selectedButtonText]}>
              per {getPeriodText(pkg)}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/settings')}>
        <Ionicons name="chevron-back" size={28} color="#00ffff" />
        <Text style={styles.backButtonText}>Back to Settings</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <LogoImage size={120} style={styles.logo} />
        <Text style={styles.title}>Upgrade Your Experience</Text>
      </View>

      {/* Premium Features Section - Moved to top for better visibility */}
      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Premium Features</Text>
        <Text style={styles.featuresSubtitle}>Unlock advanced features for enhanced fitness and mental wellness</Text>
        
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="fitness-outline" size={20} color="#00ffff" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Custom AI-Generated Workouts</Text>
              <Text style={styles.featureDescription}>Personalized workouts automatically created based on your profile and preferences</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="chatbubbles-outline" size={20} color="#00ffff" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>100 Daily AI Trainer Messages</Text>
              <Text style={styles.featureDescription}>Receive up to 100 AI-powered fitness and wellness messages daily</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="list-outline" size={20} color="#00ffff" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Premium Workout Plans</Text>
              <Text style={styles.featureDescription}>Access exclusive, professionally designed workout plans for faster progress</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="headset-outline" size={20} color="#00ffff" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Guided Audio for Mental Sessions</Text>
              <Text style={styles.featureDescription}>Enjoy calming and motivational guided audio content for mental wellness</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="infinite-outline" size={20} color="#00ffff" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Unlimited Custom Workouts</Text>
              <Text style={styles.featureDescription}>Create and save unlimited personalized workout routines</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="water-outline" size={20} color="#00ffff" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Custom Calorie & Water Goals</Text>
              <Text style={styles.featureDescription}>Set and adjust personal daily targets for nutrition and hydration</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="people-outline" size={20} color="#00ffff" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Create and Manage Community Groups</Text>
              <Text style={styles.featureDescription}>Create private or public fitness groups with member management</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="timer-outline" size={20} color="#00ffff" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Custom Workout Rest Timers</Text>
              <Text style={styles.featureDescription}>Adjust rest timers from 30 seconds to 5 minutes in 15-second increments</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="star-outline" size={20} color="#00ffff" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Glowing Profile Picture</Text>
              <Text style={styles.featureDescription}>Premium users receive a gold glowing outline around their profile image</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Plans Header */}
      <View style={styles.plansHeader}>
        <Text style={styles.plansTitle}>Choose Your Plan</Text>
        <Text style={styles.plansSubtitle}>Select the subscription that works best for you</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00ffff" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadOfferings}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.pricingContainer}>
            {offerings?.availablePackages?.map((pkg) => {
              const isMonthly = pkg.product.subscriptionPeriod === 'P1M' || pkg.packageType === 'MONTHLY';
              const isSelected = selectedPackage?.identifier === pkg.identifier;
              
              return (
                <TouchableOpacity 
                  key={pkg.identifier}
                  style={[
                    styles.pricingCard,
                    isSelected && styles.selectedCard
                  ]}
                  onPress={() => setSelectedPackage(pkg)}
                >
                  <View style={styles.pricingHeader}>
                    <Text style={styles.pricingTitle}>
                      {isMonthly ? 'Monthly' : 'Yearly'}
                    </Text>
                    <Text style={styles.pricingPrice}>
                      {pkg.product.priceString}
                    </Text>
                    <Text style={styles.pricingPeriod}>
                      per {isMonthly ? 'month' : 'year'}
                    </Text>
                    {!isMonthly && (
                      <View style={styles.savingsBadge}>
                        <Text style={styles.savingsText}>Save 17%</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.pricingFeatures}>
                    <Text style={styles.pricingFeature}>• All Premium Features</Text>
                    <Text style={styles.pricingFeature}>
                      {isMonthly ? '• Cancel anytime' : '• Best value'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.subscribeButton, loading && styles.subscribeButtonDisabled]}
            onPress={handleSubscribe}
            disabled={loading || !selectedPackage}
          >
            <LinearGradient
              colors={['#00ffff', '#0088ff']}
              style={styles.subscribeButtonGradient}
            >
              <Text style={styles.subscribeButtonText}>
                {loading ? 'Loading...' : `Subscribe ${selectedPackage?.product.subscriptionPeriod === 'P1M' ? 'Monthly' : 'Yearly'}`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.restoreButton} 
            onPress={handleRestorePurchases}
            disabled={loading}
          >
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          </TouchableOpacity>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By subscribing, you agree to our{' '}
              <Text 
                style={styles.termsLink}
                onPress={() => Linking.openURL('https://www.betteruai.com/terms-of-service')}
              >
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text 
                style={styles.termsLink}
                onPress={() => Linking.openURL('https://www.betteruai.com/privacy-policy')}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 140,
    paddingBottom: 100,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  backButtonText: {
    color: '#00ffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  pricingContainer: {
    gap: 20,
    marginBottom: 30,
  },
  pricingCard: {
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 10,
  },
  selectedCard: {
    borderColor: '#00ffff',
    borderWidth: 2,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
  pricingHeader: {
    padding: 20,
    alignItems: 'center',
  },
  pricingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  pricingPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ffff',
    marginBottom: 5,
  },
  pricingPeriod: {
    fontSize: 16,
    color: '#666',
  },
  pricingFeatures: {
    alignItems: 'center',
  },
  pricingFeature: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  savingsBadge: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 5,
  },
  savingsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subscribeButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
  },
  subscribeButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
  },
  subscribeButtonDisabled: {
    backgroundColor: '#666',
  },
  restoreButton: {
    marginTop: 18,
    marginBottom: 10,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#00ffff',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  featuresContainer: {
    marginBottom: 30,
    backgroundColor: 'rgba(0, 255, 255, 0.03)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  featuresTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  featuresSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 20,
  },
  plansHeader: {
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 10,
  },
  plansTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00ffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  plansSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  termsContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  termsText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  termsLink: {
    color: '#00ffff',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#00ffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  selectedOutline: {
    borderWidth: 3,
    borderColor: '#00ffff',
    borderRadius: 20,
    backgroundColor: 'rgba(0,255,255,0.08)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 10,
  },
  subscriptionButtonsContainer: {
    display: 'none',
  },
});

export default PurchaseSubscriptionScreen; 