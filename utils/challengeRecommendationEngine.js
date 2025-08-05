import { supabase } from '../lib/supabase';

// Challenge Recommendation Engine
class ChallengeRecommendationEngine {
  constructor() {
    this.userInterests = new Map();
    this.userBehavior = new Map();
    this.challengeScores = new Map();
  }

  /**
   * Analyze user interests based on their activity history
   * This creates a profile of what types of challenges they'd likely enjoy
   */
  async analyzeUserInterests(userId) {
    console.log('Analyzing user interests for:', userId);
    
    try {
      // Get user's workout history
      const { data: workouts } = await supabase
        .from('user_workout_logs')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(50);

      // Get user's mental session history
      const { data: mentalSessions } = await supabase
        .from('mental_session_logs')
        .select('*')
        .eq('profile_id', userId)
        .order('completed_at', { ascending: false })
        .limit(50);

      // Get user's run history
      const { data: runs } = await supabase
        .from('runs')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })
        .limit(50);

      // Get user's PR history
      const { data: prs } = await supabase
        .from('personal_records')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Calculate interest scores
      const interests = this.calculateInterestScores({
        workouts: workouts || [],
        mentalSessions: mentalSessions || [],
        runs: runs || [],
        prs: prs || []
      });

      this.userInterests.set(userId, interests);
      return interests;
    } catch (error) {
      console.error('Error analyzing user interests:', error);
      return this.getDefaultInterests();
    }
  }

  /**
   * Calculate interest scores based on user activity
   */
  calculateInterestScores(activities) {
    const interests = {
      workout: 0,
      mental: 0,
      run: 0,
      nutrition: 0,
      sleep: 0,
      social: 0,
      learning: 0,
      creativity: 0
    };

    // Analyze workout patterns
    if (activities.workouts.length > 0) {
      interests.workout = Math.min(100, activities.workouts.length * 10);
      
      // Check for strength vs cardio preference
      const strengthWorkouts = activities.workouts.filter(w => 
        w.description?.toLowerCase().includes('strength') ||
        w.description?.toLowerCase().includes('weight') ||
        w.description?.toLowerCase().includes('muscle')
      );
      
      if (strengthWorkouts.length > activities.workouts.length * 0.6) {
        interests.workout += 20; // Bonus for strength focus
      }
    }

    // Analyze mental session patterns
    if (activities.mentalSessions.length > 0) {
      interests.mental = Math.min(100, activities.mentalSessions.length * 15);
      
      // Check for meditation vs other mental activities
      const meditationSessions = activities.mentalSessions.filter(m => 
        m.session_type?.toLowerCase().includes('meditation') ||
        m.session_type?.toLowerCase().includes('breathing')
      );
      
      if (meditationSessions.length > activities.mentalSessions.length * 0.5) {
        interests.mental += 25; // Bonus for meditation focus
      }
    }

    // Analyze running patterns
    if (activities.runs.length > 0) {
      interests.run = Math.min(100, activities.runs.length * 12);
      
      // Check for distance vs speed preference
      const avgDistance = activities.runs.reduce((sum, run) => sum + run.distance_meters, 0) / activities.runs.length;
      if (avgDistance > 5000) { // 5km average
        interests.run += 15; // Bonus for distance running
      }
    }

    // Analyze PR patterns for nutrition interest
    if (activities.prs.length > 0) {
      interests.nutrition = Math.min(80, activities.prs.length * 8);
    }

    // Social interest based on friend count and group participation
    // This would need to be calculated separately

    return interests;
  }

  /**
   * Get default interests for new users
   */
  getDefaultInterests() {
    return {
      workout: 50,
      mental: 30,
      run: 40,
      nutrition: 25,
      sleep: 20,
      social: 35,
      learning: 30,
      creativity: 25
    };
  }

  /**
   * Calculate challenge recommendation scores
   */
  async calculateChallengeScores(challenges, userInterests) {
    const scores = [];

    for (const challenge of challenges) {
      let score = 0;
      
      // Base score from user interest in challenge type
      const interestScore = userInterests[challenge.type] || 0;
      score += interestScore * 0.4; // 40% weight from interest
      
      // Difficulty preference (users tend to prefer challenges matching their skill level)
      const difficultyBonus = this.calculateDifficultyBonus(challenge.difficulty, userInterests);
      score += difficultyBonus * 0.2; // 20% weight from difficulty
      
      // Time-based scoring (prefer challenges ending soon for urgency)
      const timeBonus = this.calculateTimeBonus(challenge.end_date);
      score += timeBonus * 0.15; // 15% weight from time
      
      // Social scoring (prefer challenges with friends)
      const socialBonus = await this.calculateSocialBonus(challenge.id, userInterests);
      score += socialBonus * 0.15; // 15% weight from social
      
      // Reward scoring (prefer higher rewards)
      const rewardBonus = (challenge.reward_points / 100) * 10; // Normalize to 0-10
      score += rewardBonus * 0.1; // 10% weight from rewards
      
      scores.push({
        challenge,
        score: Math.round(score),
        breakdown: {
          interest: interestScore,
          difficulty: difficultyBonus,
          time: timeBonus,
          social: socialBonus,
          reward: rewardBonus
        }
      });
    }

    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate difficulty bonus based on user's activity level
   */
  calculateDifficultyBonus(difficulty, userInterests) {
    const totalActivity = Object.values(userInterests).reduce((sum, score) => sum + score, 0);
    const avgActivity = totalActivity / Object.keys(userInterests).length;
    
    const difficultyScores = {
      'easy': 30,
      'medium': 50,
      'hard': 70,
      'expert': 90
    };
    
    const userLevel = avgActivity;
    const challengeLevel = difficultyScores[difficulty] || 50;
    
    // Prefer challenges slightly above user's current level (optimal challenge)
    const optimalGap = 10;
    const gap = Math.abs(userLevel - challengeLevel);
    
    if (gap <= optimalGap) {
      return 20; // Perfect match
    } else if (gap <= optimalGap * 2) {
      return 10; // Good match
    } else {
      return -10; // Too easy or too hard
    }
  }

  /**
   * Calculate time bonus (urgency factor)
   */
  calculateTimeBonus(endDate) {
    const now = new Date();
    const end = new Date(endDate);
    const daysLeft = (end - now) / (1000 * 60 * 60 * 24);
    
    if (daysLeft <= 0) return -50; // Ended
    if (daysLeft <= 1) return 30; // Ending soon
    if (daysLeft <= 3) return 20; // Ending this week
    if (daysLeft <= 7) return 10; // Ending next week
    if (daysLeft <= 14) return 5; // Ending in 2 weeks
    return 0; // Long time left
  }

  /**
   * Calculate social bonus (friends participating)
   */
  async calculateSocialBonus(challengeId, userInterests) {
    try {
      // Get friends participating in this challenge
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select('user_id')
        .eq('challenge_id', challengeId);

      if (!participants || participants.length === 0) return 0;
      
      // For now, return a simple bonus based on participant count
      // In a real implementation, you'd check if the user's friends are participating
      return Math.min(participants.length * 5, 25);
    } catch (error) {
      console.error('Error calculating social bonus:', error);
      return 0;
    }
  }

  /**
   * Get personalized challenge recommendations
   */
  async getRecommendations(userId, limit = 10) {
    console.log('Getting recommendations for user:', userId);
    
    try {
      // Analyze user interests
      const userInterests = await this.analyzeUserInterests(userId);
      
      // Get all active challenges
      const { data: challenges } = await supabase
        .from('challenges')
        .select('*')
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (!challenges || challenges.length === 0) {
        return [];
      }

      // Calculate scores for each challenge
      const scoredChallenges = await this.calculateChallengeScores(challenges, userInterests);
      
      // Get participant counts for each challenge
      const challengesWithParticipants = await Promise.all(
        scoredChallenges.slice(0, limit).map(async (scoredChallenge) => {
          try {
            const { data: participants } = await supabase
              .from('challenge_participants')
              .select('user_id')
              .eq('challenge_id', scoredChallenge.challenge.id);
            
            return {
              ...scoredChallenge,
              participantCount: participants?.length || 0
            };
          } catch (error) {
            console.error('Error getting participants for challenge:', scoredChallenge.challenge.id, error);
            return {
              ...scoredChallenge,
              participantCount: 0
            };
          }
        })
      );

      return challengesWithParticipants;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  /**
   * Get trending challenges (most popular)
   */
  async getTrendingChallenges(limit = 5) {
    try {
      const { data: challenges } = await supabase
        .from('challenges')
        .select(`
          *,
          participants:challenge_participants(count)
        `)
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (!challenges) return [];

      // Sort by participant count
      const trending = challenges
        .map(challenge => ({
          ...challenge,
          participantCount: challenge.participants?.[0]?.count || 0
        }))
        .sort((a, b) => b.participantCount - a.participantCount)
        .slice(0, limit);

      return trending;
    } catch (error) {
      console.error('Error getting trending challenges:', error);
      return [];
    }
  }

  /**
   * Get challenges by type
   */
  async getChallengesByType(type, limit = 10) {
    try {
      const { data: challenges } = await supabase
        .from('challenges')
        .select(`
          *,
          participants:challenge_participants(count)
        `)
        .eq('type', type)
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!challenges) return [];

      return challenges.map(challenge => ({
        ...challenge,
        participantCount: challenge.participants?.[0]?.count || 0
      }));
    } catch (error) {
      console.error('Error getting challenges by type:', error);
      return [];
    }
  }

  /**
   * Get user's active challenges
   */
  async getUserChallenges(userId) {
    try {
      const { data: userChallenges } = await supabase
        .from('challenge_participants')
        .select(`
          *,
          challenge:challenges(*)
        `)
        .eq('user_id', userId)
        .gte('challenge.end_date', new Date().toISOString());

      if (!userChallenges) return [];

      return userChallenges.map(uc => ({
        ...uc.challenge,
        userProgress: uc.progress,
        joinedAt: uc.joined_at
      }));
    } catch (error) {
      console.error('Error getting user challenges:', error);
      return [];
    }
  }

  /**
   * Update user's challenge progress
   */
  async updateProgress(userId, challengeId, progress) {
    try {
      const { error } = await supabase
        .from('challenge_participants')
        .update({ progress })
        .eq('user_id', userId)
        .eq('challenge_id', challengeId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating progress:', error);
      return false;
    }
  }
}

// Export singleton instance
export const challengeEngine = new ChallengeRecommendationEngine();

// Export helper functions
export const getRecommendations = (userId, limit) => challengeEngine.getRecommendations(userId, limit);
export const getTrendingChallenges = (limit) => challengeEngine.getTrendingChallenges(limit);
export const getChallengesByType = (type, limit) => challengeEngine.getChallengesByType(type, limit);
export const getUserChallenges = (userId) => challengeEngine.getUserChallenges(userId);
export const updateProgress = (userId, challengeId, progress) => challengeEngine.updateProgress(userId, challengeId, progress); 