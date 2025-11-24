import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import PostCard from '@/components/PostCard'
import { listCommunities } from '@/lib/api/communities'
import { searchPosts } from '@/lib/api/search'
import type { CommunityDoc } from '@/lib/api/communities'

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryParam = searchParams.get('q') || ''
  const [searchTerm, setSearchTerm] = useState(queryParam)
  const [posts, setPosts] = useState<any[]>([])
  const [communities, setCommunities] = useState<({ id: string } & CommunityDoc)[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'communities'>('posts')

  const handleSearch = async (term: string) => {
    if (!term.trim()) {
      setPosts([])
      setCommunities([])
      return
    }

    setLoading(true)
    setSearchParams({ q: term })

    try {
      // Search posts using the searchPosts function (handles Algolia if enabled)
      const postsData = await searchPosts(term)
      setPosts(postsData)

      // Search communities by name or title (client-side filtering)
      const allCommunities = await listCommunities(100)
      const filteredCommunities = allCommunities.filter(comm => 
        comm.name.toLowerCase().includes(term.toLowerCase()) ||
        comm.title.toLowerCase().includes(term.toLowerCase()) ||
        (comm.description && comm.description.toLowerCase().includes(term.toLowerCase()))
      )
      setCommunities(filteredCommunities.slice(0, 20))
    } catch (error) {
      // Fallback: simple client-side filtering
      const allCommunities = await listCommunities(100)
      const filteredCommunities = allCommunities.filter(comm => 
        comm.name.toLowerCase().includes(term.toLowerCase()) ||
        comm.title.toLowerCase().includes(term.toLowerCase()) ||
        (comm.description && comm.description.toLowerCase().includes(term.toLowerCase()))
      )
      setCommunities(filteredCommunities.slice(0, 20))
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (queryParam) {
      handleSearch(queryParam)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(searchTerm)
  }

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white dark:bg-zinc-900 min-h-[calc(100vh-3rem)]">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Explore</h1>
      
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search posts and communities..."
            className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {/* Tabs */}
      {queryParam && (
        <div className="mb-4 flex gap-4 border-b border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'posts'
                ? 'border-b-2 border-primary-500 text-primary-500'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            Posts ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab('communities')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'communities'
                ? 'border-b-2 border-primary-500 text-primary-500'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            Communities ({communities.length})
          </button>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="text-center py-8 text-zinc-500">Searching...</div>
      ) : queryParam ? (
        <div className="space-y-4">
          {activeTab === 'posts' ? (
            posts.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                No posts found for "{queryParam}"
              </div>
            ) : (
              posts.map((post) => <PostCard key={post.id} post={post} />)
            )
          ) : (
            communities.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                No communities found for "{queryParam}"
              </div>
            ) : (
              <div className="space-y-2">
                {communities.map((community) => (
                  <Link
                    key={community.id}
                    to={`/r/${community.name}`}
                    className="block p-4 border border-zinc-200 dark:border-zinc-700 rounded-md hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">r</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">r/{community.name}</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{community.title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                          {community.memberCount || 0} {community.memberCount === 1 ? 'member' : 'members'}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-zinc-500">
          Enter a search term to find posts and communities
        </div>
      )}
    </div>
  )
}
