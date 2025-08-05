import { supabase } from '../../lib/supabase';

/**
 * Checks and updates the user's premium status
 * @returns {Promise<boolean>} The current premium status
 */
export async function checkAndUpdatePremiumStatus() {
  try {
    // Get the current user's subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString());

    if (subError) throw subError;

    // Update the profile's premium status
    const isPremium = subscriptions && subscriptions.length > 0;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_premium: isPremium })
      .eq('id', (await supabase.auth.getUser()).data.user.id);

    if (updateError) throw updateError;

    console.log('Premium status updated:', { isPremium });
    return isPremium;
  } catch (error) {
    console.error('Error updating premium status:', error);
    // Return current status from profile if update fails
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .single();
    return profile?.is_premium || false;
  }
}

/**
 * Gets the current premium status without updating
 * @returns {Promise<boolean>} The current premium status
 */
export async function getPremiumStatus() {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium')
    .single();
  return profile?.is_premium || false;
}

/**
 * Checks if a user is premium
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} Whether the user is premium
 */
export async function isUserPremium(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', userId)
    .single();
  return profile?.is_premium || false;
} 