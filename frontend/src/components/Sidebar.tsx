import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { getUserJoinedCommunities } from '@/lib/api/communities'
import type { CommunityDoc } from '@/lib/api/communities'
import CreateCommunityModal from './CreateCommunityModal'
import CreateCustomFeedModal from './CreateCustomFeedModal'

export default function Sidebar() {
  const { user } = useAuthStore()
  const location = useLocation()
  const [communities, setCommunities] = useState<({ id: string } & CommunityDoc)[]>([])
  const [communitiesExpanded, setCommunitiesExpanded] = useState(true)
  const [customFeedsExpanded, setCustomFeedsExpanded] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreateCustomFeedModalOpen, setIsCreateCustomFeedModalOpen] = useState(false)

  useEffect(() => {
    const loadCommunities = () => {
      if (user) {
        getUserJoinedCommunities(user.uid).then(setCommunities).catch(() => {})
      } else {
        setCommunities([])
      }
    }
    
    loadCommunities()
    
    // Listen for community join/leave events
    const handleCommunityChange = () => {
      loadCommunities()
    }
    window.addEventListener('community-joined', handleCommunityChange)
    
    return () => {
      window.removeEventListener('community-joined', handleCommunityChange)
    }
  }, [user])

  const isActive = (path: string) => location.pathname === path

  return (
    <aside className="hidden md:block w-48 lg:w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700 overflow-y-auto h-[calc(100vh-3rem)] sticky top-12 flex-shrink-0">
      <div className="p-2">
        {/* Navigation Section */}
        <nav className="mb-2">
          <Link
            to="/"
            className={`flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
              isActive('/') ? 'bg-zinc-100 dark:bg-zinc-800' : ''
            }`}
          >
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Home</span>
          </Link>

          <Link
            to="/popular"
            className={`flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
              isActive('/popular') ? 'bg-zinc-100 dark:bg-zinc-800' : ''
            }`}
          >
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className={`text-sm font-medium ${isActive('/popular') ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>Popular</span>
          </Link>

          <Link
            to="/all"
            className={`flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
              isActive('/all') ? 'bg-zinc-100 dark:bg-zinc-800' : ''
            }`}
          >
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className={`text-sm font-medium ${isActive('/all') ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>All</span>
          </Link>

          <Link
            to="/search"
            className={`flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
              isActive('/search') ? 'bg-zinc-100 dark:bg-zinc-800' : ''
            }`}
          >
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className={`text-sm font-medium ${isActive('/search') ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>Explore</span>
          </Link>

          {user && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors mt-2 w-full text-left"
            >
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Start a community</span>
            </button>
          )}
        </nav>

        <div className="border-t border-zinc-200 dark:border-zinc-700 my-2"></div>

        {/* Custom Feeds Section */}
        <div className="mb-2">
          <button
            onClick={() => setCustomFeedsExpanded(!customFeedsExpanded)}
            className="w-full flex items-center justify-between px-2 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          >
            <span>CUSTOM FEEDS</span>
            <svg
              className={`w-4 h-4 transition-transform ${customFeedsExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {customFeedsExpanded && (
            <div className="mt-1">
              <button
                onClick={() => setIsCreateCustomFeedModalOpen(true)}
                className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors w-full text-left"
              >
                <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Create Custom Feed</span>
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-700 my-2"></div>

        {/* Communities Section */}
        <div>
          <button
            onClick={() => setCommunitiesExpanded(!communitiesExpanded)}
            className="w-full flex items-center justify-between px-2 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          >
            <span>COMMUNITIES</span>
            <svg
              className={`w-4 h-4 transition-transform ${communitiesExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {communitiesExpanded && (
            <div className="mt-1 space-y-1">
              {user && (
                <Link
                  to={`/u/${user.uid}`}
                  className={`flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                    location.pathname === `/u/${user.uid}` ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">u</span>
                  </div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">u/{user.uid.substring(0, 8)}...</span>
                </Link>
              )}

              {communities.map((community) => (
                <Link
                  key={community.id}
                  to={`/r/${community.name}`}
                  className={`flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                    location.pathname === `/r/${community.name}` ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">r</span>
                  </div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">r/{community.name}</span>
                </Link>
              ))}

              {communities.length === 0 && (
                <div className="px-2 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                  No communities yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CreateCommunityModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
      <CreateCustomFeedModal 
        isOpen={isCreateCustomFeedModalOpen} 
        onClose={() => setIsCreateCustomFeedModalOpen(false)} 
      />
    </aside>
  )
}

