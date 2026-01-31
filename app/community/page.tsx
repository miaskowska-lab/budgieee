'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'

// ============================================
// COMMUNITY DEALS - Budgieee
// Frontend only with mock data
// Points system: You earn 2 points per like on your posts
// ============================================

// ============ Types ============
interface User {
  id: string
  name: string
  email?: string
  avatar: string | null
}

interface Community {
  id: string
  name: string
  image: string | null
  emoji: string
  memberCount: number
  description: string
  isPersonal?: boolean
}

interface Post {
  id: string
  communityId: string
  userId: string
  title: string
  content: string
  tag?: string
  tagColor?: string
  createdAt: Date
  likes: number
  comments: number
}

interface Comment {
  id: string
  postId: string
  userId: string
  content: string
  createdAt: Date
}

interface PersonalFriend {
  id: string
  name: string
  email: string
  pending?: boolean
}

// ============ Mock Data ============
const CURRENT_USER: User = {
  id: 'me',
  name: 'You',
  email: 'you@minerva.edu',
  avatar: null,
}

const MOCK_USERS: User[] = [
  { id: 'user-1', name: 'Sarah Chen', avatar: null },
  { id: 'user-2', name: 'Marcus Johnson', avatar: null },
  { id: 'user-3', name: 'Katia Rodriguez', avatar: null },
  { id: 'user-4', name: 'Alex Kim', avatar: null },
  { id: 'user-5', name: 'Emma Davis', avatar: null },
  { id: 'user-6', name: 'Yuki Tanaka', avatar: null },
  { id: 'user-7', name: 'Priya Sharma', avatar: null },
  { id: 'user-8', name: 'Luis Hernandez', avatar: null },
]

const MOCK_COMMUNITIES: Community[] = [
  {
    id: 'sf',
    name: 'Minerva San Francisco',
    image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=200&fit=crop',
    emoji: '🌉',
    memberCount: 156,
    description: 'SF rotation deals & tips',
  },
  {
    id: 'buenos-aires',
    name: 'Minerva Buenos Aires',
    image: 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=400&h=200&fit=crop',
    emoji: '🇦🇷',
    memberCount: 142,
    description: 'BA rotation deals & tips',
  },
  {
    id: 'hyderabad',
    name: 'Minerva Hyderabad',
    image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=400&h=200&fit=crop',
    emoji: '🇮🇳',
    memberCount: 138,
    description: 'Hyderabad rotation deals & tips',
  },
  {
    id: 'tokyo',
    name: 'Minerva Tokyo',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=200&fit=crop',
    emoji: '🇯🇵',
    memberCount: 145,
    description: 'Tokyo rotation deals & tips',
  },
  {
    id: 'berlin',
    name: 'Minerva Berlin',
    image: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&h=200&fit=crop',
    emoji: '🇩🇪',
    memberCount: 151,
    description: 'Berlin rotation deals & tips',
  },
  {
    id: 'personal',
    name: 'Personal Friends',
    image: null,
    emoji: '👥',
    memberCount: 5,
    description: 'Share deals with your close circle',
    isPersonal: true,
  },
]

