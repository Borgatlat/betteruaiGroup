import { supabase } from '../lib/supabase';

// Challenge Recommendation Engine
class ChallengeRecommendationEngine {
  constructor() {
    this.userInterests = new Map();
    this.userBehavior = new Map();
    this.challengeScores = new Map();
    this.socialGraph = new Map();
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

      // Get user's challenge participation history
      const { data: challengeHistory } = await supabase
        .from('challenge_participants')
        .select('*, challenges(*)')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })
        .limit(50);

      // Calculate interest scores
      const interests = this.calculateInterestScores({
        workouts: workouts || [],
        mentalSessions: mentalSessions || [],
        runs: runs || [],
        prs: prs || [],
        challengeHistory: challengeHistory || []
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
        m.description?.toLowerCase().includes('meditation')
      );
      
      if (meditationSessions.length > activities.mentalSessions.length * 0.5) {
        interests.mental += 15; // Bonus for meditation focus
      }
    }

    // Analyze running patterns
    if (activities.runs.length > 0) {
      interests.run = Math.min(100, activities.runs.length * 12);
      
      // Check for distance vs speed preference
      const avgDistance = activities.runs.reduce((sum, r) => sum + (r.distance || 0), 0) / activities.runs.length;
      if (avgDistance > 5) {
        interests.run += 10; // Bonus for distance runners
      }
    }

    // Analyze challenge participation patterns
    if (activities.challengeHistory.length > 0) {
      // Calculate success rate
      const completedChallenges = activities.challengeHistory.filter(c => c.completed);
      const successRate = completedChallenges.length / activities.challengeHistory.length;
      
      // Bonus for high success rate
      if (successRate > 0.7) {
        interests.social += 20; // High engagement with challenges
      }
      
      // Analyze challenge type preferences
      const challengeTypes = activities.challengeHistory.map(c => c.challenges?.type).filter(Boolean);
      const typeCounts = challengeTypes.reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      // Add bonuses for preferred challenge types
      Object.entries(typeCounts).forEach(([type, count]) => {
        if (interests[type] !== undefined) {
          interests[type] += count * 5;
        }
      });
    }

    // Analyze PR patterns for learning interest
    if (activities.prs.length > 0) {
      interests.learning = Math.min(100, activities.prs.length * 8);
    }

    // Normalize all scores to 0-100 range
    Object.keys(interests).forEach(key => {
      interests[key] = Math.min(100, Math.max(0, interests[key]));
    });

    return interests;
  }

  /**
   * Get default interests for new users
   */
  getDefaultInterests() {
    return {
      workout: 30,
      mental: 20,
      run: 25,
      nutrition: 15,
      sleep: 10,
      social: 40,
      learning: 20,
      creativity: 15
    };
  }

  /**
   * Calculate challenge scores based on user interests and social factors
   */
  async calculateChallengeScores(challenges, userInterests) {
    const scoredChallenges = [];

    for (const challenge of challenges) {
      let score = 0;

      // Base score from user interests
      const interestScore = userInterests[challenge.type] || 0;
      score += interestScore * 0.4; // 40% weight for interest match

      // Difficulty bonus
      score += this.calculateDifficultyBonus(challenge.difficulty, userInterests);

      // Time urgency bonus
      score += this.calculateTimeBonus(challenge.end_date);

      // Social bonus (friends participating, popularity)
      const socialBonus = await this.calculateSocialBonus(challenge.id, userInterests);
      score += socialBonus;

      // Reward points bonus
      score += (challenge.reward_points || 0) * 0.1;

      // Completion rate bonus (if available)
      if (challenge.completion_rate) {
        score += challenge.completion_rate * 0.2;
      }

      scoredChallenges.push({
        ...challenge,
        score: Math.round(score)
      });
    }

    // Sort by score (highest first)
    return scoredChallenges.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate difficulty bonus based on user's activity level
   */
  calculateDifficultyBonus(difficulty, userInterests) {
    const difficultyScores = {
      'easy': 10,
      'medium': 20,
      'hard': 30,
      'expert': 40
    };

    const baseScore = difficultyScores[difficulty] || 15;
    
    // Adjust based on user's activity level
    const userActivityLevel = (userInterests.workout + userInterests.run + userInterests.mental) / 3;
    
    if (userActivityLevel > 70) {
      // High activity user - prefer harder challenges
      if (difficulty === 'hard' || difficulty === 'expert') {
        return baseScore + 20;
      }
    } else if (userActivityLevel < 30) {
      // Low activity user - prefer easier challenges
      if (difficulty === 'easy' || difficulty === 'medium') {
        return baseScore + 15;
      }
    }

    return baseScore;
  }

  /**
   * Calculate time urgency bonus
   */
  calculateTimeBonus(endDate) {
    const now = new Date();
    const end = new Date(endDate);
    const daysLeft = (end - now) / (1000 * 60 * 60 * 24);

    if (daysLeft <= 0) return -50; // Expired challenges
    if (daysLeft <= 1) return 30; // Urgent - ending soon
    if (daysLeft <= 3) return 20; // Soon
    if (daysLeft <= 7) return 10; // This week
    return 0; // No urgency bonus
  }

  /**
   * Calculate social bonus based on friends and popularity
   */
  async calculateSocialBonus(challengeId, userInterests) {
    try {
      // Get participants for this challenge
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select('user_id')
        .eq('challenge_id', challengeId);

      const participantCount = participants?.length || 0;
      
      // Base social score from participant count
      let socialScore = Math.min(30, participantCount * 2);

      // Bonus for popular challenges
      if (participantCount > 50) {
        socialScore += 20;
      } else if (participantCount > 20) {
        socialScore += 10;
      }

      // Check if user's friends are participating
      const { data: userFriends } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', userInterests.userId)
        .eq('status', 'accepted');

      if (userFriends && userFriends.length > 0) {
        const friendIds = userFriends.map(f => f.friend_id);
        const friendsParticipating = participants?.filter(p => 
          friendIds.includes(p.user_id)
        ).length || 0;

        // Bonus for friends participating
        socialScore += friendsParticipating * 15;
      }

      return socialScore;
    } catch (error) {
      console.error('Error calculating social bonus:', error);
      return 0;
    }
  }

  /**
   * Get personalized challenge recommendations
   */
  async getRecommendations(userId, limit = 10) {
    try {
      // Get user interests
      const userInterests = await this.analyzeUserInterests(userId);
      userInterests.userId = userId; // Add userId for social calculations

      // Get all active challenges
      const { data: challenges } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (!challenges || challenges.length === 0) {
        return [];
      }

      // Calculate scores for each challenge
      const scoredChallenges = await this.calculateChallengeScores(challenges, userInterests);

      // Filter out challenges user is already participating in
      const { data: userParticipations } = await supabase
        .from('challenge_participants')
        .select('challenge_id')
        .eq('user_id', userId);

      const userChallengeIds = userParticipations?.map(p => p.challenge_id) || [];
      const availableChallenges = scoredChallenges.filter(c => 
        !userChallengeIds.includes(c.id)
      );

      return availableChallenges.slice(0, limit);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  /**
   * Get trending challenges based on participation
   */
  async getTrendingChallenges(limit = 5) {
    try {
      const { data: challenges } = await supabase
        .from('challenges')
        .select(`
          *,
          challenge_participants(count)
        `)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('challenge_participants(count)', { ascending: false })
        .limit(limit);

      return challenges || [];
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
        .select('*')
        .eq('is_active', true)
        .eq('type', type)
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      return challenges || [];
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
      const { data: participations } = await supabase
        .from('challenge_participants')
        .select(`
          *,
          challenges(*)
        `)
        .eq('user_id', userId)
        .eq('completed', false)
        .order('joined_at', { ascending: false });

      return participations?.map(p => ({
        ...p.challenges,
        userProgress: p.progress,
        joinedAt: p.joined_at
      })) || [];
    } catch (error) {
      console.error('Error getting user challenges:', error);
      return [];
    }
  }

  /**
   * Update user's progress in a challenge
   */
  async updateProgress(userId, challengeId, progress) {
    try {
      const { error } = await supabase
        .from('challenge_participants')
        .update({ 
          progress: progress,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('challenge_id', challengeId);

      if (error) throw error;

      // Log progress update
      await supabase
        .from('challenge_progress_logs')
        .insert({
          user_id: userId,
          challenge_id: challengeId,
          progress: progress,
          logged_at: new Date().toISOString()
        });

      return true;
    } catch (error) {
      console.error('Error updating challenge progress:', error);
      return false;
    }
  }

  /**
   * Get challenge leaderboard
   */
  async getChallengeLeaderboard(challengeId, limit = 20) {
    try {
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select(`
          progress,
          joined_at,
          profiles:user_id (
            id,
            username,
            avatar_url,
            is_premium
          )
        `)
        .eq('challenge_id', challengeId)
        .order('progress', { ascending: false })
        .limit(limit);

      return participants?.map((p, index) => ({
        rank: index + 1,
        user: p.profiles,
        progress: p.progress,
        joinedAt: p.joined_at
      })) || [];
    } catch (error) {
      console.error('Error getting challenge leaderboard:', error);
      return [];
    }
  }
}

// Create singleton instance
const challengeEngine = new ChallengeRecommendationEngine();

// Export functions
export const getRecommendations = (userId, limit) => challengeEngine.getRecommendations(userId, limit);
export const getTrendingChallenges = (limit) => challengeEngine.getTrendingChallenges(limit);
export const getChallengesByType = (type, limit) => challengeEngine.getChallengesByType(type, limit);
export const getUserChallenges = (userId) => challengeEngine.getUserChallenges(userId);
export const updateProgress = (userId, challengeId, progress) => challengeEngine.updateProgress(userId, challengeId, progress);
export const getChallengeLeaderboard = (challengeId, limit) => challengeEngine.getChallengeLeaderboard(challengeId, limit); 