'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession, isDevBypassEnabled } from '@/lib/useSession'
import { isUserAuthenticated, getLoginRedirectPath } from '@/lib/authGuard'
import { useNavVisibility } from '@/components/BottomNav'
import {
  getVisibleCommunitiesWithCounts,
  joinCommunity,
  leaveCommunity,
  createInvite,
  isPersonalFriendsCode,
  getCommunityFeed,
  getSavedDeals,
  createPost as createPostApi,
  toggleLike as toggleLikeApi,
  toggleBookmark as toggleBookmarkApi,
  getPostComments,
  addComment as addCommentApi,
  getUserPoints,
  getMyPendingCommunityInvites,
  acceptCommunityInvite,
  declineCommunityInvite,
  FEED_PAGE_SIZE,
  type Post as ApiPost,
  type Comment as ApiComment,
  type PendingCommunityInvite,
} from '@/lib/communityRepo'
import { isSupabaseConfigured } from '@/lib/supabaseClient'

// ============================================
// COMMUNITY DEALS - Budgieee
// Dev Mode: Works with local mock data (no Supabase required)
// Points system: You earn 2 points per like on your posts
// ============================================

const POINTS_PER_LIKE = 2

// ============ Types ============
interface Community {
  id: string
  code?: string | null
  name: string
  emoji: string
  kind: 'city' | 'university' | 'private'
  image_url: string | null
  member_count: number
  joined_by_me?: boolean
}

interface Post {
  post_id: string
  community_id: string
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
  community_name?: string
  community_emoji?: string
}

interface Comment {
  comment_id: string
  body: string
  created_at: string
  author_id: string
  author_name: string
  author_avatar_color: string
}

interface Friend {
  id: string
  name: string
  email: string
  avatar_color: string
  is_member: boolean // whether they're in the Personal Friends group
}

// ============ Mock Data ============
const MOCK_USER = {
  id: 'dev-user',
  name: 'Dev User',
  email: 'dev@budgieee.app',
  avatar_color: '#6366f1',
}

// City community image URLs (used when Supabase image_url is null)
const CITY_IMAGE_URLS: Record<string, string> = {
  sf: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=200&fit=crop',
  ba: 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=400&h=200&fit=crop',
  hyd: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=400&h=200&fit=crop',
  tok: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=200&fit=crop',
  ber: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&h=200&fit=crop',
}

// Available communities to discover/join (pre-existing public communities)
const INITIAL_COMMUNITIES: Community[] = [
  { id: 'sf', name: 'Minerva San Francisco', emoji: '🌉', kind: 'city', image_url: CITY_IMAGE_URLS.sf, member_count: 156 },
  { id: 'ba', name: 'Minerva Buenos Aires', emoji: '🇦🇷', kind: 'city', image_url: CITY_IMAGE_URLS.ba, member_count: 142 },
  { id: 'hyd', name: 'Minerva Hyderabad', emoji: '🇮🇳', kind: 'city', image_url: CITY_IMAGE_URLS.hyd, member_count: 138 },
  { id: 'tok', name: 'Minerva Tokyo', emoji: '🇯🇵', kind: 'city', image_url: CITY_IMAGE_URLS.tok, member_count: 145 },
  { id: 'ber', name: 'Minerva Berlin', emoji: '🇩🇪', kind: 'city', image_url: CITY_IMAGE_URLS.ber, member_count: 151 },
  { id: 'personal', name: 'Personal Friends', emoji: '👥', kind: 'private', image_url: null, member_count: 0 },
]

// New users start BLANK - no fake posts, comments, or friends
const INITIAL_POSTS: Post[] = []
const INITIAL_COMMENTS: Record<string, Comment[]> = {}
const INITIAL_FRIENDS: Friend[] = []