const INITIAL_POSTS: Post[] = [
  // San Francisco posts
  {
    id: 'post-sf-1',
    communityId: 'sf',
    userId: 'user-1',
    title: 'Here is a very good deal',
    content: 'Veggie meatballs is only $3 on every Monday at IKEA Emeryville! The portion is huge and perfect for students on a budget. They also have free coffee refills if you have the IKEA Family card.',
    tag: 'IKEA',
    tagColor: '#0058a3',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    likes: 47,
    comments: 12,
  },
  {
    id: 'post-sf-2',
    communityId: 'sf',
    userId: 'user-3',
    title: 'Free cookies at Turk St cafe!',
    content: 'Katia is giving free cookies to anyone who mentions they\'re from Minerva at the new cafe on Turk Street. She\'s the owner and loves supporting students! Open until 6pm.',
    tag: 'Food',
    tagColor: '#059669',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    likes: 83,
    comments: 24,
  },
  {
    id: 'post-sf-3',
    communityId: 'sf',
    userId: 'user-2',
    title: 'PSA: "Free" trial scam',
    content: 'LOLLL that "free trial" for the meal prep app is a total scam. They charge you $49.99 after 3 days and it\'s impossible to cancel. Don\'t fall for it like I did 😭',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    likes: 156,
    comments: 43,
  },
  // Buenos Aires posts
  {
    id: 'post-ba-1',
    communityId: 'buenos-aires',
    userId: 'user-8',
    title: 'Best empanadas in Palermo',
    content: 'Found the best empanadas at this tiny spot on Guatemala street. 500 pesos each and they\'re massive. Cash only though! Ask for the carne suave.',
    tag: 'Food',
    tagColor: '#f97316',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    likes: 34,
    comments: 7,
  },
  {
    id: 'post-ba-2',
    communityId: 'buenos-aires',
    userId: 'user-1',
    title: 'Subte card hack',
    content: 'You can get a 50% discount on the SUBE card if you register as a student on their website. Takes 2 days to process but totally worth it!',
    tag: 'Transport',
    tagColor: '#3b82f6',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    likes: 67,
    comments: 15,
  },
  // Hyderabad posts
  {
    id: 'post-hyd-1',
    communityId: 'hyderabad',
    userId: 'user-7',
    title: 'Incredible biryani deal',
    content: 'Paradise Biryani has a student discount - show your Minerva ID and get 20% off any order over ₹300. The chicken biryani is life-changing.',
    tag: 'Food',
    tagColor: '#f97316',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    likes: 89,
    comments: 31,
  },
  // Tokyo posts
  {
    id: 'post-tok-1',
    communityId: 'tokyo',
    userId: 'user-6',
    title: 'Cheap ramen in Shibuya',
    content: 'Fuunji near Shibuya station has amazing tsukemen for only ¥850. Usually ramen places are ¥1200+. Go early though, line gets crazy after 12pm.',
    tag: 'Food',
    tagColor: '#ef4444',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    likes: 45,
    comments: 8,
  },
  {
    id: 'post-tok-2',
    communityId: 'tokyo',
    userId: 'user-4',
    title: 'Don Quijote late night deals',
    content: 'Don Quijote marks down bento boxes after 9pm by 30-50%. Perfect for late night studying fuel!',
    tag: 'Shopping',
    tagColor: '#8b5cf6',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    likes: 72,
    comments: 19,
  },
  // Berlin posts
  {
    id: 'post-ber-1',
    communityId: 'berlin',
    userId: 'user-5',
    title: 'Döner ranking thread',
    content: 'Okay hear me out - Mustafas is overrated and the line is insane. Go to Imren Grill in Kreuzberg instead. Same quality, no 45 min wait. You\'re welcome.',
    tag: 'Food',
    tagColor: '#f97316',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    likes: 123,
    comments: 56,
  },
  // Personal posts
  {
    id: 'post-personal-1',
    communityId: 'personal',
    userId: 'me',
    title: 'Netflix family plan split?',
    content: 'Anyone want to split a Netflix premium plan? It\'s $22.99/month for 4 screens, so ~$6 each if we get 4 people. DM me!',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    likes: 3,
    comments: 2,
  },
]

const INITIAL_PERSONAL_FRIENDS: PersonalFriend[] = [
  { id: 'pf-1', name: 'Jamie Wilson', email: 'jamie@minerva.edu' },
  { id: 'pf-2', name: 'Taylor Brown', email: 'taylor@minerva.edu' },
  { id: 'pf-3', name: 'Jordan Lee', email: 'jordan@minerva.edu' },
]

const INITIAL_COMMENTS: Comment[] = [
  { id: 'c1', postId: 'post-sf-1', userId: 'user-2', content: 'This is amazing! Going there tomorrow 🙌', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
  { id: 'c2', postId: 'post-sf-1', userId: 'user-4', content: 'Do they still have it? Want to confirm before going', createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) },
  { id: 'c3', postId: 'post-sf-2', userId: 'user-1', content: 'Can confirm! Went yesterday and Katia is so sweet', createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) },
  { id: 'c4', postId: 'post-sf-2', userId: 'me', content: 'What kind of cookies? Are there vegan options?', createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) },
  { id: 'c5', postId: 'post-sf-3', userId: 'user-5', content: 'UGH same happened to me with a different app 😭', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
]

