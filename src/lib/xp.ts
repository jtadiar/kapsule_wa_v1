import { supabase } from './supabase';

export interface UserXP {
  id: string;
  user_id: string;
  total_points: number;
  tier: string;
  swipes: number;
  likes: number;
  dislikes: number;
  added_to_library: number;
  listening_time: number;
  daily_logins: number;
  last_login_date: string;
  last_updated: string;
}

export type XPEventType = 'like' | 'dislike' | 'add_to_library' | 'listening' | 'daily_login';

/**
 * Update user XP based on an event
 */
export async function updateUserXP(
  userId: string, 
  eventType: XPEventType, 
  value: number = 1
): Promise<void> {
  try {
    console.log(`Updating XP for user ${userId}: ${eventType} (${value})`);
    
    const { error } = await supabase.rpc('update_user_xp', {
      p_user_id: userId,
      p_event_type: eventType,
      p_value: value
    });

    if (error) {
      console.error('Error updating user XP:', error);
      throw error;
    }

    console.log(`XP updated: ${eventType} (+${getPointsForEvent(eventType, value)} points)`);
  } catch (error) {
    console.error('Failed to update user XP:', error);
  }
}

/**
 * Get user XP data
 */
export async function getUserXP(userId: string): Promise<UserXP | null> {
  try {
    const { data, error } = await supabase
      .from('user_xp')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user XP:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch user XP:', error);
    return null;
  }
}

/**
 * Check if user should get daily login XP
 */
export async function checkDailyLogin(userId: string): Promise<void> {
  try {
    console.log('Checking daily login for user:', userId);
    
    const { error } = await supabase.rpc('check_daily_login', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error checking daily login:', error);
    } else {
      console.log('Daily login check completed successfully');
    }
  } catch (error) {
    console.error('Failed to check daily login:', error);
  }
}

/**
 * Get points awarded for a specific event type
 */
function getPointsForEvent(eventType: XPEventType, value: number = 1): number {
  switch (eventType) {
    case 'like':
    case 'dislike':
      return 1;
    case 'add_to_library':
      return 2;
    case 'listening':
      return value; // 1 point per minute
    case 'daily_login':
      return 5;
    default:
      return 0;
  }
}

/**
 * Get tier color based on tier name
 */
export function getTierColor(tier: string): string {
  switch (tier.toLowerCase()) {
    case 'red':
      return '#FF383A'; // Red
    case 'purple':
      return '#8B5CF6'; // Purple
    case 'silver':
      return '#C0C0C0'; // Silver
    case 'gold':
      return '#FFD700'; // Gold
    case 'black':
      return '#000000'; // Black
    default:
      return '#FF383A'; // Default to red
  }
}

/**
 * Get tier gradient based on tier name
 */
export function getTierGradient(tier: string): string {
  switch (tier.toLowerCase()) {
    case 'red':
      return 'linear-gradient(135deg, #FF383A 0%, #CC2F31 100%)'; // Red card
    case 'purple':
      return 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'; // Purple card
    case 'silver':
      return 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)'; // Silver card
    case 'gold':
      return 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'; // Gold card
    case 'black':
      return 'linear-gradient(135deg, #000000 0%, #333333 100%)'; // Black card
    default:
      return 'linear-gradient(135deg, #FF383A 0%, #CC2F31 100%)'; // Default to red
  }
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: string): string {
  switch (tier.toLowerCase()) {
    case 'red':
      return 'Community';
    case 'purple':
      return 'Pro';
    case 'silver':
      return 'Elite';
    case 'gold':
      return 'VIP';
    case 'black':
      return 'Black';
    default:
      return 'Community';
  }
}