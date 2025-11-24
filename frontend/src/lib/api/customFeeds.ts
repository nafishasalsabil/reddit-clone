import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export interface CustomFeedDoc {
  name: string
  description?: string
  isPrivate: boolean
  showOnProfile: boolean
  createdBy: string
  createdAt: any
}

export async function createCustomFeed(data: Omit<CustomFeedDoc, 'createdAt'>) {
  return addDoc(collection(db, 'customFeeds'), {
    ...data,
    createdAt: serverTimestamp()
  })
}


