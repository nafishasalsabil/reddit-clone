import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { db, auth } from '@/lib/firebase'
import Avatar from '@/components/Avatar'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [photoURL, setPhotoURL] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Load user data
  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    const loadUserData = async () => {
      try {
        setLoading(true)
        // Get data from Firebase Auth
        setDisplayName(user.displayName || '')
        setEmail(user.email || '')

        // Get additional data from Firestore (prioritize Firestore photoURL for base64 images)
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUsername(data.username || '')
          // Use Firestore photoURL if available (supports base64), otherwise fall back to Auth
          setPhotoURL(data.photoURL || user.photoURL || null)
        } else {
          // No Firestore doc, use Auth photoURL
          setPhotoURL(user.photoURL || null)
        }
      } catch (error) {
        setError('Failed to load user data')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [user, navigate])

  // Convert image to base64 with compression (more aggressive compression to reduce size)
  const compressImage = (file: File, maxWidth: number = 200, maxHeight: number = 200, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)
          const base64 = canvas.toDataURL('image/jpeg', quality)
          resolve(base64)
        }
        img.onerror = reject
        if (e.target?.result) {
          img.src = e.target.result as string
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 2MB before compression)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB')
      return
    }

    try {
      setUploading(true)
      setError('')
      
      // Compress and convert to base64
      const base64Image = await compressImage(file)

      // Store base64 in Firestore only (Firebase Auth photoURL has size limits)
      // We'll use Firestore photoURL for display instead
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: base64Image,
        updatedAt: serverTimestamp()
      })

      setPhotoURL(base64Image)
      setSuccess('Profile picture updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError('Failed to upload image. Please try a smaller image.')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    // Validate
    if (!displayName.trim()) {
      setError('Display name is required')
      return
    }

    if (username.trim() && !/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setError('Username can only contain letters, numbers, and underscores')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: displayName.trim() })

      // Update Firestore
      const updateData: any = {
        displayName: displayName.trim(),
        updatedAt: serverTimestamp()
      }

      if (username.trim()) {
        updateData.username = username.trim().toLowerCase()
      }

      await updateDoc(doc(db, 'users', user.uid), updateData)

      // Refresh auth user to update displayName in store
      await auth.currentUser?.reload()
      setSuccess('Settings saved successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      setError('Failed to log out')
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 bg-white dark:bg-zinc-900 min-h-[calc(100vh-3rem)]">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-zinc-200 dark:border-zinc-700 border-t-primary-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white dark:bg-zinc-900 min-h-[calc(100vh-3rem)]">
      <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
        Settings
      </h1>

      {/* Success/Error Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Account Settings */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Account
        </h2>
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 sm:p-6 space-y-4">
          {/* Profile Picture */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              <Avatar
                uid={user.uid}
                size={80}
                photoURL={photoURL || undefined}
                displayName={displayName}
              />
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                >
                  {uploading ? 'Uploading...' : 'Change Picture'}
                </button>
                {photoURL && (
                  <button
                    onClick={async () => {
                      try {
                        await updateDoc(doc(db, 'users', user.uid), {
                          photoURL: null,
                          updatedAt: serverTimestamp()
                        })
                        setPhotoURL(null)
                        setSuccess('Profile picture removed')
                        setTimeout(() => setSuccess(''), 3000)
                      } catch (error) {
                        setError('Failed to remove picture')
                      }
                    }}
                    className="ml-2 px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors text-sm font-semibold"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Your display name"
              maxLength={50}
            />
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="username"
              maxLength={30}
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Letters, numbers, and underscores only
            </p>
          </div>

          {/* Email (Read-only) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Email cannot be changed
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </section>

      {/* Appearance Settings */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Appearance
        </h2>
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                Theme
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Choose between light and dark mode
              </p>
            </div>
            <div className="flex items-center gap-2 bg-zinc-200 dark:bg-zinc-700 rounded-full p-1">
              <button
                onClick={() => setTheme('light')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  theme === 'light'
                    ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Dark
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Account Actions */}
      <section>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Account Actions
        </h2>
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 sm:p-6">
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-semibold"
          >
            Log Out
          </button>
        </div>
      </section>
    </div>
  )
}
