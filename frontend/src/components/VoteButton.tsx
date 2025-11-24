import { usePostStore } from '@/store/postStore'
import { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { voteComment } from '@/lib/api/comments'

interface VoteButtonProps {
  postId?: string
  commentId?: string
  targetType?: 'post' | 'comment'
  score?: number
}

export default function VoteButton({ postId, commentId, targetType, score: initialScore }: VoteButtonProps) {
  const targetId = postId || commentId
  const type = targetType || (postId ? 'post' : 'comment')
  
  // For posts, use postStore
  const post = postId ? usePostStore((s) => s.postById[postId]) : null
  const optimisticVotePost = usePostStore((s) => s.optimisticVotePost)
  const subscribeToPost = usePostStore((s) => s.subscribeToPost)
  
  // Ensure post is subscribed if it exists but isn't in store yet
  useEffect(() => {
    if (postId && !post) {
      subscribeToPost(postId)
    }
  }, [postId, post, subscribeToPost])
  
  // For comments, use local state
  const [commentVote, setCommentVote] = useState<-1|0|1>(0)
  const [commentScore, setCommentScore] = useState(initialScore || 0)
  
  // Update comment score when prop changes (from real-time stream)
  useEffect(() => {
    if (initialScore !== undefined && type === 'comment') {
      setCommentScore(initialScore)
    }
  }, [initialScore, type])
  
  // Fetch and stream comment vote
  useEffect(() => {
    if (!targetId || type !== 'comment' || !auth.currentUser) return
    
    const fetchVote = async () => {
      const voteDoc = await getDoc(doc(db, 'votes', `comment_${targetId}`, 'userVotes', auth.currentUser!.uid))
      if (voteDoc.exists()) {
        setCommentVote((voteDoc.data()?.value as -1|0|1) || 0)
      }
    }
    
    fetchVote()
    
    const unsub = onSnapshot(
      doc(db, 'votes', `comment_${targetId}`, 'userVotes', auth.currentUser!.uid),
      (snap) => {
        setCommentVote(snap.exists() ? ((snap.data()?.value as -1|0|1) || 0) : 0)
      }
    )
    
    return unsub
  }, [targetId, type])
  
  // Stream comment score - need postId to get comment doc
  useEffect(() => {
    if (!commentId || type !== 'comment') return
    
    // Note: We need the postId to stream the comment, but we don't have it in VoteButton
    // For now, we'll rely on the parent component to pass updated scores
    // In a full implementation, you'd pass postId and stream the comment doc
  }, [commentId, type])
  
  const myVote = postId ? (post?.myVote ?? 0) : commentVote
  const displayScore = postId ? (post?.score ?? 0) : commentScore
  
  const handleVote = async (value: -1|0|1, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    if (!targetId) return
    
    // If clicking the opposite vote, switch to that vote
    // If clicking the same vote, remove it (set to 0)
    // If no vote, set to the clicked vote
    let newVote: -1|0|1
    if (myVote === value) {
      // Clicking the same button removes the vote
      newVote = 0
    } else {
      // Clicking a different button sets that vote
      newVote = value
    }
    
    if (postId) {
      // Use postStore for posts
      optimisticVotePost(postId, newVote)
    } else if (commentId) {
      // Handle comment votes - need postId for comment path
      if (!postId) {
        return
      }
      setCommentVote(newVote)
      
      try {
        const res = await voteComment(postId, commentId, newVote)
        setCommentScore(res.score)
      } catch (error) {
        // Rollback on error
        setCommentVote(myVote)
      }
    }
  }
  
  // For posts, use horizontal layout suitable for bottom action bar
  if (postId) {
    const isUpvoted = myVote === 1
    const isDownvoted = myVote === -1
    
    return (
      <div className="inline-flex items-center gap-0.5 bg-zinc-50 dark:bg-zinc-800 rounded px-1">
        <button 
          aria-pressed={isUpvoted} 
          className={`px-1.5 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors group ${
            isUpvoted ? 'text-primary-500' : 'text-zinc-600 dark:text-zinc-400 hover:text-primary-500'
          }`}
          onClick={(e) => handleVote(1, e)}
        >
          <svg 
            className="w-4 h-4 transition-colors" 
            viewBox="0 0 20 20" 
            fill={isUpvoted ? 'currentColor' : 'none'} 
            stroke="currentColor" 
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 14v-8m0 0l-4 4m4-4l4 4" />
          </svg>
        </button>
        <span aria-live="polite" className="min-w-[2rem] text-center text-xs font-semibold text-zinc-900 dark:text-zinc-100 px-1">
          {displayScore}
        </span>
        <button 
          aria-pressed={isDownvoted} 
          className={`px-1.5 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors group ${
            isDownvoted ? 'text-primary-500' : 'text-zinc-600 dark:text-zinc-400 hover:text-primary-500'
          }`}
          onClick={(e) => handleVote(-1, e)}
        >
          <svg 
            className="w-4 h-4 transition-colors" 
            viewBox="0 0 20 20" 
            fill={isDownvoted ? 'currentColor' : 'none'} 
            stroke="currentColor" 
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 6v8m0 0l-4-4m4 4l4-4" />
          </svg>
        </button>
      </div>
    )
  }
  
  // For comments, use simpler inline layout
  const isUpvoted = myVote === 1
  const isDownvoted = myVote === -1
  
  return (
    <div className="inline-flex items-center gap-1">
      <button 
        aria-pressed={isUpvoted} 
        className={`px-1 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group ${
          isUpvoted ? 'text-primary-500' : 'text-zinc-600 dark:text-zinc-400 hover:text-primary-500'
        }`}
        onClick={() => handleVote(1)}
      >
        <svg 
          className="w-4 h-4 transition-colors" 
          viewBox="0 0 20 20" 
          fill={isUpvoted ? 'currentColor' : 'none'} 
          stroke="currentColor" 
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 14v-8m0 0l-4 4m4-4l4 4" />
        </svg>
      </button>
      <span aria-live="polite" className="min-w-8 text-center text-xs font-semibold text-zinc-900 dark:text-zinc-100">
        {displayScore}
      </span>
      <button 
        aria-pressed={isDownvoted} 
        className={`px-1 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group ${
          isDownvoted ? 'text-primary-500' : 'text-zinc-600 dark:text-zinc-400 hover:text-primary-500'
        }`}
        onClick={() => handleVote(-1)}
      >
        <svg 
          className="w-4 h-4 transition-colors" 
          viewBox="0 0 20 20" 
          fill={isDownvoted ? 'currentColor' : 'none'} 
          stroke="currentColor" 
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 6v8m0 0l-4-4m4 4l4-4" />
        </svg>
      </button>
    </div>
  )
}
