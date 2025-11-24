import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useFeedStore, type FeedTab } from '@/store/feedStore'
import { usePostStore } from '@/store/postStore'
import { getCommunityByName, isUserMember } from '@/lib/api/communities'
import { useAuthStore } from '@/store/authStore'
import PostCard from '@/components/PostCard'
import JoinLeaveButton from '@/components/JoinLeaveButton'
import type { CommunityDoc } from '@/lib/api/communities'

export default function Community() {
  const { name } = useParams<{ name: string }>()
  const { user } = useAuthStore()
  const { activeTab, posts, setTab } = useFeedStore()
  const upsert = usePostStore((s) => s.upsert)
  const [community, setCommunity] = useState<({ id: string } & CommunityDoc) | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load community data
  useEffect(() => {
    if (!name) return
    
    getCommunityByName(name).then((comm) => {
      setCommunity(comm)
      setLoading(false)
      
      if (comm && user) {
        isUserMember(comm.id, user.uid).then(setIsMember)
      }
    }).catch(() => {
      setLoading(false)
    })
  }, [name, user])

  // Initialize feed with community posts
  useEffect(() => {
    if (community) {
      setTab('hot', community.id)
    }
  }, [community, setTab])

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

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 bg-white dark:bg-zinc-900 min-h-[calc(100vh-3rem)]">
        <div className="text-center py-8 text-zinc-500">Loading...</div>
      </div>
    )
  }

  if (!community) {
    return (
      <div className="max-w-3xl mx-auto p-4 bg-white dark:bg-zinc-900 min-h-[calc(100vh-3rem)]">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Community not found</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">The community r/{name} doesn't exist.</p>
          <Link to="/" className="text-primary-500 hover:underline">Go back home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white dark:bg-zinc-900 min-h-[calc(100vh-3rem)]">
      {/* Community Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">r/{community.name}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{community.title}</p>
          </div>
          {user && (
            <JoinLeaveButton
              communityName={community.name}
              communityId={community.id}
              onJoinChange={(joined) => {
                setIsMember(joined)
                window.dispatchEvent(new Event('community-joined'))
              }}
            />
          )}
        </div>
        {community.description && (
          <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-2">{community.description}</p>
        )}
        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {community.memberCount || 0} {community.memberCount === 1 ? 'member' : 'members'}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-4 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setTab(tab, community.id)}
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

      {/* Posts */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            No posts yet. {user && (
              <Link to={`/r/${name}/submit`} className="text-primary-500 hover:underline">Create one?</Link>
            )}
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  )
}
