import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useFeedStore, type FeedTab } from '@/store/feedStore'
import { usePostStore } from '@/store/postStore'
import PostCard from '@/components/PostCard'
import Spinner from '@/components/Spinner'

export default function Home() {
  const { activeTab, posts, loading, setTab } = useFeedStore()
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
    <div className="max-w-3xl mx-auto p-2 sm:p-4 bg-white dark:bg-zinc-900 min-h-[calc(100vh-3rem)]">
      <div className="mb-4 flex gap-2 sm:gap-4 border-b border-zinc-200 dark:border-zinc-700 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setTab(tab)}
            className={`px-3 sm:px-4 py-2 font-semibold capitalize text-sm sm:text-base whitespace-nowrap ${
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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : posts.length === 0 ? (
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
