import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useFeedStore } from '@/store/feedStore'
import { usePostStore } from '@/store/postStore'
import PostCard from '@/components/PostCard'

export default function Popular() {
  const { posts, setTab } = useFeedStore()
  const upsert = usePostStore((s) => s.upsert)

  // Initialize feed with top posts
  useEffect(() => {
    setTab('top')
  }, [setTab])

  const subscribeToPost = usePostStore((s) => s.subscribeToPost)
  const unsubscribeFromPost = usePostStore((s) => s.unsubscribeFromPost)

  // Sync posts from feedStore to postStore and subscribe to real-time updates
  useEffect(() => {
    posts.forEach((post) => {
      upsert(post)
      subscribeToPost(post.id)
    })

    // Cleanup: unsubscribe from posts that are no longer in the feed
    return () => {
      posts.forEach((post) => unsubscribeFromPost(post.id))
    }
  }, [posts, upsert, subscribeToPost, unsubscribeFromPost])

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white dark:bg-zinc-900 min-h-[calc(100vh-3rem)]">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Popular</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
        The best posts on Reddit right now
      </p>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            No posts yet. <Link to="/submit" className="text-primary-500 hover:underline">Create one?</Link>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  )
}



