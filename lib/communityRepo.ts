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

  // Fetch visible communities with member_count column (RLS filters by kind + membership)
  const { data: rows, error: communitiesError } = await supabase
    .from('communities')
    .select('id, code, name, emoji, kind, image_url, created_at, member_count')
    .order('created_at', { ascending: false })

  if (communitiesError) {
    console.error('getVisibleCommunitiesWithCounts communities:', communitiesError)
    return { data: null, error: communitiesError.message }
  }
  if (!rows || rows.length === 0) {
    return { data: [], error: null }
  }

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

  const data: VisibleCommunity[] = rows.map(r => ({
    id: r.id,
    code: r.code ?? null,
    name: r.name,
    emoji: r.emoji ?? null,
    kind: r.kind as 'city' | 'university' | 'private',
    image_url: r.image_url ?? null,
    member_count: r.member_count ?? 0,
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

  // Temporarily allow any authenticated user to join (Minerva restriction relaxed)
  // const kind = community.kind as 'city' | 'university' | 'private'
  // if (kind === 'city' || kind === 'university') {
  //   const email = (user.email ?? '').toLowerCase()
  //   if (!email.endsWith('@uni.minerva.edu')) {
  //     return { error: 'Only Minerva students (@uni.minerva.edu) can join this community.' }
  //   }
  // }

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

  // Send invite email via API route (server-side)
  try {
    const { data: community } = await supabase.from('communities').select('name').eq('id', communityId).single()
    const { data: inviterProfile } = await supabase.from('profiles').select('full_name, email').eq('user_id', user.id).single()
    const inviterName = inviterProfile?.full_name || inviterProfile?.email?.split('@')[0] || 'Someone'
    const communityName = community?.name || 'a community'

    // Call API route to send email (works from client)
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://budgieee.com'
    const inviteLink = `${appUrl}/community?invite=${communityId}`
    
    console.log('Sending community invite email:', { email: email.trim().toLowerCase(), inviterName, groupName: communityName, inviteLink })
    
    fetch('/api/notifications/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        inviterName,
        groupName: communityName,
        inviteLink
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('Community invite email sent successfully')
        } else {
          console.error('Community invite email failed:', data.error)
        }
      })
      .catch(err => console.error('send-invite-email (community):', err))
  } catch (err) {
    console.error('send-invite-email (community) exception:', err)
  }

  return { error: null }
}

// ============ Community Invites ============
export interface PendingCommunityInvite {
  id: string
  community_id: string
  invited_by: string
  invited_email: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  community_name?: string
  community_emoji?: string
  inviter_name?: string
}

/** Get pending community invites for the current user */
export async function getMyPendingCommunityInvites(): Promise<{ data: PendingCommunityInvite[] | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase not configured' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  // Get user's email from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return { data: [], error: null }
  }

  // Get pending invites for this email
  const { data: invites, error } = await supabase
    .from('community_invites')
    .select('id, community_id, invited_by, invited_email, status, created_at')
    .eq('invited_email', profile.email.toLowerCase())
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getMyPendingCommunityInvites:', error)
    return { data: null, error: error.message }
  }

  if (!invites || invites.length === 0) {
    return { data: [], error: null }
  }

  // Get community details
  const communityIds = invites.map(i => i.community_id)
  const { data: communities } = await supabase
    .from('communities')
    .select('id, name, emoji')
    .in('id', communityIds)

  const communityMap: Record<string, { name: string; emoji: string }> = {}
  ;(communities || []).forEach(c => {
    communityMap[c.id] = { name: c.name, emoji: c.emoji }
  })

  // Get inviter profiles
  const inviterIds = Array.from(new Set(invites.map(i => i.invited_by)))
  const { data: inviterProfiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, email')
    .in('user_id', inviterIds)

  const inviterMap: Record<string, string> = {}
  ;(inviterProfiles || []).forEach(p => {
    inviterMap[p.user_id] = p.full_name || p.email
  })

  const result: PendingCommunityInvite[] = invites.map(i => ({
    ...i,
    status: i.status as 'pending' | 'accepted' | 'declined',
    community_name: communityMap[i.community_id]?.name,
    community_emoji: communityMap[i.community_id]?.emoji,
    inviter_name: inviterMap[i.invited_by]
  }))

  return { data: result, error: null }
}

