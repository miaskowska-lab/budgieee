import { supabase, isSupabaseConfigured } from './supabaseClient'

// ============================================
// USER SETTINGS
// Manages notification preferences
// ============================================

export interface UserSettings {
  notif_community: boolean
  notif_trips: boolean
  notif_budget: boolean
  digest_hour: number
}

const DEFAULT_SETTINGS: UserSettings = {
  notif_community: true,
  notif_trips: true,
  notif_budget: false,
  digest_hour: 18,
}

// Get user settings from Supabase (or localStorage fallback)
export async function getUserSettings(): Promise<{ data: UserSettings | null; error: any }> {
  // If Supabase not configured, use localStorage
  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem('budgieee-settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          data: {
            notif_community: parsed.notifications?.deals ?? DEFAULT_SETTINGS.notif_community,
            notif_trips: parsed.notifications?.splits ?? DEFAULT_SETTINGS.notif_trips,
            notif_budget: parsed.notifications?.budget ?? DEFAULT_SETTINGS.notif_budget,
            digest_hour: DEFAULT_SETTINGS.digest_hour,
          },
          error: null,
        }
      }
    } catch {}
    return { data: DEFAULT_SETTINGS, error: null }
  }
  
  // Use Supabase RPC
  const { data, error } = await supabase.rpc('get_user_settings')
  
  if (error) {
    console.error('Error fetching user settings:', error)
    return { data: null, error }
  }
  
  if (!data || data.length === 0) {
    return { data: DEFAULT_SETTINGS, error: null }
  }
  
  // RPC returns an array, take first row
  const settings = Array.isArray(data) ? data[0] : data
  
  return {
    data: {
      notif_community: settings.notif_community ?? DEFAULT_SETTINGS.notif_community,
      notif_trips: settings.notif_trips ?? DEFAULT_SETTINGS.notif_trips,
      notif_budget: settings.notif_budget ?? DEFAULT_SETTINGS.notif_budget,
      digest_hour: settings.digest_hour ?? DEFAULT_SETTINGS.digest_hour,
    },
    error: null,
  }
}

// Update user settings in Supabase
export async function updateUserSettings(
  settings: Partial<UserSettings>
): Promise<{ success: boolean; error: any }> {
  // If Supabase not configured, just save to localStorage
  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem('budgieee-settings')
      const current = stored ? JSON.parse(stored) : {}
      
      const updated = {
        ...current,
        notifications: {
          deals: settings.notif_community ?? current.notifications?.deals ?? true,
          splits: settings.notif_trips ?? current.notifications?.splits ?? true,
          budget: settings.notif_budget ?? current.notifications?.budget ?? false,
        },
      }
      
      localStorage.setItem('budgieee-settings', JSON.stringify(updated))
      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err }
    }
  }
  
  // Use Supabase RPC
  const { data, error } = await supabase.rpc('update_user_settings', {
    p_notif_community: settings.notif_community,
    p_notif_trips: settings.notif_trips,
    p_notif_budget: settings.notif_budget,
    p_digest_hour: settings.digest_hour,
  })
  
  if (error) {
    console.error('Error updating user settings:', error)
    return { success: false, error }
  }
  
  // Check for RPC error response
  if (data && typeof data === 'object' && 'error' in data) {
    return { success: false, error: data.error }
  }
  
  return { success: true, error: null }
}
