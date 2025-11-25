import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useFeedStore, type FeedTab } from '@/store/feedStore'
import { usePostStore } from '@/store/postStore'
import PostCard from '@/components/PostCard'

export default function All() {
  const { activeTab, posts, setTab } = useFeedStore()
  const upsert = usePostStore((s) => s.upsert)

  // Initialize feed on mount
  useEffect(() => {
    setTab('hot')
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

  const tabs: FeedTab[] = ['hot', 'new', 'top']

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white dark:bg-zinc-900 min-h-[calc(100vh-3rem)]">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">All</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
        Posts from all communities
      </p>

      <div className="mb-4 flex gap-4 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setTab(tab)}
            className={`px-4 py-2 font-semibold capitalize ${
              activeTab === tab
                ? 'border-b-2 border-primary-500 text-primary-500'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

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