// ============ Utility Functions ============
function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function formatDate(date: Date): string {
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

function getAvatarColor(id: string): string {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#06b6d4', '#10b981']
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Points: 2 points per like on your posts
const POINTS_PER_LIKE = 2

// ============ Main Component ============
export default function CommunityPage() {
  // View state
  const [viewMode, setViewMode] = useState<'portal' | 'feed' | 'manage-friends' | 'saved'>('portal')
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null)
  
  // Data state
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS)
  const [personalFriends, setPersonalFriends] = useState<PersonalFriend[]>(INITIAL_PERSONAL_FRIENDS)
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set(['post-sf-2']))
  
  // UI state
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showCommentsModal, setShowCommentsModal] = useState<string | null>(null) // postId or null
  const [showShareModal, setShowShareModal] = useState<string | null>(null) // postId or null
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Show toast helper
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Get selected community
  const selectedCommunity = useMemo(() => {
    return MOCK_COMMUNITIES.find(c => c.id === selectedCommunityId)
  }, [selectedCommunityId])

  // Get posts for selected community
  const communityPosts = useMemo(() => {
    if (!selectedCommunityId) return []
    return posts
      .filter(p => p.communityId === selectedCommunityId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [selectedCommunityId, posts])

  // Get saved/bookmarked posts
  const savedPosts = useMemo(() => {
    return posts
      .filter(p => bookmarkedPosts.has(p.id))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [posts, bookmarkedPosts])

  // Get comments for a specific post
  const getPostComments = useCallback((postId: string) => {
    return comments
      .filter(c => c.postId === postId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }, [comments])

  // Calculate your points: 2 points per like on YOUR posts
  const userPoints = useMemo(() => {
    const myPosts = posts.filter(p => p.userId === 'me')
    const totalLikesOnMyPosts = myPosts.reduce((sum, p) => {
      // Include extra likes from likedPosts state if someone liked it
      const extraLikes = likedPosts.has(p.id) ? 1 : 0
      return sum + p.likes + extraLikes
    }, 0)
    return totalLikesOnMyPosts * POINTS_PER_LIKE
  }, [posts, likedPosts])

  // Get user by ID
  const getUser = (userId: string): User => {
    if (userId === 'me') return CURRENT_USER
    return MOCK_USERS.find(u => u.id === userId) || { id: userId, name: 'Unknown', avatar: null }
  }

  // Handle community selection
  const handleSelectCommunity = (communityId: string) => {
    setSelectedCommunityId(communityId)
    setViewMode('feed')
    setShowActionMenu(false)
  }

  // Handle back to portal
  const handleBackToPortal = () => {
    setViewMode('portal')
    setSelectedCommunityId(null)
    setShowActionMenu(false)
  }

  // Handle add comment
  const handleAddComment = (postId: string, content: string) => {
    const newComment: Comment = {
      id: generateId(),
      postId,
      userId: 'me',
      content,
      createdAt: new Date(),
    }
    setComments(prev => [...prev, newComment])
    // Update the comment count on the post
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, comments: p.comments + 1 } : p
    ))
    showToast('Comment added!')
  }

  // Handle share
  const handleShare = (postId: string, method: 'copy' | 'community' | 'friend', targetId?: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post) return

    if (method === 'copy') {
      // In a real app, this would copy the actual URL
      navigator.clipboard?.writeText(`Check out this deal: ${post.title}`)
      showToast('Link copied to clipboard!')
    } else if (method === 'community' && targetId) {
      // Share to another community (creates a new post there)
      const newPost: Post = {
        ...post,
        id: generateId(),
        communityId: targetId,
        userId: 'me',
        createdAt: new Date(),
        likes: 0,
        comments: 0,
      }
      setPosts(prev => [newPost, ...prev])
      const community = MOCK_COMMUNITIES.find(c => c.id === targetId)
      showToast(`Shared to ${community?.name || 'community'}!`)
    } else if (method === 'friend') {
      // In a real app, this would send a notification
      showToast('Shared with friend!')
    }
    setShowShareModal(null)
  }

  // Handle like toggle
  const handleLike = (postId: string) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  // Handle bookmark toggle
  const handleBookmark = (postId: string) => {
    setBookmarkedPosts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  // Handle new post
  const handleNewPost = (title: string, content: string, tag?: string) => {
    if (!selectedCommunityId) return
    
    const newPost: Post = {
      id: generateId(),
      communityId: selectedCommunityId,
      userId: 'me',
      title,
      content,
      tag,
      tagColor: tag ? '#3b82f6' : undefined,
      createdAt: new Date(),
      likes: 0,
      comments: 0,
    }
    
    setPosts(prev => [newPost, ...prev])
    setShowNewPostModal(false)
    setShowActionMenu(false)
    showToast('Post shared!')
  }

  // Handle invite friend
  const handleInviteFriend = (name: string, email: string) => {
    const newFriend: PersonalFriend = {
      id: generateId(),
      name,
      email,
      pending: true,
    }
    setPersonalFriends(prev => [...prev, newFriend])
    setShowInviteModal(false)
    showToast(`Invite sent to ${email}`)
  }

  // Handle remove friend
  const handleRemoveFriend = (friendId: string) => {
    setPersonalFriends(prev => prev.filter(f => f.id !== friendId))
    showToast('Friend removed')
  }

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
                onClick={() => setViewMode('saved')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                {bookmarkedPosts.size > 0 && (
                  <span className="community-saved-count">{bookmarkedPosts.size}</span>
                )}
              </button>
              <div className="community-points-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                {userPoints} pts
              </div>
              <div className="community-avatar" style={{ background: getAvatarColor('me') }}>
                {getInitials(CURRENT_USER.name)}
              </div>
            </div>
          </header>

          {/* How Points Work */}
          <div className="community-points-explainer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
            <span>Earn {POINTS_PER_LIKE} points for each like on your posts!</span>
          </div>

          {/* Minerva Cities Section */}
          <div className="community-section">
            <h2 className="community-section-title">Minerva Cities</h2>
            <div className="community-groups-grid">
              {MOCK_COMMUNITIES.filter(c => !c.isPersonal).map(community => (
                <button
                  key={community.id}
                  className="community-group-card"
                  onClick={() => handleSelectCommunity(community.id)}
                >
                  {community.image ? (
                    <div 
                      className="community-group-image"
                      style={{ backgroundImage: `url(${community.image})` }}
                    >
                      <div className="community-group-image-overlay" />
                      <span className="community-group-emoji-overlay">{community.emoji}</span>
                    </div>
                  ) : (
                    <div className="community-group-placeholder">
                      <span className="community-group-emoji">{community.emoji}</span>
                    </div>
                  )}
                  <div className="community-group-info">
                    <span className="community-group-name">{community.name}</span>
                    <span className="community-group-members">{community.memberCount} students</span>
                  </div>
                  <div className="community-group-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Personal Friends Section */}
          <div className="community-section">
            <h2 className="community-section-title">Private Group</h2>
            {MOCK_COMMUNITIES.filter(c => c.isPersonal).map(community => (
              <div key={community.id} className="community-personal-wrapper">
                <button
                  className="community-group-card personal"
                  onClick={() => handleSelectCommunity(community.id)}
                >
                  <div className="community-group-placeholder personal">
                    <span className="community-group-emoji">{community.emoji}</span>
                  </div>
                  <div className="community-group-info">
                    <span className="community-group-name">{community.name}</span>
                    <span className="community-group-members">{personalFriends.length} friends</span>
                  </div>
                  <div className="community-group-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </button>
                <button 
                  className="community-manage-btn"
                  onClick={() => setViewMode('manage-friends')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  Manage Friends
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ MANAGE FRIENDS VIEW ============ */}
      {viewMode === 'manage-friends' && (
        <div className="community-manage">
          <header className="community-feed-header">
            <button className="community-back-btn" onClick={handleBackToPortal}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="community-feed-title-area">
              <span className="community-feed-emoji">👥</span>
              <div>
                <h1 className="community-feed-title">Personal Friends</h1>
                <p className="community-feed-members">{personalFriends.length} friends</p>
              </div>
            </div>
          </header>

          <div className="community-manage-content">
            {/* Invite Button */}
            <button 
              className="community-invite-btn"
              onClick={() => setShowInviteModal(true)}
            >
              <div className="community-invite-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
              </div>
              <div className="community-invite-text">
                <span className="community-invite-title">Invite a friend</span>
                <span className="community-invite-subtitle">Add them to your private group</span>
              </div>
            </button>

            {/* Friends List */}
            <div className="community-friends-list">
              <h3 className="community-friends-header">Current Members</h3>
              
              {/* You */}
              <div className="community-friend-item you">
                <div className="community-friend-avatar" style={{ background: getAvatarColor('me') }}>
                  {getInitials(CURRENT_USER.name)}
                </div>
                <div className="community-friend-info">
                  <span className="community-friend-name">You</span>
                  <span className="community-friend-email">{CURRENT_USER.email}</span>
                </div>
                <span className="community-friend-badge">Owner</span>
              </div>

              {/* Friends */}
              {personalFriends.map(friend => (
                <div key={friend.id} className={`community-friend-item ${friend.pending ? 'pending' : ''}`}>
                  <div className="community-friend-avatar" style={{ background: friend.pending ? '#475569' : getAvatarColor(friend.id) }}>
                    {friend.pending ? '?' : getInitials(friend.name)}
                  </div>
                  <div className="community-friend-info">
                    <span className="community-friend-name">{friend.name}</span>
                    <span className="community-friend-email">
                      {friend.pending ? 'Invite pending' : friend.email}
                    </span>
                  </div>
                  <button 
                    className="community-friend-remove"
                    onClick={() => handleRemoveFriend(friend.id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}

              {personalFriends.length === 0 && (
                <div className="community-friends-empty">
                  <p>No friends yet. Invite someone to start sharing deals privately!</p>
                </div>
              )}
            </div>
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
              savedPosts.map(post => {
                const postUser = getUser(post.userId)
                const isLiked = likedPosts.has(post.id)
                const isBookmarked = bookmarkedPosts.has(post.id)
                const likeCount = post.likes + (isLiked ? 1 : 0)
                const community = MOCK_COMMUNITIES.find(c => c.id === post.communityId)
                const postCommentCount = post.comments + comments.filter(c => c.postId === post.id && !INITIAL_COMMENTS.find(ic => ic.id === c.id)).length
                
                return (
                  <article key={post.id} className="community-post-card">
                    {/* Community Badge */}
                    <div className="community-post-source">
                      <span className="community-post-source-emoji">{community?.emoji}</span>
                      <span>{community?.name}</span>
                    </div>

                    {/* Post Header */}
                    <div className="community-post-header">
                      <div className="community-post-user">
                        <div 
                          className="community-post-avatar"
                          style={{ background: getAvatarColor(post.userId) }}
                        >
                          {getInitials(postUser.name)}
                        </div>
                        <div className="community-post-user-info">
                          <span className="community-post-user-name">{postUser.name}</span>
                          <span className="community-post-date">{formatDate(post.createdAt)}</span>
                        </div>
                      </div>
                      {post.tag && (
                        <span 
                          className="community-post-tag"
                          style={{ background: post.tagColor || '#3b82f6' }}
                        >
                          {post.tag}
                        </span>
                      )}
                    </div>

                    {/* Post Content */}
                    <div className="community-post-content">
                      <h3 className="community-post-title">{post.title}</h3>
                      <p className="community-post-text">{post.content}</p>
                    </div>

                    {/* Post Actions */}
                    <div className="community-post-actions">
                      <button 
                        className={`community-post-action ${isLiked ? 'liked' : ''}`}
                        onClick={() => handleLike(post.id)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        <span>{likeCount}</span>
                      </button>
                      <button 
                        className="community-post-action"
                        onClick={() => setShowCommentsModal(post.id)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                        </svg>
                        <span>{postCommentCount}</span>
                      </button>
                      <button 
                        className={`community-post-action ${isBookmarked ? 'bookmarked' : ''}`}
                        onClick={() => handleBookmark(post.id)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                        </svg>
                      </button>
                      <button 
                        className="community-post-action"
                        onClick={() => setShowShareModal(post.id)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                      </button>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ============ FEED VIEW ============ */}
      {viewMode === 'feed' && selectedCommunity && (
        <div className="community-feed">
          {/* Feed Header */}
          <header className="community-feed-header">
            <button className="community-back-btn" onClick={handleBackToPortal}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="community-feed-title-area">
              <span className="community-feed-emoji">{selectedCommunity.emoji}</span>
              <div>
                <h1 className="community-feed-title">{selectedCommunity.name}</h1>
                <p className="community-feed-members">
                  {selectedCommunity.isPersonal ? `${personalFriends.length} friends` : `${selectedCommunity.memberCount} students`}
                </p>
              </div>
            </div>
            <div className="community-feed-header-right">
              <div className="community-points-badge small">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
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
              communityPosts.map(post => {
                const postUser = getUser(post.userId)
                const isLiked = likedPosts.has(post.id)
                const isBookmarked = bookmarkedPosts.has(post.id)
                const likeCount = post.likes + (isLiked ? 1 : 0)
                const postPoints = likeCount * POINTS_PER_LIKE
                
                return (
                  <article key={post.id} className="community-post-card">
                    {/* Post Header */}
                    <div className="community-post-header">
                      <div className="community-post-user">
                        <div 
                          className="community-post-avatar"
                          style={{ background: getAvatarColor(post.userId) }}
                        >
                          {getInitials(postUser.name)}
                        </div>
                        <div className="community-post-user-info">
                          <span className="community-post-user-name">{postUser.name}</span>
                          <span className="community-post-date">{formatDate(post.createdAt)}</span>
                        </div>
                      </div>
                      {post.tag && (
                        <span 
                          className="community-post-tag"
                          style={{ background: post.tagColor || '#3b82f6' }}
                        >
                          {post.tag}
                        </span>
                      )}
                    </div>

                    {/* Post Content */}
                    <div className="community-post-content">
                      <h3 className="community-post-title">{post.title}</h3>
                      <p className="community-post-text">{post.content}</p>
                    </div>

                    {/* Post Points - shows how many points this post has earned */}
                    <div className="community-post-points">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      +{postPoints} pts earned
                    </div>

                    {/* Post Actions */}
                    <div className="community-post-actions">
                      <button 
                        className={`community-post-action ${isLiked ? 'liked' : ''}`}
                        onClick={() => handleLike(post.id)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        <span>{likeCount}</span>
                      </button>
                      <button 
                        className="community-post-action"
                        onClick={() => setShowCommentsModal(post.id)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                        </svg>
                        <span>{post.comments + comments.filter(c => c.postId === post.id && !INITIAL_COMMENTS.find(ic => ic.id === c.id)).length}</span>
                      </button>
                      <button 
                        className={`community-post-action ${isBookmarked ? 'bookmarked' : ''}`}
                        onClick={() => handleBookmark(post.id)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                        </svg>
                      </button>
                      <button 
                        className="community-post-action"
                        onClick={() => setShowShareModal(post.id)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                      </button>
                    </div>
                  </article>
                )
              })
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
          user={CURRENT_USER}
          onClose={() => setShowNewPostModal(false)}
          onSubmit={handleNewPost}
        />
      )}

      {/* ============ INVITE FRIEND MODAL ============ */}
      {showInviteModal && (
        <InviteFriendModal
          onClose={() => setShowInviteModal(false)}
          onSubmit={handleInviteFriend}
        />
      )}

      {/* ============ COMMENTS MODAL ============ */}
      {showCommentsModal && (
        <CommentsModal
          postId={showCommentsModal}
          post={posts.find(p => p.id === showCommentsModal)!}
          comments={getPostComments(showCommentsModal)}
          getUser={getUser}
          onClose={() => setShowCommentsModal(null)}
          onAddComment={(content) => handleAddComment(showCommentsModal, content)}
        />
      )}

      {/* ============ SHARE MODAL ============ */}
      {showShareModal && (
        <ShareModal
          postId={showShareModal}
          post={posts.find(p => p.id === showShareModal)!}
          communities={MOCK_COMMUNITIES}
          personalFriends={personalFriends}
          onClose={() => setShowShareModal(null)}
          onShare={handleShare}
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

// ============ New Post Modal Component ============
interface NewPostModalProps {
  user: User
  onClose: () => void
  onSubmit: (title: string, content: string, tag?: string) => void
}

function NewPostModal({ user, onClose, onSubmit }: NewPostModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tag, setTag] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    onSubmit(title.trim(), content.trim(), tag.trim() || undefined)
  }

  const isValid = title.trim().length > 0 && content.trim().length > 0

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
            <div 
              className="community-modal-avatar"
              style={{ background: getAvatarColor(user.id) }}
            >
              {getInitials(user.name)}
            </div>
            <div>
              <span className="community-modal-username">{user.name}</span>
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

          {/* Content Textarea */}
          <textarea
            placeholder="Share the details - where, when, how much..."
            value={content}
            onChange={e => setContent(e.target.value)}
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

          {/* Actions */}
          <div className="community-modal-actions">
            <button type="button" className="community-modal-attach">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
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

// ============ Invite Friend Modal Component ============
interface InviteFriendModalProps {
  onClose: () => void
  onSubmit: (name: string, email: string) => void
}

function InviteFriendModal({ onClose, onSubmit }: InviteFriendModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter a name')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email')
      return
    }

    onSubmit(name.trim(), email.trim().toLowerCase())
  }

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

        <form onSubmit={handleSubmit} className="community-modal-form">
          {error && <div className="community-modal-error">{error}</div>}

          <div className="community-invite-hero">
            <div className="community-invite-hero-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
              </svg>
            </div>
            <p>Invite friends to share deals privately in your Personal Friends group.</p>
          </div>

          <input
            type="text"
            placeholder="Friend's name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="community-modal-input"
            autoFocus
          />

          <input
            type="email"
            placeholder="friend@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="community-modal-input"
          />

          <button type="submit" className="community-modal-submit full">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
            </svg>
            Send Invite
          </button>
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
  getUser: (userId: string) => User
  onClose: () => void
  onAddComment: (content: string) => void
}

function CommentsModal({ postId, post, comments, getUser, onClose, onAddComment }: CommentsModalProps) {
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
            <h4>{post.title}</h4>
            <p>{post.content.slice(0, 100)}{post.content.length > 100 ? '...' : ''}</p>
          </div>

          {/* Comments List */}
          <div className="community-comments-list">
            {comments.length === 0 ? (
              <div className="community-comments-empty">
                <p>No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              comments.map(comment => {
                const user = getUser(comment.userId)
                return (
                  <div key={comment.id} className="community-comment-item">
                    <div 
                      className="community-comment-avatar"
                      style={{ background: getAvatarColor(comment.userId) }}
                    >
                      {getInitials(user.name)}
                    </div>
                    <div className="community-comment-content">
                      <div className="community-comment-header">
                        <span className="community-comment-name">{user.name}</span>
                        <span className="community-comment-date">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="community-comment-text">{comment.content}</p>
                    </div>
                  </div>
                )
              })
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

// ============ Share Modal Component ============
interface ShareModalProps {
  postId: string
  post: Post
  communities: Community[]
  personalFriends: PersonalFriend[]
  onClose: () => void
  onShare: (postId: string, method: 'copy' | 'community' | 'friend', targetId?: string) => void
}

function ShareModal({ postId, post, communities, personalFriends, onClose, onShare }: ShareModalProps) {
  return (
    <div className="community-modal-overlay" onClick={onClose}>
      <div className="community-modal community-modal-small" onClick={e => e.stopPropagation()}>
        <div className="community-modal-header">
          <h2>Share Deal</h2>
          <button className="community-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="community-share-content">
          {/* Copy Link */}
          <button 
            className="community-share-option"
            onClick={() => onShare(postId, 'copy')}
          >
            <div className="community-share-icon copy">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </div>
            <div className="community-share-text">
              <span className="community-share-title">Copy Link</span>
              <span className="community-share-subtitle">Share anywhere</span>
            </div>
          </button>

          {/* Share to Communities */}
          <div className="community-share-section">
            <h4 className="community-share-section-title">Share to Community</h4>
            {communities.filter(c => c.id !== post.communityId).map(community => (
              <button 
                key={community.id}
                className="community-share-option"
                onClick={() => onShare(postId, 'community', community.id)}
              >
                <div className="community-share-icon community">
                  <span>{community.emoji}</span>
                </div>
                <div className="community-share-text">
                  <span className="community-share-title">{community.name}</span>
                  <span className="community-share-subtitle">{community.memberCount} {community.isPersonal ? 'friends' : 'students'}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Share to Friends */}
          {personalFriends.length > 0 && (
            <div className="community-share-section">
              <h4 className="community-share-section-title">Send to Friend</h4>
              {personalFriends.filter(f => !f.pending).map(friend => (
                <button 
                  key={friend.id}
                  className="community-share-option"
                  onClick={() => onShare(postId, 'friend', friend.id)}
                >
                  <div 
                    className="community-share-icon friend"
                    style={{ background: getAvatarColor(friend.id) }}
                  >
                    {getInitials(friend.name)}
                  </div>
                  <div className="community-share-text">
                    <span className="community-share-title">{friend.name}</span>
                    <span className="community-share-subtitle">Direct message</span>
                  </div>
                </button>
              ))}
            </div>
          )}
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
  .community-group-card.personal {
    border-color: rgba(139, 92, 246, 0.3);
  }
  .community-group-card.personal:hover {
    border-color: rgba(139, 92, 246, 0.5);
  }
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
  .community-group-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .community-group-name { font-weight: 600; color: #e2e8f0; font-size: 0.9375rem; }
  .community-group-members { font-size: 0.75rem; color: #64748b; }
  .community-group-arrow { color: #475569; }
  .community-personal-wrapper { display: flex; flex-direction: column; gap: 8px; }
  .community-manage-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px;
    background: rgba(139, 92, 246, 0.1);
    border: 1px dashed rgba(139, 92, 246, 0.3);
    border-radius: 10px;
    color: #a78bfa;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
  }
  .community-manage-btn:hover { background: rgba(139, 92, 246, 0.15); border-color: rgba(139, 92, 246, 0.5); }

  /* ============ MANAGE FRIENDS VIEW ============ */
  .community-manage-content { padding: 16px 20px; }
  .community-invite-btn {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 14px 16px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05));
    border: 1px dashed rgba(139, 92, 246, 0.3);
    border-radius: 14px;
    cursor: pointer;
    text-align: left;
    margin-bottom: 20px;
  }
  .community-invite-btn:hover { background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.1)); border-color: rgba(139, 92, 246, 0.5); }
  .community-invite-icon {
    width: 42px;
    height: 42px;
    background: rgba(139, 92, 246, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a78bfa;
  }
  .community-invite-text { display: flex; flex-direction: column; gap: 2px; }
  .community-invite-title { font-weight: 600; font-size: 0.9375rem; color: #a78bfa; }
  .community-invite-subtitle { font-size: 0.75rem; color: #64748b; }
  .community-friends-list { }
  .community-friends-header {
    font-size: 0.7rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 12px;
  }
  .community-friend-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    margin-bottom: 8px;
  }
  .community-friend-item.you { border-color: rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.05); }
  .community-friend-item.pending { opacity: 0.7; border-style: dashed; }
  .community-friend-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.8125rem;
    color: white;
    flex-shrink: 0;
  }
  .community-friend-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .community-friend-name { font-weight: 600; color: #e2e8f0; font-size: 0.9375rem; }
  .community-friend-email { font-size: 0.75rem; color: #64748b; }
  .community-friend-badge {
    font-size: 0.65rem;
    padding: 3px 8px;
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
    border-radius: 6px;
  }
  .community-friend-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(255,255,255,0.04);
    border: none;
    border-radius: 8px;
    color: #64748b;
    cursor: pointer;
  }
  .community-friend-remove:hover { background: rgba(239, 68, 68, 0.1); color: #f87171; }
  .community-friends-empty { text-align: center; padding: 20px; color: #64748b; font-size: 0.875rem; }

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

  /* ============ FLOATING ACTION BUTTON ============ */
  .community-fab-container {
    position: fixed;
    bottom: 24px;
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
  .community-modal-small { max-width: 400px; }
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
  .community-modal-error {
    padding: 12px 16px;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
    border-radius: 10px;
    color: #f87171;
    font-size: 0.875rem;
  }
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
    width: 44px;
    height: 44px;
    background: rgba(255,255,255,0.06);
    border: none;
    border-radius: 10px;
    color: #64748b;
    cursor: pointer;
  }
  .community-modal-attach:hover { background: rgba(255,255,255,0.1); color: #94a3b8; }
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
  .community-modal-submit.full { width: 100%; justify-content: center; }
  .community-modal-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3); }
  .community-modal-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .community-invite-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 16px 0;
    gap: 12px;
  }
  .community-invite-hero-icon {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1));
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a78bfa;
  }
  .community-invite-hero p { font-size: 0.875rem; color: #94a3b8; line-height: 1.5; max-width: 280px; margin: 0; }

  /* ============ SAVED BUTTON ============ */
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

  /* ============ SHARE MODAL ============ */
  .community-share-content { padding: 8px 0; }
  .community-share-section { padding: 8px 0; }
  .community-share-section-title {
    font-size: 0.7rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 8px 24px;
    margin: 0;
  }
  .community-share-option {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 12px 24px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
  }
  .community-share-option:hover { background: rgba(255,255,255,0.04); }
  .community-share-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .community-share-icon.copy { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
  .community-share-icon.community { background: rgba(255,255,255,0.08); font-size: 1.25rem; }
  .community-share-icon.friend { border-radius: 50%; font-size: 0.8125rem; font-weight: 600; color: white; }
  .community-share-text { display: flex; flex-direction: column; gap: 2px; }
  .community-share-title { font-weight: 600; color: #e2e8f0; font-size: 0.9375rem; }
  .community-share-subtitle { font-size: 0.75rem; color: #64748b; }

  /* ============ RESPONSIVE ============ */
  @media (max-width: 480px) {
    .community-section { padding: 16px; }
    .community-posts { padding: 12px 16px; }
    .community-post-card { padding: 14px; }
  }
`
