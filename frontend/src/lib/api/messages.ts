import { 
  addDoc, 
  collection, 
  doc, 
  getDoc, 
  onSnapshot, 
  orderBy, 
  query, 
  serverTimestamp, 
  where,
  updateDoc,
  Timestamp,
  getDocs,
  or
} from 'firebase/firestore'
import { db, auth } from '../firebase'

export interface ConversationDoc {
  participantUids: string[]
  lastMessage?: string
  lastMessageAt?: any
  lastMessageFrom?: string
  createdAt: any
  updatedAt: any
}

export interface MessageDoc {
  conversationId: string
  senderUid: string
  text: string
  read: boolean
  delivered: boolean
  deliveredAt?: any
  seen: boolean
  seenAt?: any
  createdAt: any
}

// Create or get existing conversation between two users
export async function getOrCreateConversation(otherUserUid: string): Promise<string> {
  if (!auth.currentUser) throw new Error('Not authenticated')
  const currentUid = auth.currentUser.uid

  if (currentUid === otherUserUid) {
    throw new Error('Cannot create conversation with yourself')
  }

  // Check if conversation already exists
  const conversationsRef = collection(db, 'conversations')
  const q = query(
    conversationsRef,
    where('participantUids', 'array-contains', currentUid)
  )
  
  const snapshot = await getDocs(q)
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as ConversationDoc
    if (data.participantUids.length === 2 && 
        data.participantUids.includes(currentUid) && 
        data.participantUids.includes(otherUserUid)) {
      return docSnap.id
    }
  }

  // Create new conversation
  const newConv = {
    participantUids: [currentUid, otherUserUid].sort(), // Sort for consistent lookup
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  const docRef = await addDoc(conversationsRef, newConv)
  return docRef.id
}

// Send a message in a conversation
export async function sendMessage(conversationId: string, text: string) {
  if (!auth.currentUser) throw new Error('Not authenticated')
  
  const messageRef = collection(db, 'conversations', conversationId, 'messages')
  const message: Omit<MessageDoc, 'createdAt'> = {
    conversationId,
    senderUid: auth.currentUser.uid,
    text: text.trim(),
    read: false,
    delivered: false,
    seen: false
  }

  const docRef = await addDoc(messageRef, {
    ...message,
    createdAt: serverTimestamp()
  })

  // Update conversation metadata
  const convRef = doc(db, 'conversations', conversationId)
  await updateDoc(convRef, {
    lastMessage: text.trim().substring(0, 100), // Truncate for preview
    lastMessageAt: serverTimestamp(),
    lastMessageFrom: auth.currentUser.uid,
    updatedAt: serverTimestamp()
  })

  return docRef.id
}

// Stream conversations for current user
// Note: This query requires a Firestore composite index on (participantUids, updatedAt)
// Firestore will prompt you to create it when needed, or you can create it manually in the console
export function streamConversations(onConversations: (convs: any[]) => void) {
  if (!auth.currentUser) {
    onConversations([])
    return () => {}
  }

  const conversationsRef = collection(db, 'conversations')
  const q = query(
    conversationsRef,
    where('participantUids', 'array-contains', auth.currentUser.uid),
    orderBy('updatedAt', 'desc')
  )

  return onSnapshot(
    q,
    (snap) => {
      const convs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      onConversations(convs)
    },
    (error) => {
      // Return empty array on error
      onConversations([])
    }
  )
}

// Stream messages for a conversation
export function streamMessages(conversationId: string, onMessages: (messages: any[]) => void) {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages')
  const q = query(messagesRef, orderBy('createdAt', 'asc'))

  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    onMessages(messages)
    
    if (!auth.currentUser) return
    
    const currentUid = auth.currentUser.uid
    const updates: Promise<void>[] = []
    
    // Mark messages as delivered if current user is the recipient and message hasn't been delivered yet
    const undeliveredMessages = messages.filter(
      (msg: any) => msg.senderUid !== currentUid && !msg.delivered
    )
    if (undeliveredMessages.length > 0) {
      undeliveredMessages.forEach((msg: any) => {
        updates.push(
          updateDoc(doc(db, 'conversations', conversationId, 'messages', msg.id), { 
            delivered: true,
            deliveredAt: serverTimestamp()
          }).then(() => {})
        )
      })
    }
    
    // Mark messages as seen if current user is the recipient and conversation is active
    // (When messages are loaded, they're being seen)
    const unseenMessages = messages.filter(
      (msg: any) => msg.senderUid !== currentUid && !msg.seen
    )
    if (unseenMessages.length > 0) {
      unseenMessages.forEach((msg: any) => {
        updates.push(
          updateDoc(doc(db, 'conversations', conversationId, 'messages', msg.id), { 
            seen: true,
            seenAt: serverTimestamp(),
            read: true // Also mark as read
          }).then(() => {})
        )
      })
    }
    
    // Also mark old read field for backward compatibility
    const unreadMessages = messages.filter(
      (msg: any) => msg.senderUid !== currentUid && !msg.read
    )
    if (unreadMessages.length > 0) {
      unreadMessages.forEach((msg: any) => {
        updates.push(
          updateDoc(doc(db, 'conversations', conversationId, 'messages', msg.id), { 
            read: true 
          }).then(() => {})
        )
      })
    }
    
    if (updates.length > 0) {
    }
  })
}

// Get the other participant's UID from a conversation
export function getOtherParticipant(conversation: ConversationDoc, currentUid: string): string {
  return conversation.participantUids.find(uid => uid !== currentUid) || ''
}

// Get conversation by ID
export async function getConversation(conversationId: string): Promise<any> {
  const convDoc = await getDoc(doc(db, 'conversations', conversationId))
  if (!convDoc.exists()) return null
  return { id: convDoc.id, ...convDoc.data() }
}
