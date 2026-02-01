// ============================================
// Community Deals - Data Repository
// Client-side Supabase queries for Community feature
// 
// USER DATA OWNERSHIP:
// User-specific data (likes, bookmarks, posts) use auth.uid().
// When RLS is enabled, add policies like:
//   CREATE POLICY "Users can manage own likes"
//   ON post_likes FOR ALL
//   USING (user_id = auth.uid());
// ============================================

import { supabase, isSupabaseConfigured } from './supabaseClient'

// ============ Types ============
export interface Community {
  id: string
  name: string
  emoji: string
  kind: 'city' | 'university' | 'private'
  image_url: string | null
  is_public: boolean
  member_count: number
  my_role: string
}

export interface Post {
  post_id: string
  title: string
  body: string
  tag: string | null
  tag_color: string | null
  image_url: string | null
  created_at: string
  author_id: string
  author_name: string
  author_avatar_color: string
  like_count: number
  comment_count: number
  liked_by_me: boolean
  bookmarked_by_me: boolean
  // For saved deals view
  community_id?: string
  community_name?: string
  community_emoji?: string
}

export interface Comment {
  comment_id: string
  body: string
  created_at: string
  author_id: string
  author_name: string
  author_avatar_color: string
}

export interface UserProfile {
  user_id: string
  email: string
  display_name: string
  avatar_color: string
}

// ============ Onboarding ============
export async function ensureDefaultMemberships(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { error: new Error('Supabase not configured') }
  }
  
  const { error } = await supabase.rpc('ensure_default_community_memberships')
  return { error: error ? new Error(error.message) : null }
}

// ============ Communities ============
export async function getMyCommunities(): Promise<{ data: Community[] | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data, error } = await supabase.rpc('get_my_communities')
  
  if (error) {
    return { data: null, error: new Error(error.message) }
  }
  
  return { data: data as Community[], error: null }
}

// ============ Posts / Feed ============
export async function getCommunityFeed(communityId: string): Promise<{ data: Post[] | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data, error } = await supabase.rpc('get_community_feed', { p_community_id: communityId })
  
  if (error) {
    return { data: null, error: new Error(error.message) }
  }
  
  return { data: data as Post[], error: null }
}

export async function getSavedDeals(): Promise<{ data: Post[] | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data, error } = await supabase.rpc('get_saved_deals')
  
  if (error) {
    return { data: null, error: new Error(error.message) }
  }
  
  return { data: data as Post[], error: null }
}

export async function createPost(
  communityId: string,
  title: string,
  body: string,
  tag?: string,
  tagColor?: string
): Promise<{ data: { id: string } | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      community_id: communityId,
      author_id: user.id,
      title,
      body,
      tag: tag || null,
      tag_color: tagColor || null,
    })
    .select('id')
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: { id: data.id }, error: null }
}

// ============ Likes ============
export async function toggleLike(postId: string, isCurrentlyLiked: boolean): Promise<{ liked: boolean; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { liked: isCurrentlyLiked, error: new Error('Supabase not configured') }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { liked: isCurrentlyLiked, error: new Error('Not authenticated') }
  }

  if (isCurrentlyLiked) {
    // Unlike
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)

    if (error) {
      return { liked: isCurrentlyLiked, error: new Error(error.message) }
    }
    return { liked: false, error: null }
  } else {
    // Like
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: user.id })

    if (error) {
      return { liked: isCurrentlyLiked, error: new Error(error.message) }
    }
    return { liked: true, error: null }
  }
}

// ============ Bookmarks ============
export async function toggleBookmark(postId: string, isCurrentlyBookmarked: boolean): Promise<{ bookmarked: boolean; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { bookmarked: isCurrentlyBookmarked, error: new Error('Supabase not configured') }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { bookmarked: isCurrentlyBookmarked, error: new Error('Not authenticated') }
  }

  if (isCurrentlyBookmarked) {
    // Remove bookmark
    const { error } = await supabase
      .from('post_bookmarks')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)

    if (error) {
      return { bookmarked: isCurrentlyBookmarked, error: new Error(error.message) }
    }
    return { bookmarked: false, error: null }
  } else {
    // Add bookmark
    const { error } = await supabase
      .from('post_bookmarks')
      .insert({ post_id: postId, user_id: user.id })

    if (error) {
      return { bookmarked: isCurrentlyBookmarked, error: new Error(error.message) }
    }
    return { bookmarked: true, error: null }
  }
}

// ============ Comments ============
export async function getPostComments(postId: string): Promise<{ data: Comment[] | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data, error } = await supabase.rpc('get_post_comments', { p_post_id: postId })
  
  if (error) {
    return { data: null, error: new Error(error.message) }
  }
  
  return { data: data as Comment[], error: null }
}

export async function addComment(postId: string, body: string): Promise<{ data: { id: string } | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      post_id: postId,
      author_id: user.id,
      body,
    })
    .select('id')
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: { id: data.id }, error: null }
}

// ============ Points ============
export async function getUserPoints(): Promise<{ points: number; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { points: 0, error: new Error('Supabase not configured') }
  }

  const { data, error } = await supabase.rpc('get_user_points')
  
  if (error) {
    return { points: 0, error: new Error(error.message) }
  }
  
  return { points: data as number, error: null }
}

// ============ User Profile ============
export async function getCurrentUserProfile(): Promise<{ data: UserProfile | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, email, display_name, avatar_color')
    .eq('user_id', user.id)
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: data as UserProfile, error: null }
}
