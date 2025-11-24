import { 
  collection, 
  doc, 
  onSnapshot, 
  orderBy, 
  query, 
  updateDoc,
  getDocs,
  Timestamp
} from 'firebase/firestore'
import { db, auth } from '../firebase'

export type NotificationType = 
  | 'comment_reply' 
  | 'post_reply' 
  | 'post_upvote' 
  | 'comment_upvote'
  | 'mention'
  | 'mod_action'
  | 'community_invite'

export interface NotificationDoc {
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: any
  // Link data
  postId?: string
  commentId?: string
  communityId?: string
  communityName?: string // Community name for routing
  userId?: string
  // Metadata
  actorUid?: string // User who triggered the notification
  metadata?: Record<string, any>
}

// Stream notifications for current user
export function streamNotifications(
  onNotifications: (notifications: (NotificationDoc & { id: string })[]) => void
) {
  if (!auth.currentUser) {
    onNotifications([])
    return () => {}
  }

  const uid = auth.currentUser.uid
  const notificationsRef = collection(db, 'notifications', uid, 'items')
  const q = query(notificationsRef, orderBy('createdAt', 'desc'))

  return onSnapshot(
    q,
    (snap) => {
      const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationDoc & { id: string }))
      onNotifications(notifications)
    },
    (error) => {
      onNotifications([])
    }
  )
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string) {
  if (!auth.currentUser) throw new Error('Not authenticated')
  
  const uid = auth.currentUser.uid
  const notificationRef = doc(db, 'notifications', uid, 'items', notificationId)
  await updateDoc(notificationRef, { read: true })
}

// Mark all notifications as read
export async function markAllNotificationsAsRead() {
  if (!auth.currentUser) throw new Error('Not authenticated')
  
  const uid = auth.currentUser.uid
  const notificationsRef = collection(db, 'notifications', uid, 'items')
  const q = query(notificationsRef, orderBy('createdAt', 'desc'))
  
  const snapshot = await getDocs(q)
  const unreadNotifications = snapshot.docs.filter(doc => !doc.data().read)
  
  const updates = unreadNotifications.map(doc => 
    updateDoc(doc.ref, { read: true })
  )
  
  await Promise.all(updates)
}

// Get unread count
export async function getUnreadCount(): Promise<number> {
  if (!auth.currentUser) return 0
  
  const uid = auth.currentUser.uid
  const notificationsRef = collection(db, 'notifications', uid, 'items')
  const q = query(notificationsRef, orderBy('createdAt', 'desc'))
  
  try {
    const snapshot = await getDocs(q)
    return snapshot.docs.filter(doc => !doc.data().read).length
  } catch (error) {
    return 0
  }
}

