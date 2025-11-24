import admin from 'firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

// Initialize Firebase Admin for production
// Uses Application Default Credentials (ADC) or service account key
if (!admin.apps || admin.apps.length === 0) {
  try {
    // Try to initialize with default credentials (from gcloud auth application-default login)
    admin.initializeApp({
      projectId: process.env.GCLOUD_PROJECT || 'reddit-clone-app-23ebc'
    })
    console.log('Initialized Firebase Admin with Application Default Credentials')
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error)
    console.error('\nTo fix this, run one of the following:')
    console.error('1. gcloud auth application-default login')
    console.error('2. Or set GOOGLE_APPLICATION_CREDENTIALS to a service account key file')
    process.exit(1)
  }
}

const db = admin.firestore()
const auth = admin.auth()

interface DummyUser {
  email: string
  password: string
  displayName: string
  username: string
  photoURL?: string
}

const DUMMY_USERS: DummyUser[] = [
  {
    email: 'alice@reddit.test',
    password: 'Test1234!',
    displayName: 'Alice',
    username: 'alice_wonder',
    photoURL: 'https://i.pravatar.cc/150?img=1'
  },
  {
    email: 'bob@reddit.test',
    password: 'Test1234!',
    displayName: 'Bob',
    username: 'bob_builder',
    photoURL: 'https://i.pravatar.cc/150?img=5'
  },
  {
    email: 'charlie@reddit.test',
    password: 'Test1234!',
    displayName: 'Charlie',
    username: 'charlie_brown',
    photoURL: 'https://i.pravatar.cc/150?img=8'
  },
  {
    email: 'diana@reddit.test',
    password: 'Test1234!',
    displayName: 'Diana',
    username: 'diana_prince',
    photoURL: 'https://i.pravatar.cc/150?img=12'
  },
  {
    email: 'eve@reddit.test',
    password: 'Test1234!',
    displayName: 'Eve',
    username: 'eve_online',
    photoURL: 'https://i.pravatar.cc/150?img=15'
  },
  {
    email: 'frank@reddit.test',
    password: 'Test1234!',
    displayName: 'Frank',
    username: 'frank_sinatra',
    photoURL: 'https://i.pravatar.cc/150?img=20'
  }
]

async function seedUsers() {
  console.log('Starting user seed...')
  console.log('This will create REAL Firebase Auth users that can log in and chat!\n')
  
  try {
    const createdUsers: Array<{uid: string, email: string, username: string, displayName: string, password: string}> = []
    
    for (const userData of DUMMY_USERS) {
      console.log(`\nProcessing user: ${userData.displayName} (@${userData.username})`)
      
      let uid: string
      let authUserCreated = false
      
      // Check if user already exists in Firebase Auth
      try {
        const existingUser = await auth.getUserByEmail(userData.email)
        uid = existingUser.uid
        console.log(`  ✓ Auth user already exists with UID: ${uid}`)
        
        // Update auth user with latest display name and photo
        await auth.updateUser(uid, {
          displayName: userData.displayName,
          photoURL: userData.photoURL
        })
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // User doesn't exist, create it
          try {
            const userRecord = await auth.createUser({
              email: userData.email,
              password: userData.password,
              displayName: userData.displayName,
              photoURL: userData.photoURL,
              emailVerified: true // Mark as verified for easier testing
            })
            uid = userRecord.uid
            authUserCreated = true
            console.log(`  ✓ Created Auth user with UID: ${uid}`)
          } catch (createError: any) {
            console.error(`  ✗ Failed to create Auth user: ${createError.message}`)
            continue
          }
        } else {
          console.error(`  ✗ Error checking user: ${error.message}`)
          continue
        }
      }
      
      // Create or update user document in Firestore
      const userDocRef = db.collection('users').doc(uid)
      const userDoc = await userDocRef.get()
      
      if (userDoc.exists) {
        console.log(`  ✓ User document already exists in Firestore`)
        // Update existing document with latest data
        await userDocRef.update({
          displayName: userData.displayName,
          username: userData.username,
          photoURL: userData.photoURL || null,
          updatedAt: Timestamp.now()
        })
      } else {
        // Create user document in Firestore
        await userDocRef.set({
          displayName: userData.displayName,
          username: userData.username,
          photoURL: userData.photoURL || null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
        console.log(`  ✓ Created user document in Firestore`)
      }
      
      createdUsers.push({
        uid,
        email: userData.email,
        username: userData.username,
        displayName: userData.displayName,
        password: userData.password
      })
    }
    
    console.log('\n✅ User seed completed successfully!')
    console.log('\n📋 Created users (can log in and chat):')
    createdUsers.forEach(user => {
      console.log(`\n  ${user.displayName} (@${user.username})`)
      console.log(`    Email: ${user.email}`)
      console.log(`    Password: ${user.password}`)
      console.log(`    UID: ${user.uid}`)
      console.log(`    Profile: /u/${user.uid}`)
    })
    
    console.log('\n💡 How to test realtime chat:')
    console.log('1. Open the app in two different browser windows/tabs')
    console.log('2. Log in as different users (e.g., Alice in one, Bob in another)')
    console.log('3. Start a conversation between them')
    console.log('4. Messages will appear in real-time!')
    console.log('\nNote: Make sure Email/Password authentication is enabled in Firebase Console:')
    console.log('  Authentication > Sign-in method > Email/Password > Enable')
    
    process.exit(0)
  } catch (error) {
    console.error('Error seeding users:', error)
    process.exit(1)
  }
}

// Run seed
seedUsers().catch(console.error)

