import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Initialize RevenueCat with your API keys
const REVENUECAT_API_KEYS = {
  ios: 'appl_VqDUMRHcMiIEYYmbHamptaLYyIY',
  android: null // We'll implement Android later
};

export const initializePurchases = async (userId) => {
  try {
    console.log('Initializing purchases for user:', userId);
    // Only initialize for iOS for now
    if (Platform.OS !== 'ios') {
      console.log('In-app purchases are currently only available on iOS');
      return;
    }

    const apiKey = REVENUECAT_API_KEYS.ios;
    if (!apiKey) {
      console.error('RevenueCat API key not found');
      return;
    }

    console.log('Configuring RevenueCat with API key:', apiKey);
    await Purchases.configure({ 
      apiKey,
      observerMode: false,
      useAmazon: false,
      appUserID: userId // Set the user ID during configuration
    });
    console.log('RevenueCat configured successfully');

    // Set up listener for purchase updates
    Purchases.addCustomerInfoUpdateListener(async (info) => {
      console.log('Purchase update received:', JSON.stringify(info, null, 2));
      await handlePurchaseUpdate(info);
    });

    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('Error initializing purchases:', error);
    throw error;
  }
};

export const getOfferings = async () => {
  try {
    console.log('Getting offerings...');
    if (Platform.OS !== 'ios') {
      console.log('In-app purchases are currently only available on iOS');
      return null;
    }

    console.log('Calling Purchases.getOfferings()...');
    const offerings = await Purchases.getOfferings();
    console.log('Raw offerings data:', JSON.stringify(offerings, null, 2));
    
    if (!offerings) {
      console.log('No offerings returned from RevenueCat');
      return null;
    }

    if (!offerings.current) {
      console.log('No current offering found in RevenueCat response');
      return null;
    }

    if (!offerings.current.availablePackages?.length) {
      console.log('No available packages found in current offering');
      return null;
    }

    // Log detailed package information
    console.log('Number of available packages:', offerings.current.availablePackages.length);
    offerings.current.availablePackages.forEach((pkg, index) => {
      console.log(`Package ${index + 1}:`, {
        identifier: pkg.identifier,
        product: {
          title: pkg.product.title,
          priceString: pkg.product.priceString,
          subscriptionPeriod: pkg.product.subscriptionPeriod
        }
      });
    });

    // If we're in preview mode, create a yearly package from the monthly one
    if (offerings.current.availablePackages.length === 1) {
      const monthlyPackage = offerings.current.availablePackages[0];
      if (monthlyPackage.product.subscriptionPeriod === 'P1M' || monthlyPackage.packageType === 'MONTHLY') {
        console.log('Creating yearly package from monthly package');
        const yearlyPackage = {
          ...monthlyPackage,
          identifier: `${monthlyPackage.identifier}_yearly`,
          packageType: 'ANNUAL',
          product: {
            ...monthlyPackage.product,
            subscriptionPeriod: 'P1Y',
            priceString: `$${(parseFloat(monthlyPackage.product.priceString.replace('$', '')) * 10).toFixed(2)}`,
            title: 'Yearly Premium'
          }
        };
        offerings.current.availablePackages.push(yearlyPackage);
        console.log('Added yearly package:', yearlyPackage);
      }
    }

    return offerings;
  } catch (error) {
    console.error('Error getting offerings:', error);
    return null;
  }
};

export const purchasePackage = async (pkg) => {
  try {
    if (Platform.OS !== 'ios') {
      return { success: false, error: 'In-app purchases are currently only available on iOS' };
    }

    console.log('Attempting to purchase package:', pkg.identifier);
    const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pkg);
    console.log('Purchase successful:', { customerInfo, productIdentifier });
    
    await handlePurchaseUpdate(customerInfo);
    return { success: true, productIdentifier };
  } catch (error) {
    if (error.userCancelled) {
      console.log('User cancelled the purchase');
      return { success: false, error: 'User cancelled the purchase' };
    }
    console.error('Error purchasing package:', error);
    return { success: false, error: error.message };
  }
};

export const restorePurchases = async () => {
  try {
    if (Platform.OS !== 'ios') {
      return { success: false, error: 'In-app purchases are currently only available on iOS' };
    }

    const customerInfo = await Purchases.restorePurchases();
    await handlePurchaseUpdate(customerInfo);
    return { success: true };
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return { success: false, error: error.message };
  }
};

const handlePurchaseUpdate = async (customerInfo) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const entitlements = customerInfo.entitlements.active;
    const isPremium = Object.keys(entitlements).length > 0;

    if (isPremium) {
      const subscription = entitlements['premium']; // Replace with your entitlement identifier
      const purchaseDate = new Date(subscription.latestPurchaseDate);
      const expirationDate = subscription.expirationDate ? new Date(subscription.expirationDate) : null;

      // Update subscription in Supabase
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          profile_id: user.id,
          product_id: subscription.productIdentifier,
          original_transaction_id: subscription.originalTransactionId,
          latest_receipt: JSON.stringify(customerInfo.originalAppUserId),
          status: 'active',
          purchase_date: purchaseDate.toISOString(),
          start_date: purchaseDate.toISOString(),
          end_date: expirationDate ? expirationDate.toISOString() : null,
          platform: Platform.OS
        });

      // Update is_premium in profiles table
      await supabase
        .from('profiles')
        .update({ is_premium: true })
        .eq('id', user.id);

      console.log('Subscription and premium status updated in Supabase:', {
        userId: user.id,
        productId: subscription.productIdentifier,
        status: 'active',
        expirationDate: expirationDate?.toISOString(),
        isPremium: true
      });
    } else {
      // If not premium, update both tables to reflect that
      await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('user_id', user.id)
        .eq('status', 'active');

      await supabase
        .from('profiles')
        .update({ is_premium: false })
        .eq('id', user.id);

      console.log('Premium status removed:', {
        userId: user.id,
        isPremium: false
      });
    }
  } catch (error) {
    console.error('Error handling purchase update:', error);
  }
}; 