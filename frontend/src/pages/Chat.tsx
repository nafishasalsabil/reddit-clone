import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { 
  streamConversations, 
  streamMessages, 
  sendMessage, 
  getOrCreateConversation,
  getOtherParticipant,
  getConversation
} from '@/lib/api/messages'
import { searchUsers } from '@/lib/api/users'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Avatar from '@/components/Avatar'

export default function Chat() {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<any[]>([])
  const [conversationUsers, setConversationUsers] = useState<Record<string, any>>({})
  const [messages, setMessages] = useState<any[]>([])
  const [messageText, setMessageText] = useState('')
  const [otherUser, setOtherUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  // Stream conversations and load user data
  useEffect(() => {
    if (!user) return

    const unsubscribe = streamConversations(async (convs) => {
      setConversations(convs)
      setLoading(false)
      
      // Load user data for each conversation
      const usersMap: Record<string, any> = {}
      await Promise.all(
        convs.map(async (conv) => {
          const otherUid = getOtherParticipant(conv, user.uid)
          if (otherUid && !usersMap[otherUid]) {
            try {
              const userDoc = await getDoc(doc(db, 'users', otherUid))
              usersMap[otherUid] = {
                uid: otherUid,
                ...userDoc.data()
              }
            } catch {
              usersMap[otherUid] = { uid: otherUid }
            }
          }
        })
      )
      setConversationUsers(usersMap)
    })

    return () => unsubscribe()
  }, [user])

  // Load other user data when conversation changes
  useEffect(() => {
    if (!conversationId || !user) return

    const loadConversation = async () => {
      const conv = await getConversation(conversationId)
      if (!conv) {
        navigate('/chat')
        return
      }

      const otherUid = getOtherParticipant(conv, user.uid)
      if (otherUid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', otherUid))
          setOtherUser({
            uid: otherUid,
            ...userDoc.data()
          })
        } catch {
          setOtherUser({ uid: otherUid })
        }
      }
    }

    loadConversation()
  }, [conversationId, user, navigate])

  // Stream messages for selected conversation
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return
    }

    const unsubscribe = streamMessages(conversationId, (msgs) => {
      setMessages(msgs)
    })

    return () => unsubscribe()
  }, [conversationId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conversationId || !messageText.trim() || !user) return

    try {
      await sendMessage(conversationId, messageText.trim())
      setMessageText('')
    } catch (error) {
      alert('Failed to send message. Please try again.')
    }
  }

  const handleStartConversation = async (otherUserUid: string) => {
    if (!user) return

    try {
      if (otherUserUid === user.uid) {
        alert('You cannot start a conversation with yourself')
        return
      }
      const convId = await getOrCreateConversation(otherUserUid)
      setShowNewConversation(false)
      setSearchQuery('')
      setSearchResults([])
      navigate(`/chat/${convId}`)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start conversation')
    }
  }

  // Search users with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery, 10)
        // Filter out current user
        const filteredResults = results.filter(u => u.uid !== user?.uid)
        setSearchResults(filteredResults)
      } catch (error: any) {
        // Show error message to user
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        }
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, user])

  const formatTime = (timestamp: any) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + 
           date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const getConversationName = (conv: any) => {
    if (!user) return 'Unknown'
    const otherUid = getOtherParticipant(conv, user.uid)
    const userData = conversationUsers[otherUid]
    return userData?.displayName || userData?.username || otherUid.substring(0, 8) + '...'
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-6xl mx-auto bg-white dark:bg-zinc-900 min-h-[calc(100vh-3rem)] flex">
      {/* Conversations List */}
      <div className="w-full md:w-80 border-r border-zinc-200 dark:border-zinc-700 flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Messages</h2>
            <button
              onClick={() => setShowNewConversation(true)}
              className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-full transition-colors"
              title="New conversation"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          {/* New Conversation Search */}
          {showNewConversation && (
            <div className="mb-3 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name or username..."
                className="w-full px-3 py-2 pr-8 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100"
                autoFocus
              />
              <button
                onClick={() => {
                  setShowNewConversation(false)
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1"
                title="Close search"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* Search Results */}
        {showNewConversation && searchQuery && (
          <div className="border-b border-zinc-200 dark:border-zinc-700 max-h-64 overflow-y-auto">
            {searching ? (
              <div className="p-4 text-center text-sm text-zinc-500">Searching...</div>
            ) : searchResults.length > 0 ? (
              <div>
                {searchResults.map((userResult) => (
                  <button
                    key={userResult.uid}
                    onClick={() => handleStartConversation(userResult.uid)}
                    className="w-full p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-3 text-left"
                  >
                    <Avatar
                      uid={userResult.uid}
                      size={40}
                      photoURL={userResult.photoURL}
                      displayName={userResult.displayName || userResult.username}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {userResult.displayName || userResult.username || 'Unknown User'}
                      </p>
                      {userResult.username && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          @{userResult.username}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-zinc-500">
                No users found matching "{searchQuery}"
                <p className="text-xs mt-1 text-zinc-400">Try searching by username or display name</p>
              </div>
            )}
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto">
          {showNewConversation ? null : (
            <>
              {loading ? (
                <div className="p-4 text-center text-zinc-500">Loading conversations...</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-zinc-500 text-sm">
                  <p className="mb-2">No conversations yet.</p>
                  <p>Click the + button above to start a new conversation.</p>
                </div>
              ) : (
                <div>
                  {conversations.map((conv) => {
                    const otherUid = getOtherParticipant(conv, user.uid)
                    const otherUserData = conversationUsers[otherUid] || { uid: otherUid }
                    const isActive = conv.id === conversationId
                    return (
                      <Link
                        key={conv.id}
                        to={`/chat/${conv.id}`}
                        className={`block p-4 border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
                          isActive ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar 
                            uid={otherUid} 
                            size={48}
                            photoURL={otherUserData.photoURL}
                            displayName={getConversationName(conv)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                u/{getConversationName(conv)}
                              </p>
                              {conv.lastMessageAt && (
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0 ml-2">
                                  {formatTime(conv.lastMessageAt)}
                                </span>
                              )}
                            </div>
                            {conv.lastMessage && (
                              <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                                {conv.lastMessageFrom === user.uid ? 'You: ' : ''}
                                {conv.lastMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col hidden md:flex">
        {conversationId && otherUser ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-3">
              <Avatar 
                uid={otherUser.uid} 
                size={40}
                photoURL={otherUser.photoURL}
                displayName={otherUser.displayName || otherUser.username}
              />
              <div>
                <Link 
                  to={`/u/${otherUser.uid}`}
                  className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
                >
                  u/{otherUser.displayName || otherUser.username || otherUser.uid.substring(0, 8) + '...'}
                </Link>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isOwn = msg.senderUid === user.uid
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isOwn
                          ? 'bg-primary-500 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <p
                          className={`text-xs ${
                            isOwn ? 'text-primary-100' : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {formatMessageTime(msg.createdAt)}
                        </p>
                        {isOwn && (
                          <div className="flex items-center" title={msg.seen ? 'Seen' : (msg.delivered || msg.delivered === undefined) ? 'Delivered' : 'Sent'}>
                            {msg.seen ? (
                              // Double checkmark (seen) - blue
                              <svg className="w-4 h-4 text-blue-300" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.175a.366.366 0 0 0-.063-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.175a.365.365 0 0 0-.063-.51z" fill="currentColor"/>
                              </svg>
                            ) : (msg.delivered || msg.delivered === undefined) ? (
                              // Double checkmark (delivered) - gray/white (undefined for backward compatibility)
                              <svg className="w-4 h-4 text-primary-200" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.175a.366.366 0 0 0-.063-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.175a.365.365 0 0 0-.063-.51z" fill="currentColor"/>
                              </svg>
                            ) : (
                              // Single checkmark (sent) - gray
                              <svg className="w-4 h-4 text-primary-200 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-700">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className="px-6 py-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-zinc-300 dark:text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p>Select a conversation or start a new one</p>
              <p className="text-sm mt-2">
                Visit a user's profile to start chatting with them
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Export helper function for starting conversations from other pages
export function useStartConversation() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  return async (otherUserUid: string) => {
    if (!user) {
      navigate('/login')
      return
    }

    try {
      const convId = await getOrCreateConversation(otherUserUid)
      navigate(`/chat/${convId}`)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start conversation')
    }
  }
}