// ============ Utility Functions ============
function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ============ Main Component ============
export default function CommunityPage() {
  const router = useRouter()
  const { user: authUser, loading: authLoading, isAuthenticated } = useSession()
  
  // Current user - use authenticated user when available, fallback to MOCK_USER for dev
  const currentUser = useMemo(() => {
    if (authUser) {
      // Generate avatar color from user ID for consistency
      const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e', '#14b8a6', '#3b82f6']
      const colorIndex = authUser.id.charCodeAt(0) % colors.length
      return {
        id: authUser.id,
        name: authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        avatar_color: authUser.user_metadata?.avatar_color || colors[colorIndex],
      }
    }
    return MOCK_USER
  }, [authUser])
  
  // Redirect to login if not authenticated (and not in dev bypass mode)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(getLoginRedirectPath())
    }
  }, [authLoading, isAuthenticated, router])
  
  // View state
  const [viewMode, setViewMode] = useState<'portal' | 'feed' | 'saved' | 'join-gate'>('portal')
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null)

  // Allow any authenticated user to join communities (temporarily relaxed)
  const canJoinMinervaCommunities = useMemo(() => {
    return true // Temporarily allow all users; will restore Minerva restriction later
  }, [])
  
  // Data state: communities from Supabase when configured, else mock
  // Start with empty array when Supabase is configured to avoid flash of mock data
  const [communities, setCommunities] = useState<Community[]>(isSupabaseConfigured ? [] : INITIAL_COMMUNITIES)
  const [communitiesLoading, setCommunitiesLoading] = useState(isSupabaseConfigured)
  const [communitiesError, setCommunitiesError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS)
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsLoadingMore, setPostsLoadingMore] = useState(false)
  const [postsHasMore, setPostsHasMore] = useState(false)
  const [postsOffset, setPostsOffset] = useState(0)
  const [comments, setComments] = useState<Record<string, Comment[]>>(INITIAL_COMMENTS)
  const [commentsFetchedAt, setCommentsFetchedAt] = useState<Record<string, number>>({}) // timestamp per post
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [friends, setFriends] = useState<Friend[]>(INITIAL_FRIENDS)
  const [pendingCommunityInvites, setPendingCommunityInvites] = useState<PendingCommunityInvite[]>([])
  const [supabasePoints, setSupabasePoints] = useState<number>(0)
  
  // UI state
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  
  // Hide global nav when modal is open
  const { setHidden } = useNavVisibility()
  useEffect(() => {
    setHidden(showNewPostModal)
  }, [showNewPostModal, setHidden])
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showCommentsModal, setShowCommentsModal] = useState<string | null>(null)
  const [showFriendsModal, setShowFriendsModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Show toast helper
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Load communities from Supabase when configured
  const loadCommunities = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setCommunitiesLoading(true)
    setCommunitiesError(null)
    try {
      const { data, error } = await getVisibleCommunitiesWithCounts()
      setCommunitiesLoading(false)
      if (error) {
        setCommunitiesError(error)
        console.error('loadCommunities:', error)
        return
      }
      if (data) {
        const mapped = data.map(c => ({
          id: c.id,
          code: c.code,
          name: c.name,
          emoji: c.emoji ?? '',
          kind: c.kind,
          image_url: c.image_url ?? (c.code ? CITY_IMAGE_URLS[c.code] : null),
          member_count: c.member_count,
          joined_by_me: c.joined_by_me,
        }))
        
        // Sort so Personal Friends appears last (after city communities)
        mapped.sort((a, b) => {
          if (isPersonalFriendsCode(a.code ?? null)) return 1
          if (isPersonalFriendsCode(b.code ?? null)) return -1
          return 0
        })
        setCommunities(mapped)
      }
    } catch (err) {
      console.error('loadCommunities exception:', err)
      setCommunitiesLoading(false)
      setCommunitiesError('Failed to load communities')
    }
  }, [])

  // Load community feed from Supabase (initial load, resets pagination)
  const loadFeed = useCallback(async (communityId: string) => {
    if (!isSupabaseConfigured) return
    setPostsLoading(true)
    setPostsOffset(0)
    try {
      const { data, error } = await getCommunityFeed(communityId, FEED_PAGE_SIZE, 0)
      if (error) {
        console.error('loadFeed:', error)
        showToast('Failed to load posts', 'error')
      } else if (data) {
        // Map ApiPost to local Post type with community_id
        const mappedPosts: Post[] = data.posts.map(p => ({
          ...p,
          community_id: communityId,
        }))
        setPosts(mappedPosts)
        setPostsHasMore(data.hasMore)
        setPostsOffset(FEED_PAGE_SIZE)
      }
    } catch (err) {
      console.error('loadFeed exception:', err)
    } finally {
      setPostsLoading(false)
    }
  }, [showToast])

  // Load more posts (pagination)
  const loadMorePosts = useCallback(async () => {
    if (!isSupabaseConfigured || !selectedCommunityId || postsLoadingMore || !postsHasMore) return
    setPostsLoadingMore(true)
    try {
      const { data, error } = await getCommunityFeed(selectedCommunityId, FEED_PAGE_SIZE, postsOffset)
      if (error) {
        console.error('loadMorePosts:', error)
        showToast('Failed to load more posts', 'error')
      } else if (data) {
        const mappedPosts: Post[] = data.posts.map(p => ({
          ...p,
          community_id: selectedCommunityId,
        }))
        setPosts(prev => [...prev, ...mappedPosts])
        setPostsHasMore(data.hasMore)
        setPostsOffset(prev => prev + FEED_PAGE_SIZE)
      }
    } catch (err) {
      console.error('loadMorePosts exception:', err)
    } finally {
      setPostsLoadingMore(false)
    }
  }, [selectedCommunityId, postsOffset, postsLoadingMore, postsHasMore, showToast])

  // Load saved deals from Supabase
  const loadSavedDeals = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setPostsLoading(true)
    try {
      const { data, error } = await getSavedDeals()
      if (error) {
        console.error('loadSavedDeals:', error)
        showToast('Failed to load saved deals', 'error')
      } else if (data) {
        // Map ApiPost to local Post type
        const mappedPosts: Post[] = data.map(p => ({
          ...p,
          community_id: p.community_id || '',
        }))
        setPosts(mappedPosts)
      }
    } catch (err) {
      console.error('loadSavedDeals exception:', err)
    } finally {
      setPostsLoading(false)
    }
  }, [showToast])

  // Load user points from Supabase
  const loadPoints = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const { points, error } = await getUserPoints()
      if (!error) {
        setSupabasePoints(points)
      }
    } catch (err) {
      console.error('loadPoints exception:', err)
    }
  }, [])

  // Load pending community invites
  const loadPendingInvites = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const { data, error } = await getMyPendingCommunityInvites()
      if (!error && data) {
        setPendingCommunityInvites(data)
      }
    } catch (err) {
      console.error('loadPendingInvites exception:', err)
    }
  }, [])

  // Load comments for a post from Supabase (with caching)
  // showLoading: false for background refresh (stale-while-revalidate)
  const loadComments = useCallback(async (postId: string, showLoading: boolean = true) => {
    if (!isSupabaseConfigured) return
    if (showLoading) setCommentsLoading(true)
    try {
      const { data, error } = await getPostComments(postId)
      if (!error && data) {
        const mapped: Comment[] = data.map(c => ({
          comment_id: c.comment_id,
          body: c.body,
          created_at: c.created_at,
          author_id: c.author_id,
          author_name: c.author_name,
          author_avatar_color: c.author_avatar_color,
        }))
        setComments(prev => ({ ...prev, [postId]: mapped }))
        setCommentsFetchedAt(prev => ({ ...prev, [postId]: Date.now() }))
      }
    } catch (err) {
      console.error('loadComments exception:', err)
    } finally {
      if (showLoading) setCommentsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isSupabaseConfigured && isAuthenticated && !authLoading) {
      loadCommunities()
      loadPoints()
      loadPendingInvites()
    }
  }, [isAuthenticated, authLoading, loadCommunities, loadPoints, loadPendingInvites])

  // Load comments when comments modal opens (with caching)
  // Cache is valid for 30 seconds; stale cache shows immediately while refreshing in background
  const COMMENTS_CACHE_TTL = 30 * 1000 // 30 seconds
  useEffect(() => {
    if (!showCommentsModal || !isSupabaseConfigured) return
    
    const postId = showCommentsModal
    const cachedAt = commentsFetchedAt[postId]
    const hasCached = cachedAt !== undefined // We fetched before (even if 0 comments)
    const isFresh = cachedAt && (Date.now() - cachedAt) < COMMENTS_CACHE_TTL
    
    if (hasCached && isFresh) {
      // Fresh cache: use it, no fetch needed
      return
    } else if (hasCached) {
      // Stale cache: show cached, refresh in background (no loading spinner)
      loadComments(postId, false)
    } else {
      // No cache: show loading and fetch
      loadComments(postId, true)
    }
    // Only re-run when modal opens/closes (postId changes), not when cache updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCommentsModal])

  // Get selected community
  const selectedCommunity = communities.find(c => c.id === selectedCommunityId)

  // Get posts for selected community
  const communityPosts = useMemo(() => {
    if (!selectedCommunityId) return []
    return posts
      .filter(p => p.community_id === selectedCommunityId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [selectedCommunityId, posts])

  // Get saved/bookmarked posts
  const savedPosts = useMemo(() => {
    return posts
      .filter(p => p.bookmarked_by_me)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [posts])

  // Calculate points (use Supabase when configured, else local calculation)
  const userPoints = useMemo(() => {
    if (isSupabaseConfigured) {
      return supabasePoints
    }
    const myPosts = posts.filter(p => p.author_id === currentUser.id)
    return myPosts.reduce((sum, p) => sum + p.like_count * POINTS_PER_LIKE, 0)
  }, [posts, supabasePoints, currentUser.id])

  // ============ Event Handlers ============
  const handleSelectCommunity = useCallback((communityId: string) => {
    const community = communities.find(c => c.id === communityId)
    setSelectedCommunityId(communityId)
    setShowActionMenu(false)
    // Content hidden until they join: show join-gate for city/university communities when not a member
    if (community && community.kind !== 'private' && !community.joined_by_me) {
      setViewMode('join-gate')
    } else {
      setViewMode('feed')
      // Load feed from Supabase
      if (isSupabaseConfigured) {
        loadFeed(communityId)
      }
    }
  }, [communities, loadFeed])

  const handleBackToPortal = () => {
    setViewMode('portal')
    setSelectedCommunityId(null)
    setShowActionMenu(false)
  }

  const handleViewSaved = useCallback(() => {
    setViewMode('saved')
    // Load saved deals from Supabase
    if (isSupabaseConfigured) {
      loadSavedDeals()
    }
  }, [loadSavedDeals])

  // Get friends who are members of Personal Friends
  const personalFriendsMembers = useMemo(() => {
    return friends.filter(f => f.is_member)
  }, [friends])

  // Get friends who are NOT members (can be added)
  const availableFriends = useMemo(() => {
    return friends.filter(f => !f.is_member)
  }, [friends])

  const handleAddFriend = (friendId: string) => {
    setFriends(prev => prev.map(f => 
      f.id === friendId ? { ...f, is_member: true } : f
    ))
    // Update community member count
    setCommunities(prev => prev.map(c => 
      (isPersonalFriendsCode(c.code ?? null) || c.id === 'personal') ? { ...c, member_count: c.member_count + 1 } : c
    ))
    showToast('Friend added to group!')
  }

  const handleRemoveFriend = (friendId: string) => {
    setFriends(prev => prev.map(f => 
      f.id === friendId ? { ...f, is_member: false } : f
    ))
    // Update community member count
    setCommunities(prev => prev.map(c => 
      (isPersonalFriendsCode(c.code ?? null) || c.id === 'personal') ? { ...c, member_count: Math.max(0, c.member_count - 1) } : c
    ))
    showToast('Friend removed from group')
  }

  const handleInviteByEmail = async (email: string) => {
    const personalFriends = communities.find(c => isPersonalFriendsCode(c.code ?? null) || c.id === 'personal')
    if (isSupabaseConfigured && personalFriends) {
      const { error } = await createInvite(personalFriends.id, email)
      if (error) {
        showToast(error, 'error')
        return
      }
      showToast(`Invite sent to ${email}!`)
      setShowInviteModal(false)
      loadCommunities()
      return
    }
    // Fallback when Supabase not configured: simulate
    const newFriend: Friend = {
      id: generateId(),
      name: email.split('@')[0],
      email,
      avatar_color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
      is_member: true,
    }
    setFriends(prev => [...prev, newFriend])
    setCommunities(prev => prev.map(c => 
      (isPersonalFriendsCode(c.code ?? null) || c.id === 'personal') ? { ...c, member_count: c.member_count + 1 } : c
    ))
    showToast(`Invite sent to ${email}!`)
    setShowInviteModal(false)
  }

  const handleJoinCommunity = useCallback(async (communityId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const { error } = await joinCommunity(communityId)
    if (error) {
      showToast(error, 'error')
      return
    }
    showToast('Joined community!')
    loadCommunities()
  }, [showToast, loadCommunities])

  const handleLeaveCommunity = useCallback(async (communityId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const { error } = await leaveCommunity(communityId)
    if (error) {
      showToast(error, 'error')
      return
    }
    showToast('Left community')
    loadCommunities()
  }, [showToast, loadCommunities])

  const handleTestCommunityQuery = useCallback(async () => {
    const result = await getVisibleCommunitiesWithCounts()
    console.log('getVisibleCommunitiesWithCounts:', result)
  }, [])

  // Handle accepting a community invite
  const handleAcceptCommunityInvite = useCallback(async (inviteId: string) => {
    const { error } = await acceptCommunityInvite(inviteId)
    if (error) {
      showToast(error, 'error')
      return
    }
    showToast('Invite accepted!')
    // Refresh data
    loadCommunities()
    loadPendingInvites()
  }, [showToast, loadCommunities, loadPendingInvites])

  // Handle declining a community invite
  const handleDeclineCommunityInvite = useCallback(async (inviteId: string) => {
    const { error } = await declineCommunityInvite(inviteId)
    if (error) {
      showToast(error, 'error')
      return
    }
    showToast('Invite declined')
    loadPendingInvites()
  }, [showToast, loadPendingInvites])

  const handleCopyInviteLink = async () => {
    const inviteLink = `${window.location.origin}/invite?group=personal&from=${currentUser.id}`
    try {
      await navigator.clipboard.writeText(inviteLink)
      showToast('Invite link copied!')
    } catch {
      showToast('Failed to copy link', 'error')
    }
  }

  const handleNewPost = useCallback(async (title: string, body: string, tag?: string, imageUrl?: string) => {
    if (!selectedCommunityId) return
    
    if (isSupabaseConfigured) {
      // Create post in Supabase
      const { data, error } = await createPostApi(
        selectedCommunityId,
        title,
        body,
        tag,
        tag ? '#3b82f6' : undefined
      )
      if (error) {
        showToast(error.message, 'error')
        return
      }
      // Reload feed to show new post
      await loadFeed(selectedCommunityId)
      setShowNewPostModal(false)
      setShowActionMenu(false)
      showToast('Deal shared!')
      return
    }
    
    // Fallback for mock mode
    const community = communities.find(c => c.id === selectedCommunityId)
    const newPost: Post = {
      post_id: generateId(),
      community_id: selectedCommunityId,
      title,
      body,
      tag: tag || null,
      tag_color: tag ? '#3b82f6' : null,
      image_url: imageUrl || null,
      created_at: new Date().toISOString(),
      author_id: currentUser.id,
      author_name: currentUser.name,
      author_avatar_color: currentUser.avatar_color,
      like_count: 0,
      comment_count: 0,
      liked_by_me: false,
      bookmarked_by_me: false,
      community_name: community?.name,
      community_emoji: community?.emoji,
    }
    
    setPosts(prev => [newPost, ...prev])
    setShowNewPostModal(false)
    setShowActionMenu(false)
    showToast('Deal shared!')
  }, [selectedCommunityId, communities, loadFeed, showToast])

  const handleLike = useCallback(async (postId: string) => {
    const post = posts.find(p => p.post_id === postId)
    if (!post) return
    
    if (isSupabaseConfigured) {
      // Optimistic update
      setPosts(prev => prev.map(p => {
        if (p.post_id === postId) {
          const newLiked = !p.liked_by_me
          return {
            ...p,
            liked_by_me: newLiked,
            like_count: newLiked ? p.like_count + 1 : p.like_count - 1,
          }
        }
        return p
      }))
      
      // Call Supabase
      const { liked, error } = await toggleLikeApi(postId, post.liked_by_me)
      if (error) {
        // Revert on error
        setPosts(prev => prev.map(p => {
          if (p.post_id === postId) {
            return {
              ...p,
              liked_by_me: post.liked_by_me,
              like_count: post.like_count,
            }
          }
          return p
        }))
        showToast(error.message, 'error')
      } else {
        // Confirm backend state matches (sync if different)
        setPosts(prev => prev.map(p => {
          if (p.post_id === postId && p.liked_by_me !== liked) {
            return { ...p, liked_by_me: liked }
          }
          return p
        }))
      }
      return
    }
    
    // Mock mode
    setPosts(prev => prev.map(p => {
      if (p.post_id === postId) {
        const newLiked = !p.liked_by_me
        return {
          ...p,
          liked_by_me: newLiked,
          like_count: newLiked ? p.like_count + 1 : p.like_count - 1,
        }
      }
      return p
    }))
  }, [posts, showToast])

  const handleBookmark = useCallback(async (postId: string) => {
    const post = posts.find(p => p.post_id === postId)
    if (!post) return
    
    if (isSupabaseConfigured) {
      // Optimistic update
      const wasBookmarked = post.bookmarked_by_me
      setPosts(prev => prev.map(p => {
        if (p.post_id === postId) {
          return { ...p, bookmarked_by_me: !wasBookmarked }
        }
        return p
      }))
      
      if (!wasBookmarked) {
        showToast('Saved!')
      } else {
        showToast('Removed from saved')
      }
      
      // Call Supabase
      const { bookmarked, error } = await toggleBookmarkApi(postId, wasBookmarked)
      if (error) {
        // Revert on error
        setPosts(prev => prev.map(p => {
          if (p.post_id === postId) {
            return { ...p, bookmarked_by_me: wasBookmarked }
          }
          return p
        }))
        showToast(error.message, 'error')
      } else {
        // Confirm backend state matches (sync if different)
        setPosts(prev => prev.map(p => {
          if (p.post_id === postId && p.bookmarked_by_me !== bookmarked) {
            return { ...p, bookmarked_by_me: bookmarked }
          }
          return p
        }))
      }
      return
    }
    
    // Mock mode
    setPosts(prev => prev.map(p => {
      if (p.post_id === postId) {
        const newBookmarked = !p.bookmarked_by_me
        if (newBookmarked) {
          showToast('Saved!')
        } else {
          showToast('Removed from saved')
        }
        return { ...p, bookmarked_by_me: newBookmarked }
      }
      return p
    }))
  }, [posts, showToast])

  const handleAddComment = useCallback(async (postId: string, body: string) => {
    if (isSupabaseConfigured) {
      const { data, error } = await addCommentApi(postId, body)
      if (error) {
        showToast(error.message, 'error')
        return
      }
      // Reload comments (background, no spinner since we just added)
      await loadComments(postId, false)
      // Update post comment count
      setPosts(prev => prev.map(p => {
        if (p.post_id === postId) {
          return { ...p, comment_count: p.comment_count + 1 }
        }
        return p
      }))
      showToast('Comment added!')
      return
    }
    
    // Mock mode
    const newComment: Comment = {
      comment_id: generateId(),
      body,
      created_at: new Date().toISOString(),
      author_id: currentUser.id,
      author_name: currentUser.name,
      author_avatar_color: currentUser.avatar_color,
    }
    
    setComments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newComment],
    }))
    setCommentsFetchedAt(prev => ({ ...prev, [postId]: Date.now() }))
    
    setPosts(prev => prev.map(p => {
      if (p.post_id === postId) {
        return { ...p, comment_count: p.comment_count + 1 }
      }
      return p
    }))
    
    showToast('Comment added!')
  }, [loadComments, showToast])

  const handleShare = async (postId: string) => {
    const post = posts.find(p => p.post_id === postId)
    const communityId = post?.community_id || selectedCommunityId
    const url = `${window.location.origin}/community?c=${communityId}&p=${postId}`
    
    // Try native share first (works great on mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title || 'Check out this deal!',
          text: post?.body?.slice(0, 100) || '',
          url: url,
        })
        showToast('Shared successfully!')
        return
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
        if ((err as Error).name !== 'AbortError') {
          console.log('Share failed, copying to clipboard')
        }
      }
    }
    
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link copied to clipboard!')
    } catch {
      // Final fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      showToast('Link copied to clipboard!')
    }
  }

  // ============ Render ============
  return (
    <div className="community-page">
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* Toast */}
      {toast && (
        <div className={`community-toast ${toast.type}`}>
          {toast.type === 'success' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          )}
          {toast.message}
        </div>
      )}

      {/* ============ PORTAL VIEW ============ */}
      {viewMode === 'portal' && (
        <div className="community-portal">
          {/* Header */}
          <header className="community-header">
            <div className="community-header-left">
              <Link href="/" className="community-back-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </Link>
              <div>
                <h1 className="community-header-title">Community Deals</h1>
                <p className="community-header-subtitle">Share & discover savings</p>
              </div>
            </div>
            <div className="community-header-right">
              <button 
                className="community-saved-btn"
                onClick={handleViewSaved}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                {savedPosts.length > 0 && (
                  <span className="community-saved-count">{savedPosts.length}</span>
                )}
              </button>
              <div className="community-points-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9"/>
                  <circle cx="12" cy="12" r="5" strokeWidth="1.5"/>
                </svg>
                {userPoints} pts
              </div>
              <Link href="/?panel=account" className="community-avatar-link" aria-label="Profile">
                <div 
                  className="community-avatar" 
                  style={{ background: currentUser.avatar_color }}
                >
                  {getInitials(currentUser.name)}
                </div>
              </Link>
            </div>
          </header>

          {/* Dev Mode Banner (only shown when Supabase is NOT configured) */}
          {!isSupabaseConfigured && (
            <div className="community-dev-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Dev Mode - Data stored locally</span>
            </div>
          )}

          {/* How Points Work */}
          <div className="community-points-explainer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9"/>
              <circle cx="12" cy="12" r="5" strokeWidth="1.5"/>
            </svg>
            <span>Earn {POINTS_PER_LIKE} points for each like on your posts!</span>
          </div>

          {/* Pending Community Invites */}
          {pendingCommunityInvites.length > 0 && (
            <div className="community-invites-section">
              <h2 className="community-section-title">Pending Invites</h2>
              <div className="community-invites-list">
                {pendingCommunityInvites.map(invite => (
                  <div key={invite.id} className="community-invite-card">
                    <div className="community-invite-info">
                      <span className="community-invite-emoji">{invite.community_emoji ?? '👥'}</span>
                      <div className="community-invite-details">
                        <span className="community-invite-name">{invite.community_name || 'Community'}</span>
                        <span className="community-invite-from">from {invite.inviter_name || 'someone'}</span>
                      </div>
                    </div>
                    <div className="community-invite-actions">
                      <button 
                        className="community-invite-accept"
                        onClick={() => handleAcceptCommunityInvite(invite.id)}
                      >
                        Accept
                      </button>
                      <button 
                        className="community-invite-decline"
                        onClick={() => handleDeclineCommunityInvite(invite.id)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Communities Section */}
          <div className="community-section">
            <h2 className="community-section-title">Your Communities</h2>
            {communitiesError && (
              <p className="community-inline-error">{communitiesError}</p>
            )}
            {communitiesLoading && (
              <p className="community-loading-text">Loading communities…</p>
            )}
            <div className="community-groups-grid">
              {communities.map(community => (
                <div
                  key={community.id}
                  role="button"
                  tabIndex={0}
                  className={`community-group-card ${community.kind === 'private' ? 'personal' : ''}`}
                  onClick={() => handleSelectCommunity(community.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectCommunity(community.id); } }}
                >
                  {community.image_url ? (
                    <div 
                      className="community-group-image"
                      style={{ backgroundImage: `url(${community.image_url})` }}
                    >
                      <div className="community-group-image-overlay" />
                      {community.emoji ? <span className="community-group-emoji-overlay">{community.emoji}</span> : null}
                    </div>
                  ) : (
                    <div className={`community-group-placeholder ${community.kind === 'private' ? 'personal' : ''}`}>
                      {community.emoji ? <span className="community-group-emoji">{community.emoji}</span> : <span className="community-group-emoji">👥</span>}
                    </div>
                  )}
                  <div className="community-group-info">
                    <span className="community-group-name">{community.name}</span>
                    <span className="community-group-members">
                      {community.member_count} {community.kind === 'private' ? 'friends' : 'members'}
                    </span>
                  </div>
                  {community.kind !== 'private' && (
                    <div className="community-group-action" onClick={(e) => e.stopPropagation()}>
                      {community.joined_by_me ? (
                        <button
                          type="button"
                          className="community-join-btn leave"
                          onClick={(e) => handleLeaveCommunity(community.id, e)}
                        >
                          Leave
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="community-join-btn join"
                          onClick={(e) => handleJoinCommunity(community.id, e)}
                        >
                          Join
                        </button>
                      )}
                    </div>
                  )}
                  <div className="community-group-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
            {process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' && (
              <button
                type="button"
                className="community-test-query-btn"
                onClick={handleTestCommunityQuery}
              >
                Test Community Query
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============ SAVED VIEW ============ */}
      {viewMode === 'saved' && (
        <div className="community-saved">
          <header className="community-feed-header">
            <button className="community-back-btn" onClick={handleBackToPortal}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="community-feed-title-area">
              <span className="community-feed-emoji">🔖</span>
              <div>
                <h1 className="community-feed-title">Saved Deals</h1>
                <p className="community-feed-members">{savedPosts.length} saved</p>
              </div>
            </div>
          </header>

          <div className="community-posts">
            {savedPosts.length === 0 ? (
              <div className="community-empty">
                <p>No saved deals yet</p>
                <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>Tap the bookmark icon on any deal to save it here!</p>
              </div>
            ) : (
              savedPosts.map(post => (
                <PostCard
                  key={post.post_id}
                  post={post}
                  showCommunity={true}
                  currentUserId={currentUser.id}
                  onLike={() => handleLike(post.post_id)}
                  onBookmark={() => handleBookmark(post.post_id)}
                  onComment={() => setShowCommentsModal(post.post_id)}
                  onShare={() => handleShare(post.post_id)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ============ JOIN GATE (content hidden until Join) ============ */}
      {viewMode === 'join-gate' && selectedCommunity && (
        <div className="community-join-gate">
          <header className="community-feed-header">
            <button className="community-back-btn" onClick={handleBackToPortal}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="community-feed-title-area">
              {selectedCommunity.emoji ? <span className="community-feed-emoji">{selectedCommunity.emoji}</span> : null}
              <div>
                <h1 className="community-feed-title">{selectedCommunity.name}</h1>
                <p className="community-feed-members">
                  {selectedCommunity.member_count} {selectedCommunity.kind === 'private' ? 'friends' : 'members'}
                </p>
              </div>
            </div>
          </header>
          <div className="community-join-gate-content">
            <div className="community-join-gate-card">
              {canJoinMinervaCommunities ? (
                <>
                  <p className="community-join-gate-message">Join this community to see deals and posts.</p>
                  <button
                    type="button"
                    className="community-join-gate-btn"
                    onClick={async () => {
                      const { error } = await joinCommunity(selectedCommunity.id)
                      if (error) {
                        showToast(error, 'error')
                        return
                      }
                      showToast('Joined!')
                      await loadCommunities()
                      setViewMode('feed')
                    }}
                  >
                    Join
                  </button>
                </>
              ) : (
                <>
                  <h2 className="community-join-gate-title">Only Minerva students can join</h2>
                  <p className="community-join-gate-message">
                    This community is for students with a <strong>@uni.minerva.edu</strong> email.
                  </p>
                  <p className="community-join-gate-hint">
                    If you have a Minerva email, log out and sign back in with it to join.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ FEED VIEW ============ */}
      {viewMode === 'feed' && selectedCommunity && selectedCommunity.joined_by_me && (
        <div className="community-feed">
          {/* Feed Header */}
          <header className="community-feed-header">
            <button className="community-back-btn" onClick={handleBackToPortal}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="community-feed-title-area">
              {selectedCommunity.emoji ? <span className="community-feed-emoji">{selectedCommunity.emoji}</span> : null}
              <div>
                <h1 className="community-feed-title">{selectedCommunity.name}</h1>
                <p className="community-feed-members">
                  {selectedCommunity.member_count} {selectedCommunity.kind === 'private' ? 'friends' : 'members'}
                </p>
              </div>
            </div>
            <div className="community-feed-header-right">
              {/* Manage Friends button for Personal Friends */}
              {(isPersonalFriendsCode(selectedCommunity.code ?? null) || selectedCommunity.id === 'personal') && (
                <button 
                  className="community-manage-friends-btn"
                  onClick={() => setShowFriendsModal(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </button>
              )}
              <div className="community-points-badge small">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9"/>
                  <circle cx="12" cy="12" r="5" strokeWidth="1.5"/>
                </svg>
                {userPoints}
              </div>
            </div>
          </header>

          {/* Posts List */}
          <div className="community-posts">
            {communityPosts.length === 0 ? (
              <div className="community-empty">
                <p>No deals shared yet in this community</p>
                <button 
                  className="community-empty-btn"
                  onClick={() => setShowNewPostModal(true)}
                >
                  Share the first deal!
                </button>
              </div>
            ) : (
              communityPosts.map(post => (
                <PostCard
                  key={post.post_id}
                  post={post}
                  showCommunity={false}
                  currentUserId={currentUser.id}
                  onLike={() => handleLike(post.post_id)}
                  onBookmark={() => handleBookmark(post.post_id)}
                  onComment={() => setShowCommentsModal(post.post_id)}
                  onShare={() => handleShare(post.post_id)}
                />
              ))
            )}
            
            {/* Load More Button */}
            {isSupabaseConfigured && postsHasMore && !postsLoading && communityPosts.length > 0 && (
              <button 
                className="community-load-more-btn"
                onClick={loadMorePosts}
                disabled={postsLoadingMore}
              >
                {postsLoadingMore ? (
                  <>
                    <span className="community-load-more-spinner" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            )}
          </div>

          {/* Floating Action Button */}
          <div className="community-fab-container">
            {showActionMenu && (
              <div className="community-action-menu">
                <button 
                  className="community-action-menu-item"
                  onClick={() => {
                    setShowNewPostModal(true)
                    setShowActionMenu(false)
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Share a deal
                </button>
              </div>
            )}
            <button 
              className={`community-fab ${showActionMenu ? 'active' : ''}`}
              onClick={() => setShowActionMenu(!showActionMenu)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ============ NEW POST MODAL ============ */}
      {showNewPostModal && (
        <NewPostModal
          userName={currentUser.name}
          avatarColor={currentUser.avatar_color}
          onClose={() => setShowNewPostModal(false)}
          onSubmit={handleNewPost}
        />
      )}

      {/* ============ COMMENTS MODAL ============ */}
      {showCommentsModal && (
        <CommentsModal
          postId={showCommentsModal}
          post={posts.find(p => p.post_id === showCommentsModal)!}
          comments={comments[showCommentsModal] || []}
          currentUserId={currentUser.id}
          currentUserName={currentUser.name}
          currentUserAvatarColor={currentUser.avatar_color}
          onClose={() => setShowCommentsModal(null)}
          onAddComment={(body) => handleAddComment(showCommentsModal, body)}
        />
      )}

      {/* ============ FRIENDS MODAL ============ */}
      {showFriendsModal && (
        <FriendsModal
          members={personalFriendsMembers}
          availableFriends={availableFriends}
          onClose={() => setShowFriendsModal(false)}
          onAddFriend={handleAddFriend}
          onRemoveFriend={handleRemoveFriend}
          onInviteNew={() => {
            setShowFriendsModal(false)
            setShowInviteModal(true)
          }}
        />
      )}

      {/* ============ INVITE MODAL ============ */}
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onInviteByEmail={handleInviteByEmail}
          onCopyLink={handleCopyInviteLink}
        />
      )}

      {/* Click outside to close action menu */}
      {showActionMenu && (
        <div 
          className="community-action-overlay"
          onClick={() => setShowActionMenu(false)}
        />
      )}
    </div>
  )
}

// ============ Post Card Component ============
interface PostCardProps {
  post: Post
  showCommunity: boolean
  currentUserId: string
  onLike: () => void
  onBookmark: () => void
  onComment: () => void
  onShare: () => void
}

function PostCard({ post, showCommunity, currentUserId, onLike, onBookmark, onComment, onShare }: PostCardProps) {
  const pointsEarned = post.like_count * POINTS_PER_LIKE
  const isOwnPost = post.author_id === currentUserId
  
  return (
    <article className="community-post-card">
      {/* Community Badge (for saved view) */}
      {showCommunity && post.community_name && (
        <div className="community-post-source">
          {post.community_emoji ? <span className="community-post-source-emoji">{post.community_emoji}</span> : null}
          <span>{post.community_name}</span>
        </div>
      )}

      {/* Post Header */}
      <div className="community-post-header">
        <div className="community-post-user">
          <div 
            className="community-post-avatar"
            style={{ background: post.author_avatar_color }}
          >
            {getInitials(post.author_name)}
          </div>
          <div className="community-post-user-info">
            <span className="community-post-user-name">{post.author_name}</span>
            <span className="community-post-date">{formatDate(post.created_at)}</span>
          </div>
        </div>
        {post.tag && (
          <span 
            className="community-post-tag"
            style={{ background: post.tag_color || '#3b82f6' }}
          >
            {post.tag}
          </span>
        )}
      </div>

      {/* Post Content */}
      <div className="community-post-content">
        <h3 className="community-post-title">{post.title}</h3>
        <p className="community-post-text">{post.body}</p>
        {post.image_url && (
          <div className="community-post-image">
            <img src={post.image_url} alt={post.title} />
          </div>
        )}
      </div>

      {/* Post Points (only show if it's your post and has likes) */}
      {isOwnPost && pointsEarned > 0 && (
        <div className="community-post-points">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9"/>
            <circle cx="12" cy="12" r="5" strokeWidth="1.5"/>
          </svg>
          +{pointsEarned} pts earned
        </div>
      )}

      {/* Post Actions */}
      <div className="community-post-actions">
        <button 
          className={`community-post-action ${post.liked_by_me ? 'liked' : ''}`}
          onClick={onLike}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={post.liked_by_me ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span>{post.like_count}</span>
        </button>
        <button 
          className="community-post-action"
          onClick={onComment}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
          <span>{post.comment_count}</span>
        </button>
        <button 
          className={`community-post-action ${post.bookmarked_by_me ? 'bookmarked' : ''}`}
          onClick={onBookmark}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={post.bookmarked_by_me ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        <button 
          className="community-post-action"
          onClick={onShare}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>
    </article>
  )
}

// ============ New Post Modal Component ============
interface NewPostModalProps {
  userName: string
  avatarColor: string
  onClose: () => void
  onSubmit: (title: string, body: string, tag?: string, imageUrl?: string) => void
}

function NewPostModal({ userName, avatarColor, onClose, onSubmit }: NewPostModalProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tag, setTag] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB')
        return
      }
      // Create preview URL
      const reader = new FileReader()
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    onSubmit(title.trim(), body.trim(), tag.trim() || undefined, imagePreview || undefined)
  }

  const isValid = title.trim().length > 0 && body.trim().length > 0

  return (
    <div className="community-modal-overlay" onClick={onClose}>
      <div className="community-modal" onClick={e => e.stopPropagation()}>
        <div className="community-modal-header">
          <h2>Share a Deal</h2>
          <button className="community-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="community-modal-form">
          {/* User Info */}
          <div className="community-modal-user">
            <div className="community-modal-avatar" style={{ background: avatarColor }}>
              {getInitials(userName)}
            </div>
            <div>
              <span className="community-modal-username">{userName}</span>
              <span className="community-modal-points-hint">Earn {POINTS_PER_LIKE} pts per like!</span>
            </div>
          </div>

          {/* Title Input */}
          <input
            type="text"
            placeholder="Deal title (e.g., 50% off at...)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="community-modal-input"
            autoFocus
          />

          {/* Body Textarea */}
          <textarea
            placeholder="Share the details - where, when, how much..."
            value={body}
            onChange={e => setBody(e.target.value)}
            className="community-modal-textarea"
            rows={4}
          />

          {/* Tag Input */}
          <input
            type="text"
            placeholder="Tag (optional, e.g., Food, Shopping)"
            value={tag}
            onChange={e => setTag(e.target.value)}
            className="community-modal-input community-modal-tag-input"
          />

          {/* Image Preview */}
          {imagePreview && (
            <div className="community-modal-image-preview">
              <img src={imagePreview} alt="Preview" />
              <button 
                type="button" 
                className="community-modal-image-remove"
                onClick={handleRemoveImage}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="community-modal-actions">
            <label className="community-modal-attach">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span>Add Photo</span>
            </label>
            <button 
              type="submit" 
              className="community-modal-submit"
              disabled={!isValid}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
              </svg>
              Share
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============ Comments Modal Component ============
interface CommentsModalProps {
  postId: string
  post: Post
  comments: Comment[]
  currentUserId: string
  currentUserName: string
  currentUserAvatarColor: string
  onClose: () => void
  onAddComment: (body: string) => void
}

function CommentsModal({ postId, post, comments, currentUserId, currentUserName, currentUserAvatarColor, onClose, onAddComment }: CommentsModalProps) {
  const [newComment, setNewComment] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    onAddComment(newComment.trim())
    setNewComment('')
  }

  return (
    <div className="community-modal-overlay" onClick={onClose}>
      <div className="community-modal" onClick={e => e.stopPropagation()}>
        <div className="community-modal-header">
          <h2>Comments</h2>
          <button className="community-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="community-comments-content">
          {/* Original Post Summary */}
          <div className="community-comments-post">
            <h4>{post?.title || 'Post'}</h4>
            <p>{post?.body ? (post.body.slice(0, 100) + (post.body.length > 100 ? '...' : '')) : ''}</p>
          </div>

          {/* Comments List */}
          <div className="community-comments-list">
            {comments.length === 0 ? (
              <div className="community-comments-empty">
                <p>No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              comments.map(comment => (
                <div key={comment.comment_id} className="community-comment-item">
                  <div 
                    className="community-comment-avatar"
                    style={{ background: comment.author_avatar_color }}
                  >
                    {getInitials(comment.author_name)}
                  </div>
                  <div className="community-comment-content">
                    <div className="community-comment-header">
                      <span className="community-comment-name">{comment.author_name}</span>
                      <span className="community-comment-date">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="community-comment-text">{comment.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Comment Form */}
          <form onSubmit={handleSubmit} className="community-comment-form">
            <input
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              className="community-comment-input"
              autoFocus
            />
            <button 
              type="submit" 
              className="community-comment-submit"
              disabled={!newComment.trim()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ============ Friends Modal Component ============
interface FriendsModalProps {
  members: Friend[]
  availableFriends: Friend[]
  onClose: () => void
  onAddFriend: (friendId: string) => void
  onRemoveFriend: (friendId: string) => void
  onInviteNew: () => void
}

function FriendsModal({ members, availableFriends, onClose, onAddFriend, onRemoveFriend, onInviteNew }: FriendsModalProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'add'>('members')

  return (
    <div className="community-modal-overlay" onClick={onClose}>
      <div className="community-modal" onClick={e => e.stopPropagation()}>
        <div className="community-modal-header">
          <h2>Manage Friends</h2>
          <button className="community-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="community-friends-tabs">
          <button 
            className={`community-friends-tab ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            Members ({members.length})
          </button>
          <button 
            className={`community-friends-tab ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            Add Friend
          </button>
        </div>

        <div className="community-friends-content">
          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="community-friends-list">
              {members.length === 0 ? (
                <div className="community-friends-empty">
                  <p>No friends in this group yet</p>
                  <button onClick={() => setActiveTab('add')} className="community-friends-empty-btn">
                    Add friends
                  </button>
                </div>
              ) : (
                members.map(friend => (
                  <div key={friend.id} className="community-friend-item">
                    <div 
                      className="community-friend-avatar"
                      style={{ background: friend.avatar_color }}
                    >
                      {getInitials(friend.name)}
                    </div>
                    <div className="community-friend-info">
                      <span className="community-friend-name">{friend.name}</span>
                      <span className="community-friend-email">{friend.email}</span>
                    </div>
                    <button 
                      className="community-friend-remove"
                      onClick={() => onRemoveFriend(friend.id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Add Friend Tab */}
          {activeTab === 'add' && (
            <div className="community-friends-list">
              {/* Available friends to add */}
              {availableFriends.length > 0 && (
                <>
                  <div className="community-friends-section-title">Friends you can add</div>
                  {availableFriends.map(friend => (
                    <div key={friend.id} className="community-friend-item">
                      <div 
                        className="community-friend-avatar"
                        style={{ background: friend.avatar_color }}
                      >
                        {getInitials(friend.name)}
                      </div>
                      <div className="community-friend-info">
                        <span className="community-friend-name">{friend.name}</span>
                        <span className="community-friend-email">{friend.email}</span>
                      </div>
                      <button 
                        className="community-friend-add"
                        onClick={() => onAddFriend(friend.id)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add
                      </button>
                    </div>
                  ))}
                </>
              )}

              {/* Invite new person */}
              <div className="community-friends-section-title" style={{ marginTop: availableFriends.length > 0 ? '16px' : 0 }}>
                Invite someone new
              </div>
              <button className="community-invite-btn" onClick={onInviteNew}>
                <div className="community-invite-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div className="community-invite-text">
                  <span className="community-invite-title">Invite via email or link</span>
                  <span className="community-invite-subtitle">Send an invite to join Budgieee</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ Invite Modal Component ============
interface InviteModalProps {
  onClose: () => void
  onInviteByEmail: (email: string) => void
  onCopyLink: () => void
}

function InviteModal({ onClose, onInviteByEmail, onCopyLink }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) return
    setSending(true)
    await onInviteByEmail(email.trim())
    setSending(false)
    setEmail('')
  }

  const isValidEmail = email.includes('@') && email.includes('.')

  return (
    <div className="community-modal-overlay" onClick={onClose}>
      <div className="community-modal community-modal-small" onClick={e => e.stopPropagation()}>
        <div className="community-modal-header">
          <h2>Invite Friend</h2>
          <button className="community-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="community-invite-content">
          {/* Email Invite */}
          <form onSubmit={handleSubmit} className="community-invite-form">
            <label>Send invite via email</label>
            <div className="community-invite-input-row">
              <input
                type="email"
                placeholder="friend@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="community-invite-input"
                disabled={sending}
              />
              <button 
                type="submit" 
                className="community-invite-send"
                disabled={!isValidEmail || sending}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>

          <div className="community-invite-divider">
            <span>or</span>
          </div>

          {/* Copy Link */}
          <button className="community-invite-link-btn" onClick={onCopyLink}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            Copy invite link
          </button>

          <p className="community-invite-note">
            They&apos;ll receive an invite to join your Personal Friends group on Budgieee.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============ Styles ============
const styles = `
  .community-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #050d18 0%, #0a1628 15%, #142136 35%, #1a2d4a 50%, #142136 65%, #0a1628 85%, #050d18 100%);
    color: #e2e8f0;
    padding-bottom: 40px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* ============ LOADING ============ */
  .community-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
    color: #94a3b8;
  }
  .community-loading-inline {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 20px;
    color: #94a3b8;
    font-size: 0.875rem;
  }
  .community-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: community-spin 0.8s linear infinite;
  }
  .community-spinner-small {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: community-spin 0.8s linear infinite;
  }
  @keyframes community-spin { to { transform: rotate(360deg); } }

  /* ============ AUTH REQUIRED ============ */
  .community-auth-required {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
    text-align: center;
  }
  .community-auth-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }
  .community-auth-required h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0 0 8px 0;
  }
  .community-auth-required p {
    color: #94a3b8;
    margin: 0 0 24px 0;
  }
  .community-auth-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
  }
  .community-auth-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
  }

  /* ============ TOAST ============ */
  .community-toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    border-radius: 12px;
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    z-index: 1100;
    animation: community-toast-in 0.3s ease-out;
  }
  .community-toast.success { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4); }
  .community-toast.error { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4); }
  @keyframes community-toast-in { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

  /* ============ HEADER ============ */
  .community-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    padding-top: calc(16px + env(safe-area-inset-top, 0px));
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .community-header-left { display: flex; align-items: center; gap: 12px; }
  .community-back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(255,255,255,0.06);
    border-radius: 10px;
    color: #94a3b8;
    text-decoration: none;
    border: none;
    cursor: pointer;
  }
  .community-back-btn:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
  .community-header-title { font-size: 1.25rem; font-weight: 600; color: #f1f5f9; margin: 0; }
  .community-header-subtitle { font-size: 0.75rem; color: #64748b; margin: 0; }
  .community-header-right { display: flex; align-items: center; gap: 12px; }
  .community-saved-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(255,255,255,0.06);
    border: none;
    border-radius: 10px;
    color: #94a3b8;
    cursor: pointer;
  }
  .community-saved-btn:hover { background: rgba(255,255,255,0.1); color: #fbbf24; }
  .community-points-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.1));
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 20px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #fbbf24;
  }
  .community-points-badge.small { padding: 4px 10px; font-size: 0.75rem; }
  .community-points-badge svg { color: #fbbf24; }
  .community-avatar-link {
    display: flex;
    text-decoration: none;
    cursor: pointer;
    border-radius: 50%;
  }
  .community-avatar-link:hover .community-avatar {
    filter: brightness(1.15);
  }
  .community-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
    color: white;
  }

  /* ============ DEV BANNER ============ */
  .community-dev-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 20px;
    background: rgba(59, 130, 246, 0.1);
    border-bottom: 1px solid rgba(59, 130, 246, 0.2);
    font-size: 0.75rem;
    color: #60a5fa;
  }

  /* ============ SAVED COUNT ============ */
  .community-saved-count {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    background: #fbbf24;
    border-radius: 9px;
    font-size: 0.65rem;
    font-weight: 700;
    color: #0d1a2d;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }

  /* ============ POINTS EXPLAINER ============ */
  .community-points-explainer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 20px;
    background: rgba(251, 191, 36, 0.08);
    border-bottom: 1px solid rgba(251, 191, 36, 0.15);
    font-size: 0.8125rem;
    color: #fbbf24;
  }

  /* ============ PORTAL VIEW ============ */
  .community-portal { padding: 0 0 20px 0; }
  .community-section { padding: 20px; }
  .community-section-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 16px 0;
  }
  /* Pending Community Invites */
  .community-invites-section {
    padding: 0 16px;
    margin-bottom: 24px;
  }
  .community-invites-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .community-invite-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 12px;
  }
  .community-invite-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .community-invite-emoji {
    font-size: 1.5rem;
  }
  .community-invite-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .community-invite-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e2e8f0;
  }
  .community-invite-from {
    font-size: 0.75rem;
    color: #94a3b8;
  }
  .community-invite-actions {
    display: flex;
    gap: 8px;
  }
  .community-invite-accept {
    padding: 6px 14px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .community-invite-accept:hover {
    background: #2563eb;
  }
  .community-invite-decline {
    padding: 6px 14px;
    background: transparent;
    color: #94a3b8;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .community-invite-decline:hover {
    background: rgba(255,255,255,0.05);
    color: #e2e8f0;
  }
  .community-groups-grid { display: flex; flex-direction: column; gap: 10px; }
  .community-group-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    width: 100%;
  }
  .community-group-card:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(59, 130, 246, 0.3);
    transform: translateX(4px);
  }
  .community-group-card.personal { border-color: rgba(139, 92, 246, 0.3); }
  .community-group-card.personal:hover { border-color: rgba(139, 92, 246, 0.5); }
  .community-group-image {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background-size: cover;
    background-position: center;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }
  .community-group-image-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(0,0,0,0.2), rgba(0,0,0,0.5));
  }
  .community-group-emoji-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }
  .community-group-placeholder {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .community-group-placeholder.personal {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2));
  }
  .community-group-emoji { font-size: 1.5rem; }
  .community-group-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; justify-content: center; }
  .community-group-name { font-weight: 600; color: #e2e8f0; font-size: 0.9375rem; }
  .community-group-members { font-size: 0.75rem; color: #64748b; }
  .community-group-action { flex-shrink: 0; display: flex; align-items: center; }
  .community-join-btn {
    min-height: 44px;
    min-width: 72px;
    padding: 10px 16px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  .community-join-btn.join {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
  }
  .community-join-btn.join:hover { filter: brightness(1.1); transform: scale(1.02); }
  .community-join-btn.join:active { transform: scale(0.98); }
  .community-join-btn.leave {
    background: rgba(34, 197, 94, 0.12);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }
  .community-join-btn.leave:hover { background: rgba(239, 68, 68, 0.12); color: #f87171; border-color: rgba(239, 68, 68, 0.35); }
  .community-group-arrow { color: #475569; flex-shrink: 0; }
  .community-inline-error { font-size: 0.8rem; color: #f87171; margin: 8px 0; }
  .community-loading-text { font-size: 0.8rem; color: #64748b; margin: 8px 0; }
  .community-test-query-btn {
    margin-top: 12px; font-size: 0.75rem; padding: 8px 12px; background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #94a3b8; cursor: pointer;
  }
  .community-test-query-btn:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }

  /* ============ EMPTY & REFRESH ============ */
  .community-empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #64748b;
  }
  .community-refresh-btn {
    margin-top: 12px;
    padding: 10px 20px;
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 10px;
    color: #60a5fa;
    font-weight: 500;
    cursor: pointer;
  }
  .community-refresh-btn:hover {
    background: rgba(59, 130, 246, 0.3);
  }

  /* ============ JOIN GATE (centered card) ============ */
  .community-join-gate {
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 80px);
  }
  .community-join-gate-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 20px;
  }
  .community-join-gate-card {
    max-width: 360px;
    width: 100%;
    padding: 28px 24px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .community-join-gate-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0;
    line-height: 1.3;
  }
  .community-join-gate-message {
    font-size: 0.9375rem;
    color: #cbd5e1;
    margin: 0;
    line-height: 1.45;
  }
  .community-join-gate-message strong {
    color: #e2e8f0;
    font-weight: 600;
  }
  .community-join-gate-hint {
    font-size: 0.875rem;
    color: #94a3b8;
    margin: 0;
    line-height: 1.4;
  }
  .community-join-gate-btn {
    margin-top: 4px;
    padding: 12px 24px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .community-join-gate-btn:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  /* ============ FEED VIEW ============ */
  .community-feed { padding-bottom: 100px; }
  .community-feed-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    position: sticky;
    top: 0;
    background: rgba(10, 22, 40, 0.95);
    backdrop-filter: blur(10px);
    z-index: 10;
  }
  .community-feed-title-area { display: flex; align-items: center; gap: 10px; flex: 1; }
  .community-feed-emoji {
    width: 40px;
    height: 40px;
    background: rgba(255,255,255,0.08);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
  }
  .community-feed-title { font-size: 1.125rem; font-weight: 600; color: #f1f5f9; margin: 0; }
  .community-feed-members { font-size: 0.7rem; color: #64748b; margin: 0; }
  .community-feed-header-right { display: flex; align-items: center; }
  .community-posts { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
  .community-empty {
    text-align: center;
    padding: 40px 20px;
    color: #64748b;
  }
  .community-empty-btn {
    margin-top: 12px;
    padding: 10px 20px;
    background: linear-gradient(135deg, #10b981, #059669);
    border: none;
    border-radius: 10px;
    color: white;
    font-weight: 500;
    cursor: pointer;
  }

  /* ============ POST SOURCE ============ */
  .community-post-source {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    font-size: 0.75rem;
    color: #64748b;
  }
  .community-post-source-emoji { font-size: 0.875rem; }

  /* ============ POST CARD ============ */
  .community-post-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 16px;
    transition: all 0.2s;
  }
  .community-post-card:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.12);
  }
  .community-post-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .community-post-user { display: flex; align-items: center; gap: 10px; }
  .community-post-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.75rem;
    color: white;
  }
  .community-post-user-info { display: flex; flex-direction: column; gap: 1px; }
  .community-post-user-name { font-weight: 600; font-size: 0.875rem; color: #e2e8f0; }
  .community-post-date { font-size: 0.7rem; color: #64748b; }
  .community-post-tag {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 600;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .community-post-content { margin-bottom: 12px; }
  .community-post-title {
    font-size: 1rem;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0 0 8px 0;
    line-height: 1.3;
  }
  .community-post-text {
    font-size: 0.875rem;
    color: #94a3b8;
    line-height: 1.5;
    margin: 0;
  }
  .community-post-image {
    margin-top: 12px;
    border-radius: 12px;
    overflow: hidden;
  }
  .community-post-image img {
    width: 100%;
    height: auto;
    max-height: 300px;
    object-fit: cover;
    display: block;
  }
  .community-post-points {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: rgba(251, 191, 36, 0.1);
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 600;
    color: #fbbf24;
    margin-bottom: 12px;
  }
  .community-post-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .community-post-action {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: none;
    border: none;
    border-radius: 8px;
    color: #64748b;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .community-post-action:hover { background: rgba(255,255,255,0.06); color: #94a3b8; }
  .community-post-action.liked { color: #f87171; }
  .community-post-action.bookmarked { color: #fbbf24; }

  /* ============ LOAD MORE BUTTON ============ */
  .community-load-more-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px 20px;
    margin-top: 16px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 12px;
    color: #3b82f6;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .community-load-more-btn:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.5);
  }
  .community-load-more-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  .community-load-more-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(59, 130, 246, 0.3);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ============ FLOATING ACTION BUTTON ============ */
  .community-fab-container {
    position: fixed;
    bottom: 88px; /* Above bottom nav (72px) + spacing */
    right: 20px;
    z-index: 100;
  }
  .community-action-menu {
    position: absolute;
    bottom: 70px;
    right: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: community-menu-in 0.2s ease-out;
  }
  @keyframes community-menu-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .community-action-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: rgba(30, 41, 59, 0.95);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    color: #e2e8f0;
    font-size: 0.9375rem;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    backdrop-filter: blur(10px);
  }
  .community-action-menu-item:hover { background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.3); }
  .community-action-menu-item svg { color: #34d399; }
  .community-fab {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981, #059669);
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
    transition: all 0.2s;
  }
  .community-fab:hover { transform: scale(1.08); }
  .community-fab.active { transform: rotate(45deg); background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4); }
  .community-action-overlay {
    position: fixed;
    inset: 0;
    z-index: 99;
  }

  /* ============ MODAL ============ */
  .community-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 1100;
    padding: 20px;
  }
  .community-modal {
    width: 100%;
    max-width: 480px;
    background: linear-gradient(180deg, #131f33 0%, #0d1a2d 100%);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 24px 24px 0 0;
    overflow: hidden;
  }
  @media (min-width: 640px) {
    .community-modal-overlay { align-items: center; }
    .community-modal { border-radius: 24px; }
  }
  .community-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .community-modal-header h2 { font-size: 1.125rem; font-weight: 600; color: #f1f5f9; margin: 0; }
  .community-modal-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(255,255,255,0.06);
    border: none;
    border-radius: 8px;
    color: #94a3b8;
    cursor: pointer;
  }
  .community-modal-close:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
  .community-modal-form { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
  .community-modal-user { display: flex; align-items: center; gap: 12px; }
  .community-modal-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
    color: white;
  }
  .community-modal-username { font-weight: 600; color: #e2e8f0; display: block; }
  .community-modal-points-hint { font-size: 0.75rem; color: #fbbf24; }
  .community-modal-input {
    padding: 14px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    color: #e2e8f0;
    font-size: 1rem;
    font-weight: 500;
    outline: none;
  }
  .community-modal-input:focus { border-color: #10b981; }
  .community-modal-input::placeholder { color: #475569; }
  .community-modal-input:disabled { opacity: 0.6; }
  .community-modal-tag-input { font-size: 0.875rem; }
  .community-modal-textarea {
    padding: 14px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    color: #e2e8f0;
    font-size: 0.9375rem;
    line-height: 1.5;
    outline: none;
    resize: none;
    min-height: 100px;
  }
  .community-modal-textarea:focus { border-color: #10b981; }
  .community-modal-textarea::placeholder { color: #475569; }
  .community-modal-textarea:disabled { opacity: 0.6; }
  .community-modal-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 8px;
  }
  .community-modal-attach {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(255,255,255,0.06);
    border: none;
    border-radius: 10px;
    color: #64748b;
    cursor: pointer;
    font-size: 0.8125rem;
  }
  .community-modal-attach:hover { background: rgba(255,255,255,0.1); color: #94a3b8; }
  .community-modal-attach:disabled { opacity: 0.5; cursor: not-allowed; }

  .community-modal-image-preview {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    max-height: 200px;
  }
  .community-modal-image-preview img {
    width: 100%;
    height: auto;
    max-height: 200px;
    object-fit: cover;
    display: block;
  }
  .community-modal-image-remove {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    background: rgba(0,0,0,0.7);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .community-modal-image-remove:hover { background: #ef4444; }
  .community-modal-submit {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: linear-gradient(135deg, #10b981, #059669);
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .community-modal-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3); }
  .community-modal-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ============ COMMENTS MODAL ============ */
  .community-comments-content { display: flex; flex-direction: column; max-height: 70vh; }
  .community-comments-post {
    padding: 16px 24px;
    background: rgba(255,255,255,0.03);
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .community-comments-post h4 { font-size: 0.9375rem; font-weight: 600; color: #e2e8f0; margin: 0 0 4px 0; }
  .community-comments-post p { font-size: 0.8125rem; color: #94a3b8; margin: 0; line-height: 1.4; }
  .community-comments-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 300px;
  }
  .community-comments-empty { text-align: center; padding: 20px; color: #64748b; font-size: 0.875rem; }
  .community-comment-item { display: flex; gap: 10px; }
  .community-comment-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 600;
    color: white;
    flex-shrink: 0;
  }
  .community-comment-content { flex: 1; }
  .community-comment-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .community-comment-name { font-size: 0.8125rem; font-weight: 600; color: #e2e8f0; }
  .community-comment-date { font-size: 0.7rem; color: #64748b; }
  .community-comment-text { font-size: 0.875rem; color: #cbd5e1; line-height: 1.4; margin: 0; }
  .community-comment-form {
    display: flex;
    gap: 10px;
    padding: 16px 24px;
    border-top: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.02);
  }
  .community-comment-input {
    flex: 1;
    padding: 12px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 24px;
    color: #e2e8f0;
    font-size: 0.9375rem;
    outline: none;
  }
  .community-comment-input:focus { border-color: #10b981; }
  .community-comment-input::placeholder { color: #475569; }
  .community-comment-input:disabled { opacity: 0.6; }
  .community-comment-submit {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, #10b981, #059669);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .community-comment-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .community-comment-submit:hover:not(:disabled) { transform: scale(1.05); }

  /* ============ MANAGE FRIENDS BUTTON ============ */
  .community-manage-friends-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(255,255,255,0.06);
    border: none;
    border-radius: 10px;
    color: #94a3b8;
    cursor: pointer;
    margin-right: 8px;
  }
  .community-manage-friends-btn:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }

  /* ============ FRIENDS MODAL ============ */
  .community-friends-tabs {
    display: flex;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .community-friends-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 16px;
    background: none;
    border: none;
    color: #64748b;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }
  .community-friends-tab:hover { color: #94a3b8; background: rgba(255,255,255,0.02); }
  .community-friends-tab.active { color: #60a5fa; border-bottom-color: #3b82f6; }
  .community-friends-content { padding: 16px 24px; max-height: 400px; overflow-y: auto; }
  .community-friends-list { display: flex; flex-direction: column; gap: 8px; }
  .community-friends-empty {
    text-align: center;
    padding: 32px 16px;
    color: #64748b;
  }
  .community-friends-empty p { margin: 0 0 16px 0; }
  .community-friends-empty-btn {
    padding: 10px 20px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border: none;
    border-radius: 10px;
    color: white;
    font-weight: 500;
    cursor: pointer;
  }
  .community-friends-section-title {
    font-size: 0.7rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }
  .community-friend-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
  }
  .community-friend-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
    color: white;
    flex-shrink: 0;
  }
  .community-friend-info { flex: 1; min-width: 0; }
  .community-friend-name { display: block; font-weight: 500; color: #e2e8f0; font-size: 0.9375rem; }
  .community-friend-email { display: block; font-size: 0.75rem; color: #64748b; margin-top: 2px; }
  .community-friend-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(239, 68, 68, 0.1);
    border: none;
    border-radius: 8px;
    color: #f87171;
    cursor: pointer;
  }
  .community-friend-remove:hover { background: rgba(239, 68, 68, 0.2); }
  .community-friend-add {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(59, 130, 246, 0.1);
    border: none;
    border-radius: 8px;
    color: #60a5fa;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
  }
  .community-friend-add:hover { background: rgba(59, 130, 246, 0.2); }
  .community-invite-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 14px;
    background: rgba(255,255,255,0.03);
    border: 1px dashed rgba(255,255,255,0.15);
    border-radius: 12px;
    cursor: pointer;
    text-align: left;
  }
  .community-invite-btn:hover { background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.3); }
  .community-invite-icon {
    width: 40px;
    height: 40px;
    background: rgba(59, 130, 246, 0.15);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #60a5fa;
    flex-shrink: 0;
  }
  .community-invite-text { flex: 1; }
  .community-invite-title { display: block; font-weight: 500; color: #e2e8f0; font-size: 0.9375rem; }
  .community-invite-subtitle { display: block; font-size: 0.75rem; color: #64748b; margin-top: 2px; }
  .community-invite-btn > svg:last-child { color: #64748b; flex-shrink: 0; }

  /* ============ INVITE MODAL ============ */
  .community-modal-small { max-width: 400px; }
  .community-invite-content { padding: 20px 24px; }
  .community-invite-form { display: flex; flex-direction: column; gap: 8px; }
  .community-invite-form label { font-size: 0.8125rem; font-weight: 500; color: #94a3b8; }
  .community-invite-input-row { display: flex; gap: 8px; }
  .community-invite-input {
    flex: 1;
    padding: 12px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #e2e8f0;
    font-size: 0.9375rem;
    outline: none;
  }
  .community-invite-input:focus { border-color: #3b82f6; }
  .community-invite-input::placeholder { color: #475569; }
  .community-invite-send {
    padding: 12px 20px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border: none;
    border-radius: 10px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
  .community-invite-send:disabled { opacity: 0.5; cursor: not-allowed; }
  .community-invite-send:hover:not(:disabled) { transform: translateY(-1px); }
  .community-invite-divider {
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 20px 0;
    color: #475569;
    font-size: 0.75rem;
  }
  .community-invite-divider::before,
  .community-invite-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.1);
  }
  .community-invite-link-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 14px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #e2e8f0;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
  }
  .community-invite-link-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); }
  .community-invite-note {
    margin: 16px 0 0 0;
    font-size: 0.8125rem;
    color: #64748b;
    text-align: center;
    line-height: 1.5;
  }

  /* ============ RESPONSIVE ============ */
  @media (max-width: 480px) {
    .community-section { padding: 16px; }
    .community-posts { padding: 12px 16px; }
    .community-post-card { padding: 14px; }
  }
`
