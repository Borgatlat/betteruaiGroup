// utils/dailyTasksEngine.js

// Task definitions: base weight = how important this task is by default.
// cooldownHours prevents spamming the same suggestion right after completion.
const TASK_DEFS = {
  water:   { title: 'Hit water goal',     baseWeight: 1.0, cooldownHours: 3 },
  protein: { title: 'Hit protein target', baseWeight: 1.0, cooldownHours: 3 },
  workout: { title: 'Do a workout',       baseWeight: 1.2, cooldownHours: 6 },
  mental:  { title: 'Do a mental session',baseWeight: 1.1, cooldownHours: 6 },
  meal:    { title: 'Log a meal',         baseWeight: 0.9, cooldownHours: 2 },
};

// getProgress: returns number from 0..1 for tasks with numeric goals.
// If you changed how water is stored (e.g., ml instead of glasses), update here.
function getProgress(type, statuses) {
  switch (type) {
    case 'water': {
      const g = statuses.water?.meta?.goalGlasses || 0;
      const v = statuses.water?.meta?.glasses || 0;
      return g > 0 ? Math.min(1, v / g) : 0;
    }
    case 'protein': {
      const g = statuses.protein?.meta?.target || 0;
      const v = statuses.protein?.meta?.protein || 0;
      return g > 0 ? Math.min(1, v / g) : 0;
    }
    default:
      // Binary tasks: 1 if completed, else 0
      return statuses[type]?.completed ? 1 : 0;
  }
}

// computeGoalGap: how far from done (0..1). Bigger gap = more urgent.
function computeGoalGap(type, statuses) {
  const progress = getProgress(type, statuses);
  return 1 - progress; // 1 means not started; 0 means completed
}

// computeHabitNeed: boosts things the user tends to skip.
// habits[type] can be 0..1 adherence; if not provided, we assume neutral 0.5.
function computeHabitNeed(type, habits = {}) {
  const adherence = typeof habits[type] === 'number' ? habits[type] : 0.5;
  return 1 - adherence; // lower adherence => higher need
}

// computeInterestBoost: small bump if user likes this type.
function computeInterestBoost(type, interests = []) {
  return interests.includes(type) ? 0.2 : 0; // tweak this bump if too strong/weak
}

// cooldownPenalty: if last done recently, down-rank to diversify.
// history[type]?.lastCompletedAt should be an ISO string; optional.
function cooldownPenalty(type, history = {}) {
  try {
    const last = history[type]?.lastCompletedAt;
    if (!last) return 0;
    const hoursAgo = (Date.now() - new Date(last).getTime()) / 36e5;
    const cooldown = TASK_DEFS[type]?.cooldownHours ?? 0;
    if (hoursAgo >= cooldown) return 0;
    // Penalty fades linearly to 0 as we approach cooldown window end.
    return (cooldown - hoursAgo) / Math.max(1, cooldown);
  } catch {
    return 0;
  }
}

// shownPenalty: down-rank tasks that we already showed recently to avoid spam.
function shownPenalty(type, history = {}) {
  try {
    const last = history[type]?.lastShownAt;
    if (!last) return 0;
    const hoursAgo = (Date.now() - new Date(last).getTime()) / 36e5;
    // Light penalty if shown within last hour.
    return hoursAgo < 1 ? 0.2 : 0;
  } catch {
    return 0;
  }
}

// scoreTask: main formula; combines urgency (gap), habits, interests,
// minus penalties (cooldown + recently shown).
// If you change weights below, you change the "personality" of the recommendations.
function scoreTask(type, { statuses, habits, interests, history }) {
  const base = TASK_DEFS[type]?.baseWeight ?? 1;

  const gap = computeGoalGap(type, statuses);           // 0..1
  const habitNeed = computeHabitNeed(type, habits);     // 0..1
  const interest = computeInterestBoost(type, interests); // 0..0.2
  const penalty = cooldownPenalty(type, history) + shownPenalty(type, history); // 0..~1.2

  // Weighted sum. Tune these to taste:
  const weighted = (
    0.45 * gap +        // missing progress matters most
    0.35 * habitNeed +  // encourage weaker habits
    0.20 * interest     // prefer liked tasks slightly
  );

  const finalScore = base * weighted - penalty;

  // Human-readable reason for debugging/UX copy if needed
  const reason = [
    gap > 0.7 ? 'far from goal' :
    gap > 0.3 ? 'progress remaining' : 'almost done',
    habitNeed > 0.6 ? 'weak habit' : habitNeed > 0.3 ? 'could improve' : 'solid habit',
    interest > 0 ? 'matches interests' : null,
    penalty > 0 ? 'cooldown/duplicate' : null
  ].filter(Boolean).join(', ');

  return { score: finalScore, reason };
}

// generateDailyTaskRecommendations:
// inputs:
// - statuses: map keyed by task id (water/protein/workout/mental/meal) with { completed, meta }
// - interests: e.g., ['protein','workout']
// - habits: e.g., { water: 0.4, workout: 0.8 } (adherence 0..1), optional
// - history: e.g., { water: { lastCompletedAt, lastShownAt }, ... }, optional
// - maxTasks: how many to return
export function generateDailyTaskRecommendations({
  statuses,
  interests = [],
  habits = {},
  history = {},
  maxTasks = 3,
}) {
  const candidates = Object.keys(TASK_DEFS).map((type) => {
    const { score, reason } = scoreTask(type, { statuses, habits, interests, history });
    return {
      id: type,
      title: TASK_DEFS[type].title,
      completed: !!statuses[type]?.completed,
      score,
      reason,
    };
  });

  // Sort highest score first; completed items sink naturally.
  candidates.sort((a, b) => b.score - a.score);

  // Optionally filter out completed ones unless you want to show them as done at bottom.
  const results = candidates.filter(c => !c.completed).slice(0, maxTasks);

  return { results, all: candidates };
}
