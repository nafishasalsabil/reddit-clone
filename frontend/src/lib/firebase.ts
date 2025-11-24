import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { env, assertFrontendEnv } from './env'

assertFrontendEnv()

export const app = getApps().length ? getApps()[0] : initializeApp({
  apiKey: env.apiKey,
  authDomain: env.authDomain,
  projectId: env.projectId,
  storageBucket: env.storageBucket,
  appId: env.appId
})

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const emailProvider = EmailAuthProvider
export const db = getFirestore(app)
// Note: Firebase Storage removed - using base64 images stored in Firestore instead (free alternative)
// Note: Cloud Functions removed - using client-side Firestore transactions for voting (free alternative)