/** Accept a community invite */
export async function acceptCommunityInvite(inviteId: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase not configured' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get the invite
  const { data: invite, error: fetchError } = await supabase
    .from('community_invites')
    .select('id, community_id, status')
    .eq('id', inviteId)
    .single()

  if (fetchError || !invite) {
    return { error: 'Invite not found' }
  }

  if (invite.status !== 'pending') {
    return { error: 'Invite already responded to' }
  }

  // Update invite status
  const { error: updateError } = await supabase
    .from('community_invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId)

  if (updateError) {
    console.error('acceptCommunityInvite update:', updateError)
    return { error: updateError.message }
  }

  // Add user to community members
  const { error: memberError } = await supabase
    .from('community_members')
    .insert({ community_id: invite.community_id, user_id: user.id, role: 'member' })

  if (memberError && !memberError.message.includes('duplicate')) {
    console.error('acceptCommunityInvite add member:', memberError)
    return { error: memberError.message }
  }

  return { error: null }
}

/** Decline a community invite */
export async function declineCommunityInvite(inviteId: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase not configured' }
  }

  const { error } = await supabase
    .from('community_invites')
    .update({ status: 'declined' })
    .eq('id', inviteId)

  if (error) {
    console.error('declineCommunityInvite:', error)
    return { error: error.message }
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

  const { data: visible, error } = await getVisibleCommunitiesWithCounts()
  if (error || !visible) {
    return { data: null, error: error ? new Error(error) : new Error('Failed to load communities') }
  }

  const joined = visible.filter(c => c.joined_by_me)
  if (joined.length === 0) {
    return { data: [], error: null }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: [], error: null }
  }

  const { data: memberships } = await supabase
    .from('community_members')
    .select('community_id, role')
    .eq('user_id', user.id)
    .in('community_id', joined.map(c => c.id))

  const roleByCommunity = new Map((memberships || []).map(m => [m.community_id, m.role]))

  const mapped: Community[] = joined.map(c => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji ?? '🏷️',
    kind: c.kind,
    image_url: c.image_url,
    is_public: true,
    member_count: c.member_count,
    my_role: roleByCommunity.get(c.id) ?? 'member',
  }))
  return { data: mapped, error: null }
}

// ============ Posts / Feed ============
// Default page size for feed pagination
export const FEED_PAGE_SIZE = 20

export interface FeedPage {
  posts: Post[]
  hasMore: boolean
}

export async function getCommunityFeed(
  communityId: string,
  limit: number = FEED_PAGE_SIZE,
  offset: number = 0
): Promise<{ data: FeedPage | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  // Request one extra to detect if there are more posts
  const { data, error } = await supabase.rpc('get_community_feed', {
    p_community_id: communityId,
    p_limit: limit + 1,
    p_offset: offset,
  })
  
  if (error) {
    return { data: null, error: new Error(error.message) }
  }
  
  // Map remote columns (author_display_name, author_full_name, etc.) to Post shape
  const rows = (data ?? []) as Array<Record<string, unknown>>
  const hasMore = rows.length > limit
  const trimmedRows = hasMore ? rows.slice(0, limit) : rows
  
  const posts: Post[] = trimmedRows.map(r => ({
    post_id: r.post_id as string,
    title: r.title as string,
    body: r.body as string,
    tag: (r.tag as string) ?? null,
    tag_color: (r.tag_color as string) ?? null,
    image_url: (r.image_url as string) ?? null,
    created_at: r.created_at as string,
    author_id: r.author_id as string,
    author_name: (r.author_display_name ?? r.author_full_name ?? r.author_email ?? '') as string,
    author_avatar_color: (r.author_avatar_color ?? '#6b7280') as string,
    like_count: Number(r.like_count ?? 0),
    comment_count: Number(r.comment_count ?? 0),
    liked_by_me: Boolean(r.liked_by_me),
    bookmarked_by_me: Boolean(r.bookmarked_by_me),
  }))
  
  return { data: { posts, hasMore }, error: null }
}

