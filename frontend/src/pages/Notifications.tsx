import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { 
  streamNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  type NotificationDoc 
} from '@/lib/api/notifications'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Avatar from '@/components/Avatar'

export default function Notifications() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<(NotificationDoc & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAllRead, setMarkingAllRead] = useState(false)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const unsubscribe = streamNotifications((notifs) => {
      setNotifications(notifs)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true)
    try {
      await markAllNotificationsAsRead()
    } catch (error) {
      alert('Failed to mark all notifications as read')
    } finally {
      setMarkingAllRead(false)
    }
  }

  const handleNotificationClick = async (notification: NotificationDoc & { id: string }) => {
    // Mark as read
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id)
      } catch (error) {
        // Error marking as read
      }
    }

    // Navigate based on notification type
    if (notification.postId) {
      let communityName = notification.communityName
      
      // If we have communityId but not name, fetch it
      if (!communityName && notification.communityId) {
        try {
          const communityDoc = await getDoc(doc(db, 'communities', notification.communityId))
          if (communityDoc.exists()) {
            communityName = communityDoc.data().name
          }
        } catch (error) {
          // Error fetching community
        }
      }
      
      const communityPath = communityName || 'all'
      
      if (notification.commentId) {
        // Navigate to post with comment highlighted
        navigate(`/r/${communityPath}/post/${notification.postId}#comment-${notification.commentId}`)
      } else {
        navigate(`/r/${communityPath}/post/${notification.postId}`)
      }
    } else if (notification.communityName) {
      navigate(`/r/${notification.communityName}`)
    } else if (notification.communityId) {
      // Try to fetch community name
      try {
        const communityDoc = await getDoc(doc(db, 'communities', notification.communityId))
        if (communityDoc.exists()) {
          navigate(`/r/${communityDoc.data().name}`)
        }
      } catch (error) {
      }
    } else if (notification.userId) {
      navigate(`/u/${notification.userId}`)
    }
  }

  const getNotificationIcon = (type: NotificationDoc['type']) => {
    switch (type) {
      case 'comment_reply':
      case 'post_reply':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      case 'post_upvote':
      case 'comment_upvote':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
        )
      case 'mention':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      case 'mod_action':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )
      case 'community_invite':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )
    }
  }

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now'
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffSecs = Math.floor(diffMs / 1000)
      const diffMins = Math.floor(diffSecs / 60)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffSecs < 60) return 'Just now'
      if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
      if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
      if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
      return date.toLocaleDateString()
    } catch {
      return 'Just now'
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-4 bg-white dark:bg-zinc-900 min-h-[calc(100vh-3rem)]">
        <div className="text-center py-8">
          <p className="text-zinc-500 mb-4">Please log in to view notifications</p>
          <Link to="/login" className="text-primary-500 hover:underline">
            Log In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-2 sm:p-4 bg-white dark:bg-zinc-900 min-h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Notifications
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAllRead}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-primary-500 hover:bg-primary-50 dark:hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50"
          >
            {markingAllRead ? 'Marking...' : 'Mark all as read'}
          </button>
        )}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="text-center py-8 text-zinc-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <svg 
            className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg mb-2">No notifications yet</p>
          <p className="text-zinc-400 dark:text-zinc-500 text-sm">
            When you get notifications, they'll show up here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`w-full text-left p-3 sm:p-4 rounded-lg border transition-colors ${
                notification.read
                  ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  : 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/30'
              }`}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                {/* Icon */}
                <div className={`flex-shrink-0 mt-0.5 ${
                  notification.read 
                    ? 'text-zinc-500 dark:text-zinc-400' 
                    : 'text-primary-500'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className={`text-sm sm:text-base font-semibold ${
                      notification.read
                        ? 'text-zinc-700 dark:text-zinc-300'
                        : 'text-zinc-900 dark:text-zinc-100'
                    }`}>
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className={`text-xs sm:text-sm mb-2 ${
                    notification.read
                      ? 'text-zinc-600 dark:text-zinc-400'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {notification.body}
                  </p>
                  <div className="flex items-center gap-2">
                    {notification.actorUid && (
                      <Avatar
                        uid={notification.actorUid}
                        size={16}
                      />
                    )}
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

