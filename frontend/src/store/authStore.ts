import { create } from 'zustand'
import { onAuthStateChanged, User, updateProfile, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface AuthState {
  user: User | null
  loading: boolean
  setUser: (u: User | null) => void
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, displayName: string, username: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (u) => set({ user: u }),
  signInWithGoogle: async () => {
    const result = await signInWithPopup(auth, googleProvider)
    // Create or update user document
    if (result.user) {
      const userDoc = {
        displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
        username: result.user.displayName?.toLowerCase().replace(/\s+/g, '_') || result.user.email?.split('@')[0] || 'user',
        photoURL: result.user.photoURL || null,
        updatedAt: serverTimestamp()
      }
      await setDoc(doc(db, 'users', result.user.uid), userDoc, { merge: true })
    }
  },
  signInWithEmail: async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  },
  signUpWithEmail: async (email: string, password: string, displayName: string, username: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    // Update profile
    await updateProfile(result.user, { displayName })
    // Create user document
    await setDoc(doc(db, 'users', result.user.uid), {
      displayName,
      username,
      photoURL: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  },
  logout: async () => { await signOut(auth) }
}))

onAuthStateChanged(auth, (u) => {
  useAuthStore.setState({ user: u, loading: false })
})

export const selectUser = (s: AuthState) => s.user
export const selectIsAuthed = (s: AuthState) => !!s.user