export async function getSavedDeals(): Promise<{ data: Post[] | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: [], error: null }
  }

  const { data: bookmarks, error: bookErr } = await supabase
    .from('community_post_bookmarks')
    .select('post_id')
    .eq('user_id', user.id)
  if (bookErr || !bookmarks?.length) {
    return { data: bookErr ? null : [], error: bookErr ? new Error(bookErr.message) : null }
  }

  const postIds = bookmarks.map(b => b.post_id)
  const { data: posts, error: postsErr } = await supabase
    .from('community_posts')
    .select('id, community_id, author_id, title, body, tag, tag_color, image_url, created_at')
    .in('id', postIds)
  if (postsErr || !posts?.length) {
    return { data: postsErr ? null : [], error: postsErr ? new Error(postsErr.message) : null }
  }

  const { data: communities } = await supabase
    .from('communities')
    .select('id, name, emoji')
    .in('id', Array.from(new Set(posts.map(p => p.community_id))))
  const communityMap = new Map((communities || []).map(c => [c.id, c]))

  const { data: likeCounts } = await supabase
    .from('community_post_likes')
    .select('post_id')
    .in('post_id', postIds)
  const likeCountByPost = new Map<string, number>()
  ;(likeCounts || []).forEach(l => {
    likeCountByPost.set(l.post_id, (likeCountByPost.get(l.post_id) ?? 0) + 1)
  })

  const { data: myLikes } = await supabase
    .from('community_post_likes')
    .select('post_id')
    .eq('user_id', user.id)
    .in('post_id', postIds)
  const likedSet = new Set((myLikes || []).map(l => l.post_id))

  const { data: commentCounts } = await supabase
    .from('community_post_comments')
    .select('post_id')
    .in('post_id', postIds)
  const commentCountByPost = new Map<string, number>()
  ;(commentCounts || []).forEach(c => {
    commentCountByPost.set(c.post_id, (commentCountByPost.get(c.post_id) ?? 0) + 1)
  })

  const authorIds = Array.from(new Set(posts.map(p => p.author_id)))
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name, full_name, email, avatar_color')
    .in('user_id', authorIds)
  const profileMap = new Map(
    (profiles || []).map(p => [
      p.user_id,
      { name: (p.display_name ?? p.full_name ?? p.email ?? '') as string, color: (p.avatar_color ?? '#6b7280') as string },
    ])
  )

  const mapped: Post[] = posts
    .map(p => {
      const comm = communityMap.get(p.community_id)
      return {
        post_id: p.id,
        title: p.title,
        body: p.body,
        tag: p.tag ?? null,
        tag_color: p.tag_color ?? null,
        image_url: p.image_url ?? null,
        created_at: p.created_at,
        author_id: p.author_id,
        author_name: profileMap.get(p.author_id)?.name ?? '',
        author_avatar_color: profileMap.get(p.author_id)?.color ?? '#6b7280',
        like_count: likeCountByPost.get(p.id) ?? 0,
        comment_count: commentCountByPost.get(p.id) ?? 0,
        liked_by_me: likedSet.has(p.id),
        bookmarked_by_me: true,
        community_id: p.community_id,
        community_name: comm?.name,
        community_emoji: comm?.emoji ?? undefined,
      }
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return { data: mapped, error: null }
}

export async function createPost(
  communityId: string,
  title: string,
  body: string,
  tag?: string,
  tagColor?: string,
  imageUrl?: string
): Promise<{ data: { id: string } | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      community_id: communityId,
      author_id: user.id,
      title,
      body,
      tag: tag || null,
      tag_color: tagColor || null,
      image_url: imageUrl || null,
    })
    .select('id')
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  // Notify community members about the new post (fire and forget)
  try {
    const { data: community } = await supabase
      .from('communities')
      .select('name')
      .eq('id', communityId)
      .single()
    
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single()
    
    const { notifyCommunityPost } = await import('./notifications')
    
    // Get community emoji from name (first non-ASCII character or default)
    const firstChar = community?.name?.trim().charAt(0)
    const emoji = firstChar && (firstChar.codePointAt(0) ?? 0) > 127 ? firstChar : '🏷️'
    
    notifyCommunityPost(
      user.id,
      authorProfile?.full_name || authorProfile?.email?.split('@')[0] || 'Someone',
      communityId,
      community?.name || 'a community',
      emoji,
      data.id,
      title,
      body.slice(0, 150) + (body.length > 150 ? '...' : ''),
      tag
    ).catch(console.error) // Don't block on notification
  } catch (notifError) {
    console.error('Failed to notify community members:', notifError)
  }

  return { data: { id: data.id }, error: null }
}

// ============ Upload Post Image ============
export async function uploadPostImage(
  file: File
): Promise<{ url: string | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { url: null, error: new Error('Supabase not configured') }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { url: null, error: new Error('Not authenticated') }
  }

  // Validate file type (allow common image types)
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return { url: null, error: new Error('Invalid image type. Supported: JPG, PNG, GIF, WebP, HEIC') }
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return { url: null, error: new Error('Image must be less than 10MB') }
  }

  // Generate unique filename
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('post-images')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Upload error:', error)
    return { url: null, error: new Error(error.message) }
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('post-images')
    .getPublicUrl(data.path)

  return { url: urlData.publicUrl, error: null }
}

// ============ Delete Post ============
export async function deletePost(postId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { error: new Error('Supabase not configured') }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: new Error('Not authenticated') }
  }

  // RLS policy "authors can delete own posts" ensures only the author can delete
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', user.id) // Extra safety: only delete if user is author

  if (error) {
    return { error: new Error(error.message) }
  }

  return { error: null }
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
      .from('community_post_likes')
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
      .from('community_post_likes')
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
      .from('community_post_bookmarks')
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
      .from('community_post_bookmarks')
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

  const { data: rows, error } = await supabase
    .from('community_post_comments')
    .select('id, body, created_at, author_id')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }
  if (!rows || rows.length === 0) {
    return { data: [], error: null }
  }

  const authorIds = Array.from(new Set(rows.map(r => r.author_id)))
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name, full_name, email, avatar_color')
    .in('user_id', authorIds)

  const profileMap = new Map(
    (profiles || []).map(p => [
      p.user_id,
      { name: (p.display_name ?? p.full_name ?? p.email ?? '') as string, color: (p.avatar_color ?? '#6b7280') as string },
    ])
  )

  const mapped: Comment[] = rows.map(r => ({
    comment_id: r.id,
    body: r.body,
    created_at: r.created_at,
    author_id: r.author_id,
    author_name: profileMap.get(r.author_id)?.name ?? '',
    author_avatar_color: profileMap.get(r.author_id)?.color ?? '#6b7280',
  }))
  return { data: mapped, error: null }
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
    .from('community_post_comments')
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

  const { data, error } = await supabase.rpc('get_my_community_points')
  
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
