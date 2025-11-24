import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import VoteButton from './VoteButton'
import JoinLeaveButton from './JoinLeaveButton'
import { useAuthStore } from '@/store/authStore'
import { usePostStore } from '@/store/postStore'
import { getCommunityById, getCommunityByName, isUserMember } from '@/lib/api/communities'
import { type PostType } from '@/lib/api/posts'

// Format timestamp to relative time (e.g., "2 hours ago", "3 days ago")
function formatTimeAgo(timestamp: any): string {
  if (!timestamp) return ''
  
  let date: Date
  if (timestamp?.toDate) {
    // Firestore Timestamp
    date = timestamp.toDate()
  } else if (timestamp?.seconds) {
    // Firestore Timestamp object with seconds
    date = new Date(timestamp.seconds * 1000)
  } else if (typeof timestamp === 'number') {
    // Unix timestamp in milliseconds
    date = new Date(timestamp)
  } else {
    return ''
  }
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)
  
  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
  if (diffWeeks < 4) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`
  if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`
  return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`
}

interface PostCardProps {
  post: {
    id: string
    cid: null | string
    authorUid: string
    title: string
    type: PostType
    body?: string
    url?: string
    imageUrl?: string
    score: number
    commentCount: number
    createdAt?: any
  }
}

export default function PostCard({ post: postProp }: PostCardProps) {
  // Use post from store if available (for real-time updates), otherwise fall back to prop
  const storePost = usePostStore((s) => s.postById[postProp.id])
  const post = storePost || postProp
  const { user } = useAuthStore()
  const isUserProfile = post.cid?.startsWith('u:')
  const communityId = isUserProfile ? post.cid.substring(2) : post.cid
  const communityPrefix = isUserProfile ? 'u' : 'r'
  const [communityName, setCommunityName] = useState<string | null>(null)
  const [showJoinButton, setShowJoinButton] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  
  // Get community details and check membership
  useEffect(() => {
    if (post.cid && !isUserProfile && user) {
      // post.cid is the community document ID
      getCommunityById(post.cid).then(community => {
        if (community) {
          setCommunityName(community.name)
          // Check if user is a member
          isUserMember(community.id, user.uid).then(isMember => {
            setShowJoinButton(!isMember)
          })
        }
      }).catch(() => {
        // If fetch fails, try by name
        getCommunityByName(post.cid).then(community => {
          if (community) {
            setCommunityName(community.name)
            isUserMember(community.id, user.uid).then(isMember => {
              setShowJoinButton(!isMember)
            })
          } else {
            // Fallback: assume cid is the name
            setCommunityName(post.cid)
          }
        })
      })
    } else if (post.cid && !isUserProfile) {
      // Not logged in, try to get community name for display
      getCommunityById(post.cid).then(community => {
        if (community) {
          setCommunityName(community.name)
        } else {
          setCommunityName(post.cid)
        }
      }).catch(() => {
        setCommunityName(post.cid)
      })
    }
  }, [post.cid, isUserProfile, user])
  
  // Format post link - handle user profile posts (u:uid) and regular communities
  const postLink = post.cid 
    ? (isUserProfile 
        ? `/u/${communityId}/post/${post.id}`
        : `/r/${communityName || communityId || post.cid}/post/${post.id}`)
    : `/post/${post.id}`

  // Get full URL for sharing
  const postUrl = `${window.location.origin}${postLink}`

  // Handle share
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    const shareData = {
      title: post.title,
      text: post.body || post.title,
      url: postUrl
    }

    // Try Web Share API first (works on mobile and some desktop browsers)
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (error: any) {
        // User cancelled or error occurred, fall back to clipboard
        if (error.name !== 'AbortError') {
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(postUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch (error) {
      // Fallback: show URL in alert
      alert(`Post URL: ${postUrl}`)
    }
  }

  // Truncate text body for preview
  const textPreview = post.body 
    ? post.body.length > 200 
      ? post.body.substring(0, 200) + '...' 
      : post.body
    : null

  return (
    <article className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md overflow-hidden hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors">
      {/* Content Section */}
      <div className="p-2 sm:p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-1 gap-2">
          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
            {post.cid && (
              <>
                <Link 
                  to={post.cid.startsWith('u:') ? `/u/${post.cid.substring(2)}` : `/r/${communityName || communityId || post.cid}`}
                  className="font-semibold hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {communityPrefix}/{communityName || communityId || post.cid}
                </Link>
                <span>•</span>
              </>
            )}
            <span>Posted by u/{post.authorUid.substring(0, 8)}...</span>
            {post.createdAt && (
              <>
                <span>•</span>
                <span title={post.createdAt?.toDate ? new Date(post.createdAt.toDate()).toLocaleString() : ''}>
                  {formatTimeAgo(post.createdAt)}
                </span>
              </>
            )}
          </div>
          
          {/* Join Button - only show for communities, not user profiles, and only if user is not a member */}
          {post.cid && !isUserProfile && user && showJoinButton && communityName && (
            <div onClick={(e) => e.stopPropagation()}>
              <JoinLeaveButton 
                communityName={communityName} 
                communityId={post.cid}
                onJoinChange={(joined) => {
                  setShowJoinButton(!joined)
                  // Trigger a refresh of the sidebar communities
                  window.dispatchEvent(new Event('community-joined'))
                }}
              />
            </div>
          )}
        </div>
        
        {/* Title */}
        <Link to={postLink} className="block mb-2">
          <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100 hover:text-primary-600 dark:hover:text-primary-400">
            {post.title}
          </h3>
        </Link>

        {/* Post Content Preview */}
        {post.type === 'text' && textPreview && (
          <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {textPreview}
          </div>
        )}

        {post.type === 'link' && post.url && (
          <div className="mt-2">
            <a 
              href={post.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {post.url}
            </a>
          </div>
        )}

        {post.type === 'image' && post.imageUrl && (
          <div className="mt-2 -mx-3">
            <Link to={postLink}>
              <img 
                src={post.imageUrl} 
                alt={post.title}
                loading="lazy"
                decoding="async"
                className="w-full max-h-[600px] object-cover rounded-b-md"
              />
            </Link>
          </div>
        )}
      </div>

      {/* Footer Actions - Vote, Comment, Award, Share */}
      <div className="px-2 sm:px-3 pb-2 flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700 overflow-x-auto">
        {/* Vote Button */}
        <VoteButton postId={post.id} />

        {/* Comment Button */}
        <Link 
          to={postLink}
          className="flex items-center gap-0.5 sm:gap-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded transition-colors whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="font-medium">{post.commentCount || 0}</span>
        </Link>

        {/* Award Button */}
        <button className="flex items-center gap-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1.5 rounded transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <span className="font-medium">Award</span>
        </button>

        {/* Share Button */}
        <button 
          onClick={handleShare}
          className="flex items-center gap-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1.5 rounded transition-colors relative"
          title={shareCopied ? 'Link copied!' : 'Share post'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span className="font-medium">{shareCopied ? 'Copied!' : 'Share'}</span>
        </button>
      </div>
    </article>
  )
}
