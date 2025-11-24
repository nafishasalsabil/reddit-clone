import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, runTransaction } from 'firebase/firestore'
import { db, auth } from '../firebase'

export interface CommentDoc {
  authorUid: string
  parentId?: string
  body: string
  score: number
  path: string
  createdAt: any
  editedAt?: any
}

export function streamCommentsTree(postId: string, onItems: (docs: any[]) => void) {
  const base = collection(db, 'posts', postId, 'comments')
  const q = query(base, orderBy('path'))
  return onSnapshot(q, (snap) => onItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export async function createComment(postId: string, data: Omit<CommentDoc, 'score'|'createdAt'>) {
  const col = collection(db, 'posts', postId, 'comments')
  const commentRef = await addDoc(col, { ...data, score: 0, createdAt: serverTimestamp() })
  
  // Update post commentCount
  const postRef = doc(db, 'posts', postId)
  const postSnap = await getDoc(postRef)
  if (postSnap.exists()) {
    const currentCount = postSnap.data()?.commentCount || 0
    await updateDoc(postRef, { commentCount: currentCount + 1 })
  }
  
  return commentRef
}

export async function deleteComment(postId: string, commentId: string) {
  const commentRef = doc(db, 'posts', postId, 'comments', commentId)
  await deleteDoc(commentRef)
  
  // Update post commentCount
  const postRef = doc(db, 'posts', postId)
  const postSnap = await getDoc(postRef)
  if (postSnap.exists()) {
    const currentCount = postSnap.data()?.commentCount || 0
    await updateDoc(postRef, { commentCount: Math.max(0, currentCount - 1) })
  }
}

export async function voteComment(postId: string, commentId: string, value: -1|0|1) {
  if (!auth.currentUser) throw new Error('Not authenticated')
  
  const uid = auth.currentUser.uid
  const voteDoc = doc(db, 'votes', `comment_${commentId}`, 'userVotes', uid)
  const commentDoc = doc(db, 'posts', postId, 'comments', commentId)

  const result = await runTransaction(db, async (tx) => {
    // Get previous vote
    const prevVoteSnap = await tx.get(voteDoc)
    const prevValue = prevVoteSnap.exists() ? (prevVoteSnap.data()?.value as number) : 0
    const delta = value - prevValue
    
    if (delta === 0) {
      // No change, just return current score
      const commentSnap = await tx.get(commentDoc)
      if (!commentSnap.exists()) throw new Error('Comment not found')
      return { score: commentSnap.data()?.score as number }
    }

    // Get comment to update score
    const commentSnap = await tx.get(commentDoc)
    if (!commentSnap.exists()) throw new Error('Comment not found')
    const commentData = commentSnap.data()
    if (!commentData) throw new Error('Comment data not found')

    // Update user vote
    if (value === 0) {
      tx.delete(voteDoc)
    } else {
      tx.set(voteDoc, { value, updatedAt: serverTimestamp() })
    }

    // Update comment score
    const newScore = (commentData.score as number) + delta
    
    tx.update(commentDoc, {
      score: newScore
    })

    return { score: newScore }
  })

  return result
}
