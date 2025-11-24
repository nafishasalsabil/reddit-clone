import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase'

export interface CommunityDoc {
  name: string
  title: string
  description?: string
  createdBy: string
  createdAt: any
  memberCount: number
  modUids: string[]
}

export async function createCommunity(data: Omit<CommunityDoc, 'createdAt'|'memberCount'|'modUids'>) {
  return addDoc(collection(db, 'communities'), {
    ...data,
    createdAt: serverTimestamp(),
    memberCount: 1,
    modUids: [data.createdBy]
  })
}

export async function joinCommunity(communityId: string, uid: string) {
  await setDoc(doc(db, 'communities', communityId, 'members', uid), { isModerator: false, joinedAt: serverTimestamp() })
  await updateDoc(doc(db, 'communities', communityId), { memberCount: (await getDoc(doc(db, 'communities', communityId))).data()?.memberCount + 1 })
}

export async function leaveCommunity(communityId: string, uid: string) {
  // Note: For brevity, simplified. In production, use a transaction.
  await updateDoc(doc(db, 'communities', communityId), { memberCount: Math.max(0, (await getDoc(doc(db, 'communities', communityId))).data()?.memberCount - 1) })
  await deleteDoc(doc(db, 'communities', communityId, 'members', uid))
}

export async function isUserMember(communityId: string, uid: string): Promise<boolean> {
  const memberDoc = await getDoc(doc(db, 'communities', communityId, 'members', uid))
  return memberDoc.exists()
}

export async function getUserJoinedCommunities(uid: string) {
  // Get all communities where user is a member
  const communitiesSnapshot = await getDocs(collection(db, 'communities'))
  const joinedCommunityIds: string[] = []
  
  for (const communityDoc of communitiesSnapshot.docs) {
    const memberDoc = await getDoc(doc(db, 'communities', communityDoc.id, 'members', uid))
    if (memberDoc.exists()) {
      joinedCommunityIds.push(communityDoc.id)
    }
  }
  
  // Fetch community details
  const communities = await Promise.all(
    joinedCommunityIds.map(async (id) => {
      const communityDoc = await getDoc(doc(db, 'communities', id))
      if (communityDoc.exists()) {
        return { id: communityDoc.id, ...communityDoc.data() } as { id: string } & CommunityDoc
      }
      return null
    })
  )
  
  return communities.filter(c => c !== null) as ({ id: string } & CommunityDoc)[]
}

export async function listCommunities(limit: number = 100) {
  const q = query(collection(db, 'communities'), orderBy('memberCount', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string } & CommunityDoc))
}

export async function getCommunityById(communityId: string) {
  const docSnap = await getDoc(doc(db, 'communities', communityId))
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as { id: string } & CommunityDoc
}

export async function getCommunityByName(name: string) {
  const q = query(collection(db, 'communities'), where('name', '==', name))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as { id: string } & CommunityDoc
}
