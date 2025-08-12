// utils/dailyTasks.js
import { supabase } from '../lib/supabase';

// getTodayRange: creates an ISO day window [start, end) for filtering by created_at
// If you changed timezone handling, you might prefer using the DB's ::date filter instead.
const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0); // start of day
  const end = new Date(start);
  end.setDate(start.getDate() + 1); // next day start
  return {
    dateStr: now.toISOString().split('T')[0],      // "YYYY-MM-DD"
    startIso: start.toISOString(),                 // inclusive lower bound
    endIso: end.toISOString(),                     // exclusive upper bound
  };
};

// fetchDailyTasksStatus: reads "today" status for each task from your production DB
// - We only read the minimum columns needed (faster, less data).
// - All queries are scoped by user id to respect RLS.
// If you changed table/column names, update the SELECTs and .eq(...) keys.
export async function fetchDailyTasksStatus(userId, {
  proteinTarget = 150,       // fallback protein goal in grams (tune later)
  fallbackWaterLiters = 2.0  // fallback if no goal saved in row
} = {}) {
  if (!userId) throw new Error('fetchDailyTasksStatus: userId is required');

  const { dateStr, startIso, endIso } = getTodayRange();

  // 1) WATER: water_tracking has glasses (250ml each) and a goal (liters in your app state).
  // Advanced bit: we convert liters → glasses by *4 to compare same unit (glasses vs glasses).
  const { data: waterRow, error: waterErr } = await supabase
    .from('water_tracking')
    .select('glasses, goal')
    .eq('profile_id', userId)
    .eq('date', dateStr)
    .maybeSingle();
  if (waterErr && waterErr.code !== 'PGRST116') console.warn('water err', waterErr);

  const glasses = waterRow?.glasses ?? 0;                 // number
  const waterGoalLiters = waterRow?.goal ?? fallbackWaterLiters; // number (liters)
  const waterGoalGlasses = Math.round(waterGoalLiters * 4);
  const waterCompleted = glasses >= waterGoalGlasses;

  // 2) PROTEIN: daily_macronutrients stores per-day grams.
  const { data: macroRow, error: macroErr } = await supabase
    .from('daily_macronutrients')
    .select('protein')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .maybeSingle();
  if (macroErr && macroErr.code !== 'PGRST116') console.warn('macros err', macroErr);

  const protein = macroRow?.protein ?? 0;     // grams
  const proteinCompleted = protein >= proteinTarget;

  // 3) WORKOUT + 4) MENTAL: flags live in user_stats for today
  const { data: statsRow, error: statsErr } = await supabase
    .from('user_stats')
    .select('today_workout_completed, today_mental_completed')
    .eq('profile_id', userId)
    .maybeSingle();
  if (statsErr && statsErr.code !== 'PGRST116') console.warn('stats err', statsErr);

  const workoutCompleted = !!statsRow?.today_workout_completed;
  const mentalCompleted = !!statsRow?.today_mental_completed;

  // 5) MEAL LOGGED: fast existence check in meal_consumptions for today
  const { data: mealRows, error: mealErr } = await supabase
    .from('meal_consumptions')
    .select('id', { count: 'exact', head: true }) // head=true gets count without fetching rows
    .eq('user_id', userId)
    .gte('created_at', startIso)
    .lt('created_at', endIso);
  if (mealErr) console.warn('meal err', mealErr);

  const mealLogged = (mealRows?.length ?? 0) > 0; // head:true returns empty array, but count is tracked server-side

  // Return a normalized task list for the UI to render later
  return [
    { id: 'water',   title: 'Hit water goal',     completed: waterCompleted, meta: { glasses, goalGlasses: waterGoalGlasses } },
    { id: 'protein', title: 'Hit protein target', completed: proteinCompleted, meta: { protein, target: proteinTarget } },
    { id: 'workout', title: 'Do a workout',       completed: workoutCompleted },
    { id: 'mental',  title: 'Do a mental session',completed: mentalCompleted },
    { id: 'meal',    title: 'Log a meal',         completed: mealLogged },
  ];
}
