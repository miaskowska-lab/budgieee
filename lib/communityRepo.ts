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

/** Visible communities list (RLS) with member count and join status */
export interface VisibleCommunity {
  id: string
  code: string | null
  name: string
  emoji: string | null
  kind: 'city' | 'university' | 'private'
  image_url: string | null
  member_count: number
  joined_by_me: boolean
}

// ============ Ensure user has their own Personal Friends group ============
export async function ensurePersonalFriendsMembership(): Promise<void> {
  if (!isSupabaseConfigured) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  
  // Call RPC to create user's own Personal Friends group if needed
  const { error } = await supabase.rpc('ensure_personal_friends_membership')
  if (error) {
    console.warn('ensurePersonalFriendsMembership:', error.message)
  }
}

// Helper to check if a community is the user's own Personal Friends
export function isPersonalFriendsCode(code: string | null, userId?: string): boolean {
  if (!code) return false
  // Matches 'personal_friends_{uuid}' pattern
  return code.startsWith('personal_friends_')
}

// ============ Visible communities list (replace mock) ============
export async function getVisibleCommunitiesWithCounts(): Promise<{
  data: VisibleCommunity[] | null
  error: string | null
}> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase not configured' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  // Ensure user is in Personal Friends before fetching
  await ensurePersonalFriendsMembership()

  // Fetch visible communities (RLS filters by kind + membership)
  const { data: rows, error: communitiesError } = await supabase
    .from('communities')
    .select('id, code, name, emoji, kind, image_url, created_at')
    .order('created_at', { ascending: false })

  if (communitiesError) {
    console.error('getVisibleCommunitiesWithCounts communities:', communitiesError)
    return { data: null, error: communitiesError.message }
  }
  if (!rows || rows.length === 0) {
    return { data: [], error: null }
  }

  const communityIds = rows.map(r => r.id)

  // Current user's memberships
  const { data: myMemberships, error: membersError } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('user_id', user.id)

  if (membersError) {
    console.error('getVisibleCommunitiesWithCounts memberships:', membersError)
    return { data: null, error: membersError.message }
  }
  const joinedSet = new Set((myMemberships || []).map(m => m.community_id))

  // Member counts: fetch all members for these communities and count in JS
  const { data: allMembers, error: countError } = await supabase
    .from('community_members')
    .select('community_id')
    .in('community_id', communityIds)

  if (countError) {
    console.error('getVisibleCommunitiesWithCounts member counts:', countError)
    return { data: null, error: countError.message }
  }
  const countByCommunity: Record<string, number> = {}
  communityIds.forEach(id => { countByCommunity[id] = 0 })
  ;(allMembers || []).forEach(m => {
    if (countByCommunity[m.community_id] !== undefined) {
      countByCommunity[m.community_id] += 1
    }
  })

  const data: VisibleCommunity[] = rows.map(r => ({
    id: r.id,
    code: r.code ?? null,
    name: r.name,
    emoji: r.emoji ?? null,
    kind: r.kind as 'city' | 'university' | 'private',
    image_url: r.image_url ?? null,
    member_count: countByCommunity[r.id] ?? 0,
    joined_by_me: joinedSet.has(r.id),
  }))

  return { data, error: null }
}

/** Only @uni.minerva.edu can join city/university communities; private (e.g. Personal Friends) is allowed via invite/RPC. */
export async function joinCommunity(communityId: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: 'Supabase not configured' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: community, error: commError } = await supabase
    .from('communities')
    .select('kind')
    .eq('id', communityId)
    .single()

  if (commError || !community) {
    console.error('joinCommunity community fetch:', commError)
    return { error: commError?.message ?? 'Community not found' }
  }

  const kind = community.kind as 'city' | 'university' | 'private'
  if (kind === 'city' || kind === 'university') {
    const email = (user.email ?? '').toLowerCase()
    if (!email.endsWith('@uni.minerva.edu')) {
      return { error: 'Only Minerva students (@uni.minerva.edu) can join this community.' }
    }
  }

  const { error } = await supabase
    .from('community_members')
    .insert({ community_id: communityId, user_id: user.id, role: 'member' })

  if (error) {
    console.error('joinCommunity:', error)
    return { error: error.message }
  }
  return { error: null }
}

export async function leaveCommunity(communityId: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: 'Supabase not configured' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', user.id)

  if (error) {
    console.error('leaveCommunity:', error)
    return { error: error.message }
  }
  return { error: null }
}

/** Invite a friend by email to a community (e.g. Personal Friends). Uses community_invites table. */
export async function createInvite(communityId: string, email: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: 'Supabase not configured' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('community_invites')
    .insert({
      community_id: communityId,
      invited_by: user.id,
      invited_email: email.trim().toLowerCase(),
      status: 'pending',
    })

  if (error) {
    console.error('createInvite:', error)
    return { error: error.message }
  }

  // Send email via Edge Function (do not rollback invite on failure)
  try {
    const { data: community } = await supabase.from('communities').select('name').eq('id', communityId).single()
    const { data: inviterProfile } = await supabase.from('profiles').select('full_name, email').eq('user_id', user.id).single()
    const inviter_name = inviterProfile?.full_name || inviterProfile?.email || 'Someone'
    const community_name = community?.name || 'a community'

    const { error: fnError } = await supabase.functions.invoke('send-invite-email', {
      body: {
        invited_email: email.trim().toLowerCase(),
        inviter_name,
        group_name: community_name
      }
    })
    if (fnError) {
      console.error('send-invite-email (community):', fnError)
    }
  } catch (err) {
    console.error('send-invite-email (community) exception:', err)
  }

  return { error: null }
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
