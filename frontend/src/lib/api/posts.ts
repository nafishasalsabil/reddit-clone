import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, runTransaction, Timestamp } from 'firebase/firestore'
import { db, auth } from '../firebase'

export type PostType = 'text'|'link'|'image'
export interface PostDoc {
  cid: null | string
  authorUid: string
  title: string
  type: PostType
  body?: string
  url?: string
  imageUrl?: string
  score: number
  hotRank: number
  commentCount: number
  createdAt: any
  editedAt?: null | any
}

export async function createPost(data: Omit<PostDoc, 'score'|'hotRank'|'commentCount'|'createdAt'>) {
  return addDoc(collection(db, 'posts'), {
    ...data,
    score: 0,
    hotRank: 0,
    commentCount: 0,
    createdAt: serverTimestamp()
  })
}

export async function createPostText(title: string, body?: string) {
  if (!auth.currentUser) throw new Error('Not authenticated')
  const docRef = await createPost({
    cid: null,
    authorUid: auth.currentUser.uid,
    title,
    type: 'text',
    body,
    editedAt: null
  })
  return docRef
}

export async function createPostLink(title: string, url: string) {
  if (!auth.currentUser) throw new Error('Not authenticated')
  const docRef = await createPost({
    cid: null,
    authorUid: auth.currentUser.uid,
    title,
    type: 'link',
    url,
    editedAt: null
  })
  return docRef
}

export async function createPostImage(title: string, imageUrl: string) {
  if (!auth.currentUser) throw new Error('Not authenticated')
  const docRef = await createPost({
    cid: null,
    authorUid: auth.currentUser.uid,
    title,
    type: 'image',
    imageUrl,
    editedAt: null
  })
  return docRef
}

export function streamHotPosts({ cid, limit }: { cid?: string; limit?: number }, onPosts: (docs: any[]) => void) {
  const base = collection(db, 'posts')
  const constraints = [orderBy('hotRank', 'desc'), orderBy('createdAt', 'desc')]
  const q = cid ? query(base, where('cid', '==', cid), ...constraints) : query(base, ...constraints)
  return onSnapshot(q, (snap) => onPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export function streamNewPosts({ cid, limit }: { cid?: string; limit?: number }, onPosts: (docs: any[]) => void) {
  const base = collection(db, 'posts')
  const constraints = [orderBy('createdAt', 'desc')]
  const q = cid ? query(base, where('cid', '==', cid), ...constraints) : query(base, ...constraints)
  return onSnapshot(q, (snap) => onPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export function streamTopPosts({ cid, limit }: { cid?: string; limit?: number }, onPosts: (docs: any[]) => void) {
  const base = collection(db, 'posts')
  const constraints = [orderBy('score', 'desc'), orderBy('createdAt', 'desc')]
  const q = cid ? query(base, where('cid', '==', cid), ...constraints) : query(base, ...constraints)
  return onSnapshot(q, (snap) => onPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export function streamUserPosts(
  { uid, sort = 'new' }: { uid: string; sort?: 'hot' | 'new' | 'top' }, 
  onPosts: (docs: any[]) => void,
  onError?: (error: Error) => void
) {
  const base = collection(db, 'posts')
  let constraints: any[]
  
  if (sort === 'hot') {
    constraints = [orderBy('hotRank', 'desc'), orderBy('createdAt', 'desc')]
  } else if (sort === 'new') {
    constraints = [orderBy('createdAt', 'desc')]
  } else { // top
    constraints = [orderBy('score', 'desc'), orderBy('createdAt', 'desc')]
  }
  
  const q = query(base, where('authorUid', '==', uid), ...constraints)
  
  if (onError) {
    return onSnapshot(q, 
      (snap) => onPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (error) => onError(error as Error)
    )
  } else {
    return onSnapshot(q, (snap) => onPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }
}

export function streamPost(postId: string, onPost: (post: any) => void) {
  return onSnapshot(doc(db, 'posts', postId), (snap) => {
    if (snap.exists()) {
      onPost({ id: snap.id, ...snap.data() })
    } else {
      onPost(null)
    }
  })
}

export async function getUserVote(postId: string): Promise<-1|0|1> {
  if (!auth.currentUser) return 0
  const voteDoc = await getDoc(doc(db, 'votes', `post_${postId}`, 'userVotes', auth.currentUser.uid))
  if (!voteDoc.exists()) return 0
  return (voteDoc.data()?.value as -1|0|1) || 0
}

export function streamUserVote(postId: string, onVote: (vote: -1|0|1) => void) {
  if (!auth.currentUser) {
    onVote(0)
    return () => {}
  }
  return onSnapshot(
    doc(db, 'votes', `post_${postId}`, 'userVotes', auth.currentUser.uid),
    (snap) => {
      onVote(snap.exists() ? ((snap.data()?.value as -1|0|1) || 0) : 0)
    }
  )
}

// Compute hot rank (same algorithm as server)
function computeHot(score: number, createdAt: Timestamp | { seconds: number }): number {
  const s = score > 0 ? 1 : score < 0 ? -1 : 0
  const order = Math.log10(Math.max(Math.abs(score), 1))
  const seconds = (createdAt as any).seconds - 1134028003
  const hot = s * order + seconds / 45000
  return Number(hot.toFixed(7))
}

export async function votePost(postId: string, value: -1|0|1) {
  if (!auth.currentUser) throw new Error('Not authenticated')
  
  const uid = auth.currentUser.uid
  const voteDoc = doc(db, 'votes', `post_${postId}`, 'userVotes', uid)
  const postDoc = doc(db, 'posts', postId)

  const result = await runTransaction(db, async (tx) => {
    // Get previous vote
    const prevVoteSnap = await tx.get(voteDoc)
    const prevValue = prevVoteSnap.exists() ? (prevVoteSnap.data()?.value as number) : 0
    const delta = value - prevValue
    
    if (delta === 0) {
      // No change, just return current score
      const postSnap = await tx.get(postDoc)
      if (!postSnap.exists()) throw new Error('Post not found')
      return { score: postSnap.data()?.score as number, hotRank: postSnap.data()?.hotRank as number }
    }

    // Get post to update score
    const postSnap = await tx.get(postDoc)
    if (!postSnap.exists()) throw new Error('Post not found')
    const postData = postSnap.data()
    if (!postData) throw new Error('Post data not found')

    // Update user vote
    if (value === 0) {
      tx.delete(voteDoc)
    } else {
      tx.set(voteDoc, { value, updatedAt: serverTimestamp() })
    }

    // Update post score and hotRank
    const newScore = (postData.score as number) + delta
    const createdAt = postData.createdAt as Timestamp
    const newHotRank = computeHot(newScore, createdAt)
    
    tx.update(postDoc, {
      score: newScore,
      hotRank: newHotRank
    })

    return { score: newScore, hotRank: newHotRank }
  })

  return result
}
