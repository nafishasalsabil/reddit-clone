import { collection, getDocs, query, where, limit, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

export interface UserDoc {
  uid: string
  displayName?: string
  username?: string
  photoURL?: string
}

// Search users by username or displayName (prefix search)
export async function searchUsers(searchTerm: string, limitCount: number = 10): Promise<UserDoc[]> {
  if (!searchTerm.trim()) return []
  
  const trimmedTerm = searchTerm.trim().toLowerCase()
  const usersRef = collection(db, 'users')
  
  // Firestore doesn't support case-insensitive search, so we'll do prefix matching
  // Try to search both username and displayName fields
  const promises: Promise<any>[] = []
  
  // Search for username prefix (only if field exists)
  promises.push(
    getDocs(query(
      usersRef,
      where('username', '>=', trimmedTerm),
      where('username', '<=', trimmedTerm + '\uf8ff'),
      limit(limitCount)
    )).catch((error) => {
      // If query fails (e.g., no index or no users with username), return empty
      return { docs: [] }
    })
  )
  
  // Search for displayName prefix (only if field exists)
  promises.push(
    getDocs(query(
      usersRef,
      where('displayName', '>=', trimmedTerm),
      where('displayName', '<=', trimmedTerm + '\uf8ff'),
      limit(limitCount)
    )).catch((error) => {
      // If query fails (e.g., no index or no users with displayName), return empty
      return { docs: [] }
    })
  )
  
  try {
    const [usernameResults, displayNameResults] = await Promise.all(promises)
    
    // Combine results and remove duplicates
    const usersMap = new Map<string, UserDoc>()
    
    // Process username results
    if (usernameResults && usernameResults.docs) {
      usernameResults.docs.forEach((doc: any) => {
        const data = doc.data()
        if (data.username) {
          usersMap.set(doc.id, {
            uid: doc.id,
            displayName: data.displayName,
            username: data.username,
            photoURL: data.photoURL
          })
        }
      })
    }
    
    // Process displayName results
    if (displayNameResults && displayNameResults.docs) {
      displayNameResults.docs.forEach((doc: any) => {
        const data = doc.data()
        if (data.displayName) {
          if (!usersMap.has(doc.id)) {
            usersMap.set(doc.id, {
              uid: doc.id,
              displayName: data.displayName,
              username: data.username,
              photoURL: data.photoURL
            })
          }
        }
      })
    }
    
    // Filter to only include exact prefix matches (case-insensitive)
    const filteredUsers = Array.from(usersMap.values()).filter(user => {
      const usernameMatch = user.username?.toLowerCase().startsWith(trimmedTerm)
      const displayNameMatch = user.displayName?.toLowerCase().startsWith(trimmedTerm)
      return usernameMatch || displayNameMatch
    })
    
    return filteredUsers.slice(0, limitCount)
  } catch (error) {
    // Return empty array on error instead of throwing
    return []
  }
}

// Get user by UID (using doc() instead of query for direct lookup)
export async function getUser(uid: string): Promise<UserDoc | null> {
  try {
    const userDocSnap = await getDoc(doc(db, 'users', uid))
    if (!userDocSnap.exists()) return null
    
    const data = userDocSnap.data()
    return {
      uid: userDocSnap.id,
      displayName: data.displayName,
      username: data.username,
      photoURL: data.photoURL
    }
  } catch (error) {
    return null
  }
}

