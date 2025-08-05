-- Create mental_session_logs table for tracking mental wellness sessions
CREATE TABLE mental_session_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('meditation', 'breathing', 'stress-relief')),
  duration INTEGER NOT NULL CHECK (duration > 0), -- Duration in minutes
  calmness_level INTEGER CHECK (calmness_level >= 1 AND calmness_level <= 10),
  notes TEXT,
  photo_url TEXT, -- URL to session photo if uploaded
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mood_tracking table for daily mood logging
CREATE TABLE mood_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL CHECK (mood IN ('great', 'good', 'okay', 'bad', 'awful')),
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for data protection
ALTER TABLE mental_session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for mental_session_logs
CREATE POLICY "Users can only access their own mental session logs" ON mental_session_logs
  FOR ALL USING (auth.uid() = profile_id);

-- Create RLS policies for mood_tracking  
CREATE POLICY "Users can only access their own mood tracking" ON mood_tracking
  FOR ALL USING (auth.uid() = profile_id);

-- Create indexes for better query performance
CREATE INDEX idx_mental_session_logs_profile_id_date ON mental_session_logs(profile_id, completed_at);
CREATE INDEX idx_mood_tracking_profile_id_date ON mood_tracking(profile_id, date);

-- Add comments for documentation
COMMENT ON TABLE mental_session_logs IS 'Stores completed mental wellness sessions (meditation, breathing exercises, etc.)';
COMMENT ON TABLE mood_tracking IS 'Stores daily mood tracking entries for users';
COMMENT ON COLUMN mental_session_logs.session_type IS 'Type of mental wellness session: meditation, breathing, or stress-relief';
COMMENT ON COLUMN mental_session_logs.calmness_level IS 'User-reported calmness level from 1-10 after session';
COMMENT ON COLUMN mood_tracking.mood IS 'User mood level: great, good, okay, bad, or awful';