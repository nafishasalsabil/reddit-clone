import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { streamNotifications } from '@/lib/api/notifications'
import Avatar from './Avatar'

export default function Topbar() {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  // Stream notifications to get unread count
  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    const unsubscribe = streamNotifications((notifications) => {
      const unread = notifications.filter(n => !n.read).length
      setUnreadCount(unread)
    })

    return () => unsubscribe()
  }, [user])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  const handleLogout = async () => {
    try {
      await logout()
      setShowUserMenu(false)
      navigate('/')
    } catch (error) {
      // Error handling
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 w-full">
      <div className="w-full mx-auto px-2 sm:px-4 h-12 flex items-center gap-2">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1 sm:gap-2 flex-shrink-0 z-10">
          <img 
            src="/reddit-logo.svg" 
            alt="Reddit" 
            className="w-7 h-7 sm:w-8 sm:h-8"
            loading="eager"
            decoding="async"
          />
          <span className="font-bold text-lg sm:text-xl text-zinc-900 dark:text-zinc-100 hidden sm:inline">
            reddit
          </span>
        </Link>

        {/* Search Bar - Centered */}
        <form onSubmit={handleSearch} className="flex-1 flex justify-center max-w-2xl mx-auto">
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Reddit"
              className="w-full h-8 sm:h-9 px-3 sm:px-4 pr-8 sm:pr-10 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-xs sm:text-sm"
            />
            <button
              type="submit"
              className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>

        {/* Right Side Actions - Rightmost */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 z-10">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {user ? (
            <>
              {/* Chat Icon */}
              <Link
                to="/chat"
                className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                title="Chat"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </Link>

              {/* Create Post Icon */}
              <Link
                to="/submit"
                className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                title="Create Post"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Link>

              {/* Notification Icon */}
              <Link
                to="/notifications"
                className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors relative"
                title="Notifications"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-primary-500 text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* User Profile Avatar with Dropdown */}
              <div className="relative user-menu-container">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="p-0.5 sm:p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                  title="User Menu"
                >
                  <Avatar 
                    uid={user.uid} 
                    size={28} 
                    photoURL={user.photoURL || undefined}
                    displayName={user.displayName || undefined}
                  />
                </button>

                {/* User Menu Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-50">
                    <Link
                      to={`/u/${user.uid}`}
                      onClick={() => setShowUserMenu(false)}
                      className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </div>
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </div>
                    </Link>
                    <div className="border-t border-zinc-200 dark:border-zinc-700 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Log Out
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              to="/login"
              className="px-3 sm:px-4 py-1 sm:py-1.5 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors text-xs sm:text-sm font-semibold"
            >
              Log In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

