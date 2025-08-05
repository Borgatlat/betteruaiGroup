// Simple test to verify challenge system components
import { challengeEngine } from './challengeRecommendationEngine';

// Test challenge recommendation engine
export const testChallengeEngine = async () => {
  try {
    console.log('Testing challenge recommendation engine...');
    
    // Test default interests
    const defaultInterests = challengeEngine.getDefaultInterests();
    console.log('Default interests:', defaultInterests);
    
    // Test interest calculation
    const testActivities = {
      workouts: [
        { description: 'Strength training', completed_at: new Date() },
        { description: 'Cardio workout', completed_at: new Date() }
      ],
      mentalSessions: [
        { session_type: 'meditation', completed_at: new Date() }
      ],
      runs: [
        { distance_meters: 5000, start_time: new Date() }
      ],
      prs: [
        { exercise: 'bench press', created_at: new Date() }
      ]
    };
    
    const interests = challengeEngine.calculateInterestScores(testActivities);
    console.log('Calculated interests:', interests);
    
    // Test difficulty bonus calculation
    const difficultyBonus = challengeEngine.calculateDifficultyBonus('medium', interests);
    console.log('Difficulty bonus for medium:', difficultyBonus);
    
    // Test time bonus calculation
    const timeBonus = challengeEngine.calculateTimeBonus(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days from now
    console.log('Time bonus for 7 days:', timeBonus);
    
    console.log('Challenge engine tests passed!');
    return true;
  } catch (error) {
    console.error('Challenge engine test failed:', error);
    return false;
  }
};

// Test challenge card props
export const testChallengeCardProps = () => {
  const testChallenge = {
    id: 'test-challenge-id',
    title: 'Test Challenge',
    description: 'This is a test challenge',
    type: 'workout',
    difficulty: 'medium',
    target: 10,
    unit: 'workouts',
    reward_points: 200,
    end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    created_at: new Date().toISOString()
  };
  
  const testUserProgress = {
    current: 5,
    target: 10
  };
  
  const testParticipants = [
    {
      id: 'user1',
      username: 'testuser1',
      avatar_url: null,
      is_premium: false
    }
  ];
  
  return {
    challenge: testChallenge,
    isJoined: false,
    userProgress: testUserProgress,
    participants: testParticipants,
    showProgress: true
  };
};

// Test challenge section props
export const testChallengeSectionProps = () => {
  return {
    onViewChallenge: (challenge) => {
      console.log('View challenge:', challenge);
    }
  };
}; 