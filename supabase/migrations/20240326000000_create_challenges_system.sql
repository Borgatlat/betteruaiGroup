-- Create challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('workout', 'mental', 'run', 'nutrition', 'sleep', 'social', 'learning', 'creativity')),
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  target INTEGER NOT NULL,
  unit VARCHAR(50) NOT NULL,
  reward_points INTEGER DEFAULT 100,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT true,
  max_participants INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create challenge participants table
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(challenge_id, user_id)
);

-- Create challenge progress logs table
CREATE TABLE IF NOT EXISTS challenge_progress_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL,
  activity_type VARCHAR(50),
  activity_id UUID,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_challenges_type ON challenges(type);
CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX IF NOT EXISTS idx_challenges_end_date ON challenges(end_date);
CREATE INDEX IF NOT EXISTS idx_challenges_created_by ON challenges(created_by);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge_id ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_id ON challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_logs_challenge_user ON challenge_progress_logs(challenge_id, user_id);

-- Enable RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for challenges
CREATE POLICY "Challenges are viewable by everyone" ON challenges
  FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create challenges" ON challenges
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own challenges" ON challenges
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own challenges" ON challenges
  FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for challenge_participants
CREATE POLICY "Users can view challenge participants" ON challenge_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join challenges" ON challenge_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON challenge_participants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave challenges" ON challenge_participants
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for challenge_progress_logs
CREATE POLICY "Users can view their own progress logs" ON challenge_progress_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress logs" ON challenge_progress_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to update challenge progress
CREATE OR REPLACE FUNCTION update_challenge_progress(
  p_challenge_id UUID,
  p_user_id UUID,
  p_progress INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update participant progress
  UPDATE challenge_participants 
  SET progress = p_progress,
      completed_at = CASE WHEN p_progress >= (SELECT target FROM challenges WHERE id = p_challenge_id) THEN NOW() ELSE NULL END
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id;
  
  -- Log progress
  INSERT INTO challenge_progress_logs (challenge_id, user_id, progress)
  VALUES (p_challenge_id, p_user_id, p_progress);
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get challenge leaderboard
CREATE OR REPLACE FUNCTION get_challenge_leaderboard(p_challenge_id UUID)
RETURNS TABLE (
  user_id UUID,
  username VARCHAR,
  avatar_url TEXT,
  is_premium BOOLEAN,
  progress INTEGER,
  joined_at TIMESTAMP WITH TIME ZONE,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.user_id,
    p.username,
    p.avatar_url,
    p.is_premium,
    cp.progress,
    cp.joined_at,
    ROW_NUMBER() OVER (ORDER BY cp.progress DESC, cp.joined_at ASC) as rank
  FROM challenge_participants cp
  JOIN profiles p ON cp.user_id = p.id
  WHERE cp.challenge_id = p_challenge_id
  ORDER BY cp.progress DESC, cp.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's active challenges
CREATE OR REPLACE FUNCTION get_user_active_challenges(p_user_id UUID)
RETURNS TABLE (
  challenge_id UUID,
  title VARCHAR,
  description TEXT,
  type VARCHAR,
  difficulty VARCHAR,
  target INTEGER,
  unit VARCHAR,
  reward_points INTEGER,
  end_date TIMESTAMP WITH TIME ZONE,
  progress INTEGER,
  joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.description,
    c.type,
    c.difficulty,
    c.target,
    c.unit,
    c.reward_points,
    c.end_date,
    cp.progress,
    cp.joined_at
  FROM challenge_participants cp
  JOIN challenges c ON cp.challenge_id = c.id
  WHERE cp.user_id = p_user_id
    AND c.end_date > NOW()
  ORDER BY cp.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some sample challenges
INSERT INTO challenges (title, description, type, difficulty, target, unit, reward_points, end_date) VALUES
('30-Day Workout Streak', 'Complete a workout every day for 30 days', 'workout', 'medium', 30, 'workouts', 500, NOW() + INTERVAL '30 days'),
('Mindful Meditation', 'Practice meditation for 10 minutes daily', 'mental', 'easy', 21, 'sessions', 300, NOW() + INTERVAL '21 days'),
('5K Running Challenge', 'Run a total of 5 kilometers', 'run', 'medium', 5000, 'meters', 400, NOW() + INTERVAL '14 days'),
('Protein Power', 'Consume 150g of protein daily', 'nutrition', 'hard', 150, 'grams', 600, NOW() + INTERVAL '7 days'),
('Sleep Well', 'Get 8 hours of sleep for a week', 'sleep', 'easy', 7, 'nights', 200, NOW() + INTERVAL '7 days'),
('Social Butterfly', 'Connect with 10 new friends', 'social', 'medium', 10, 'friends', 350, NOW() + INTERVAL '30 days'),
('Learn Something New', 'Spend 30 minutes learning daily', 'learning', 'medium', 30, 'minutes', 250, NOW() + INTERVAL '30 days'),
('Creative Expression', 'Create something artistic daily', 'creativity', 'easy', 7, 'creations', 150, NOW() + INTERVAL '7 days'),
('Strength Builder', 'Complete 100 push-ups', 'workout', 'hard', 100, 'push-ups', 450, NOW() + INTERVAL '10 days'),
('Calm Mind', 'Practice breathing exercises daily', 'mental', 'easy', 14, 'sessions', 200, NOW() + INTERVAL '14 days'); 