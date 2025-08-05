import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Usage limits from environment variables
const DAILY_LIMIT = parseInt(process.env.EXPO_PUBLIC_AI_DAILY_LIMIT) || 50;
const HOURLY_LIMIT = parseInt(process.env.EXPO_PUBLIC_AI_HOURLY_LIMIT) || 10;
const RATE_LIMIT_ENABLED = process.env.EXPO_PUBLIC_AI_RATE_LIMIT_ENABLED === 'true';

// Storage keys
const USAGE_KEY = 'ai_food_detection_usage';
const DAILY_USAGE_KEY = 'ai_daily_usage';
const HOURLY_USAGE_KEY = 'ai_hourly_usage';

// Usage tracking class
class UsageTracker {
  constructor() {
    this.isInitialized = false;
  }

  // Initialize usage tracking
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Initialize daily usage if not exists
      const dailyUsage = await this.getDailyUsage();
      if (!dailyUsage) {
        await this.resetDailyUsage();
      }

      // Initialize hourly usage if not exists
      const hourlyUsage = await this.getHourlyUsage();
      if (!hourlyUsage) {
        await this.resetHourlyUsage();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing usage tracker:', error);
    }
  }

  // Get current timestamp
  getCurrentTimestamp() {
    return Date.now();
  }

  // Get current date string (YYYY-MM-DD)
  getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }

  // Get current hour string (YYYY-MM-DD-HH)
  getCurrentHour() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`;
  }

  // Get daily usage
  async getDailyUsage() {
    try {
      const usage = await AsyncStorage.getItem(DAILY_USAGE_KEY);
      return usage ? JSON.parse(usage) : null;
    } catch (error) {
      console.error('Error getting daily usage:', error);
      return null;
    }
  }

  // Get hourly usage
  async getHourlyUsage() {
    try {
      const usage = await AsyncStorage.getItem(HOURLY_USAGE_KEY);
      return usage ? JSON.parse(usage) : null;
    } catch (error) {
      console.error('Error getting hourly usage:', error);
      return null;
    }
  }

  // Reset daily usage
  async resetDailyUsage() {
    try {
      const usage = {
        date: this.getCurrentDate(),
        count: 0,
        lastReset: this.getCurrentTimestamp()
      };
      await AsyncStorage.setItem(DAILY_USAGE_KEY, JSON.stringify(usage));
    } catch (error) {
      console.error('Error resetting daily usage:', error);
    }
  }

  // Reset hourly usage
  async resetHourlyUsage() {
    try {
      const usage = {
        hour: this.getCurrentHour(),
        count: 0,
        lastReset: this.getCurrentTimestamp()
      };
      await AsyncStorage.setItem(HOURLY_USAGE_KEY, JSON.stringify(usage));
    } catch (error) {
      console.error('Error resetting hourly usage:', error);
    }
  }

  // Check if daily limit is reached
  async checkDailyLimit() {
    if (!RATE_LIMIT_ENABLED) return { allowed: true, remaining: DAILY_LIMIT };

    try {
      await this.initialize();
      
      const dailyUsage = await this.getDailyUsage();
      if (!dailyUsage) {
        await this.resetDailyUsage();
        return { allowed: true, remaining: DAILY_LIMIT };
      }

      // Check if it's a new day
      if (dailyUsage.date !== this.getCurrentDate()) {
        await this.resetDailyUsage();
        return { allowed: true, remaining: DAILY_LIMIT };
      }

      const remaining = DAILY_LIMIT - dailyUsage.count;
      return {
        allowed: remaining > 0,
        remaining: Math.max(0, remaining),
        used: dailyUsage.count
      };
    } catch (error) {
      console.error('Error checking daily limit:', error);
      return { allowed: true, remaining: DAILY_LIMIT }; // Allow if error
    }
  }

  // Check if hourly limit is reached
  async checkHourlyLimit() {
    if (!RATE_LIMIT_ENABLED) return { allowed: true, remaining: HOURLY_LIMIT };

    try {
      await this.initialize();
      
      const hourlyUsage = await this.getHourlyUsage();
      if (!hourlyUsage) {
        await this.resetHourlyUsage();
        return { allowed: true, remaining: HOURLY_LIMIT };
      }

      // Check if it's a new hour
      if (hourlyUsage.hour !== this.getCurrentHour()) {
        await this.resetHourlyUsage();
        return { allowed: true, remaining: HOURLY_LIMIT };
      }

      const remaining = HOURLY_LIMIT - hourlyUsage.count;
      return {
        allowed: remaining > 0,
        remaining: Math.max(0, remaining),
        used: hourlyUsage.count
      };
    } catch (error) {
      console.error('Error checking hourly limit:', error);
      return { allowed: true, remaining: HOURLY_LIMIT }; // Allow if error
    }
  }

  // Increment usage
  async incrementUsage() {
    if (!RATE_LIMIT_ENABLED) return;

    try {
      await this.initialize();

      // Increment daily usage
      const dailyUsage = await this.getDailyUsage();
      if (dailyUsage && dailyUsage.date === this.getCurrentDate()) {
        dailyUsage.count += 1;
        await AsyncStorage.setItem(DAILY_USAGE_KEY, JSON.stringify(dailyUsage));
      } else {
        await this.resetDailyUsage();
        const newDailyUsage = await this.getDailyUsage();
        newDailyUsage.count = 1;
        await AsyncStorage.setItem(DAILY_USAGE_KEY, JSON.stringify(newDailyUsage));
      }

      // Increment hourly usage
      const hourlyUsage = await this.getHourlyUsage();
      if (hourlyUsage && hourlyUsage.hour === this.getCurrentHour()) {
        hourlyUsage.count += 1;
        await AsyncStorage.setItem(HOURLY_USAGE_KEY, JSON.stringify(hourlyUsage));
      } else {
        await this.resetHourlyUsage();
        const newHourlyUsage = await this.getHourlyUsage();
        newHourlyUsage.count = 1;
        await AsyncStorage.setItem(HOURLY_USAGE_KEY, JSON.stringify(newHourlyUsage));
      }

      console.log('Usage incremented - Daily:', dailyUsage?.count || 1, 'Hourly:', hourlyUsage?.count || 1);
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  }

  // Get usage statistics
  async getUsageStats() {
    try {
      await this.initialize();

      const dailyUsage = await this.getDailyUsage();
      const hourlyUsage = await this.getHourlyUsage();

      return {
        daily: {
          used: dailyUsage?.count || 0,
          limit: DAILY_LIMIT,
          remaining: Math.max(0, DAILY_LIMIT - (dailyUsage?.count || 0)),
          resetDate: dailyUsage?.date || this.getCurrentDate()
        },
        hourly: {
          used: hourlyUsage?.count || 0,
          limit: HOURLY_LIMIT,
          remaining: Math.max(0, HOURLY_LIMIT - (hourlyUsage?.count || 0)),
          resetHour: hourlyUsage?.hour || this.getCurrentHour()
        }
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return {
        daily: { used: 0, limit: DAILY_LIMIT, remaining: DAILY_LIMIT, resetDate: this.getCurrentDate() },
        hourly: { used: 0, limit: HOURLY_LIMIT, remaining: HOURLY_LIMIT, resetHour: this.getCurrentHour() }
      };
    }
  }

  // Check if user can use AI feature
  async canUseAI() {
    const [dailyCheck, hourlyCheck] = await Promise.all([
      this.checkDailyLimit(),
      this.checkHourlyLimit()
    ]);

    return {
      allowed: dailyCheck.allowed && hourlyCheck.allowed,
      daily: dailyCheck,
      hourly: hourlyCheck
    };
  }

  // Reset all usage (for testing or admin purposes)
  async resetAllUsage() {
    try {
      await AsyncStorage.multiRemove([DAILY_USAGE_KEY, HOURLY_USAGE_KEY]);
      await this.initialize();
      console.log('All usage reset');
    } catch (error) {
      console.error('Error resetting all usage:', error);
    }
  }
}

// Export singleton instance
export const usageTracker = new UsageTracker();

// Export helper functions
export const checkUsageLimit = () => usageTracker.canUseAI();
export const incrementUsage = () => usageTracker.incrementUsage();
export const getUsageStats = () => usageTracker.getUsageStats();
export const resetUsage = () => usageTracker.resetAllUsage(); 