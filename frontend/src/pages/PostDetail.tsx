import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { usePostStore } from '@/store/postStore'
import { streamCommentsTree, createComment } from '@/lib/api/comments'
import { useAuthStore } from '@/store/authStore'
import VoteButton from '@/components/VoteButton'
import PostCard from '@/components/PostCard'
import Avatar from '@/components/Avatar'

export default function PostDetail() {
  const { pid } = useParams<{ pid: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const post = usePostStore((s) => pid ? s.postById[pid] : null)
  const subscribeToPost = usePostStore((s) => s.subscribeToPost)
  const unsubscribeFromPost = usePostStore((s) => s.unsubscribeFromPost)
  const [comments, setComments] = useState<any[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Subscribe to post updates
  useEffect(() => {
    if (!pid) return
    subscribeToPost(pid)
    return () => unsubscribeFromPost(pid)
  }, [pid, subscribeToPost, unsubscribeFromPost])

  // Subscribe to comments
  useEffect(() => {
    if (!pid) return
    const unsubscribe = streamCommentsTree(pid, (items) => {
      setComments(items)
    })
    return unsubscribe
  }, [pid])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pid || !user || !commentBody.trim()) return

    setIsSubmitting(true)
    try {
      await createComment(pid, {
        authorUid: user.uid,
        body: commentBody.trim(),
        path: `${Date.now()}` // Simple path for now
      })
      setCommentBody('')
    } catch (error) {
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!pid) {
    return <div className="p-4">Post not found</div>
  }

  if (!post) {
    return <div className="p-4">Loading...</div>
  }

  const isUserProfile = post.cid?.startsWith('u:')
  const communityId = isUserProfile ? post.cid.substring(2) : post.cid
  const communityPrefix = isUserProfile ? 'u' : 'r'

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white dark:bg-zinc-900 min-h-[calc(100vh-3rem)]">
      {/* Post */}
      <div className="mb-4">
        <PostCard post={post} />
      </div>

      {/* Comment Form */}
      {user ? (
        <div className="mb-6 bg-zinc-50 dark:bg-zinc-800 rounded-md p-4">
          <div className="flex gap-3 mb-3">
            <Avatar 
              uid={user.uid} 
              size={32}
              photoURL={user.photoURL || undefined}
              displayName={user.displayName || undefined}
            />
            <div className="flex-1">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                Comment as <span className="font-semibold text-zinc-900 dark:text-zinc-100">u/{user.uid.substring(0, 8)}...</span>
              </p>
              <form onSubmit={handleSubmitComment}>
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="What are your thoughts?"
                  className="w-full p-3 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={4}
                  disabled={isSubmitting}
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!commentBody.trim() || isSubmitting}
                    className="px-4 py-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Commenting...' : 'Comment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-md text-center">
          <p className="text-zinc-600 dark:text-zinc-400 mb-2">
            <Link to="/login" className="text-blue-500 hover:underline">Log in</Link> or{' '}
            <Link to="/login" className="text-blue-500 hover:underline">sign up</Link> to leave a comment
          </p>
        </div>
      )}

      {/* Comments */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
        </h2>
        {comments.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} postId={pid} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CommentItem({ comment, postId }: { comment: any; postId: string }) {
  const [replyBody, setReplyBody] = useState('')
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuthStore()

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !replyBody.trim()) return

    setIsSubmitting(true)
    try {
      await createComment(postId, {
        authorUid: user.uid,
        body: replyBody.trim(),
        parentId: comment.id,
        path: `${comment.path}_${Date.now()}`
      })
      setReplyBody('')
      setShowReplyForm(false)
    } catch (error) {
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="border-l-2 border-zinc-200 dark:border-zinc-700 pl-4">
      <div className="flex items-start gap-2 mb-2">
        <Avatar uid={comment.authorUid} size={24} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              u/{comment.authorUid.substring(0, 8)}...
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {comment.createdAt?.toDate ? new Date(comment.createdAt.toDate()).toLocaleString() : ''}
            </span>
          </div>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap mb-2">
            {comment.body}
          </p>
          <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <VoteButton postId={postId} commentId={comment.id} score={comment.score} targetType="comment" />
            {user && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="hover:text-primary-500 transition-colors"
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>

      {showReplyForm && user && (
        <div className="mt-3 ml-6">
          <form onSubmit={handleSubmitReply}>
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="What are your thoughts?"
              className="w-full p-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-sm"
              rows={3}
              disabled={isSubmitting}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowReplyForm(false)
                  setReplyBody('')
                }}
                className="px-3 py-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!replyBody.trim() || isSubmitting}
                className="px-3 py-1 text-sm bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Replying...' : 'Reply'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
