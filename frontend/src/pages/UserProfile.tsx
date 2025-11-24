import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { usePostStore } from '@/store/postStore'
import { streamUserPosts } from '@/lib/api/posts'
import { getOrCreateConversation } from '@/lib/api/messages'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import PostCard from '@/components/PostCard'
import Avatar from '@/components/Avatar'
import type { FeedTab } from '@/store/feedStore'

export default function UserProfile() {
  const { uid } = useParams<{ uid: string }>()
  const { user: currentUser } = useAuthStore()
  const navigate = useNavigate()
  const upsert = usePostStore((s) => s.upsert)
  const [posts, setPosts] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<FeedTab>('new')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ postCount: 0, commentCount: 0, totalKarma: 0 })
  const [userData, setUserData] = useState<any>(null)
  const [accountCreatedAt, setAccountCreatedAt] = useState<Date | null>(null)

  const subscribeToPost = usePostStore((s) => s.subscribeToPost)
  const unsubscribeFromPost = usePostStore((s) => s.unsubscribeFromPost)

  // Load user data
  useEffect(() => {
    if (!uid) return
    
    // Try to get user document if it exists
    getDoc(doc(db, 'users', uid)).then((userDoc) => {
      if (userDoc.exists()) {
        setUserData(userDoc.data())
      }
    }).catch(() => {
      // User document doesn't exist, that's okay
    })
  }, [uid])

  // Load user stats and account creation date
  useEffect(() => {
    if (!uid) return
    
    const loadStats = async () => {
      try {
        // Count posts
        const postsQuery = query(
          collection(db, 'posts'),
          where('authorUid', '==', uid)
        )
        const postsSnapshot = await getDocs(postsQuery)
        const postCount = postsSnapshot.size
        let totalKarma = 0
        let oldestPostDate: Date | null = null
        
        postsSnapshot.forEach((doc) => {
          const data = doc.data()
          totalKarma += data.score || 0
          
          // Get the oldest post's creation date
          if (data.createdAt) {
            let postDate: Date
            if (data.createdAt?.toDate) {
              postDate = data.createdAt.toDate()
            } else if (data.createdAt?.seconds) {
              postDate = new Date(data.createdAt.seconds * 1000)
            } else {
              return
            }
            if (!oldestPostDate || postDate < oldestPostDate) {
              oldestPostDate = postDate
            }
          }
        })

        // Determine account creation date
        // Priority: 1. User document createdAt, 2. Firebase Auth metadata (for current user), 3. Oldest post date
        if (userData?.createdAt) {
          let userDate: Date
          if (userData.createdAt?.toDate) {
            userDate = userData.createdAt.toDate()
          } else if (userData.createdAt?.seconds) {
            userDate = new Date(userData.createdAt.seconds * 1000)
          } else {
            userDate = new Date(userData.createdAt)
          }
          setAccountCreatedAt(userDate)
        } else if (currentUser?.uid === uid && currentUser?.metadata?.creationTime) {
          // For current user, use Firebase Auth metadata
          setAccountCreatedAt(new Date(currentUser.metadata.creationTime))
        } else if (oldestPostDate) {
          setAccountCreatedAt(oldestPostDate)
        }

        // Count comments (approximate - we'd need to query all posts' comments)
        // For now, we'll just show post count
        setStats({
          postCount,
          commentCount: 0, // TODO: implement comment counting
          totalKarma
        })
      } catch (error) {
      }
    }
    
    loadStats()
  }, [uid, userData, currentUser])

  // Stream user posts
  useEffect(() => {
    if (!uid) return
    
    setLoading(true)
    setPosts([]) // Clear posts when tab changes
    
    const unsubscribe = streamUserPosts({ uid, sort: activeTab }, (ps) => {
      setPosts(ps)
      setLoading(false)
    }, (error) => {
      setLoading(false)
    })

    return () => unsubscribe()
  }, [uid, activeTab])

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

  if (!uid) {
    return (
      <div className="max-w-3xl mx-auto p-4 bg-white dark:bg-zinc-900 min-h-[calc(100vh-3rem)]">
        <div className="text-center py-8 text-zinc-500">User not found</div>
      </div>
    )
  }

  const isOwnProfile = currentUser?.uid === uid
  const displayName = userData?.displayName || userData?.username || uid.substring(0, 8) + '...'
  const tabs: FeedTab[] = ['hot', 'new', 'top']

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white dark:bg-zinc-900 min-h-[calc(100vh-3rem)]">
      {/* Profile Header */}
      <div className="mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-start gap-4">
          <Avatar 
            uid={uid} 
            size={80}
            photoURL={userData?.photoURL}
            displayName={displayName}
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              u/{displayName}
            </h1>
            <div className="flex items-center gap-2 mb-2">
              {accountCreatedAt && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Redditor since {accountCreatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </p>
              )}
            </div>
            {isOwnProfile && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                This is your profile
              </p>
            )}
            
            {/* Message Button */}
            {!isOwnProfile && currentUser && (
              <div className="mb-4">
                <button
                  onClick={async () => {
                    try {
                      const convId = await getOrCreateConversation(uid!)
                      navigate(`/chat/${convId}`)
                    } catch (error) {
                      alert(error instanceof Error ? error.message : 'Failed to start conversation')
                    }
                  }}
                  className="px-4 py-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors text-sm font-semibold flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Message
                </button>
              </div>
            )}
            
            {/* Stats */}
            <div className="flex gap-6 mt-4">
              <div>
                <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {stats.postCount}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {stats.postCount === 1 ? 'Post' : 'Posts'}
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {stats.totalKarma}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Karma</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {stats.commentCount}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {stats.commentCount === 1 ? 'Comment' : 'Comments'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-4 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
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
      {loading ? (
        <div className="text-center py-8 text-zinc-500">Loading...</div>
      ) : (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              {isOwnProfile ? (
                <>
                  You haven't posted anything yet.{' '}
                  <Link to="/submit" className="text-primary-500 hover:underline">Create your first post?</Link>
                </>
              ) : (
                <>This user hasn't posted anything yet.</>
              )}
            </div>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      )}
    </div>
  )
}
