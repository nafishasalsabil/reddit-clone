import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore, selectIsAuthed } from '@/store/authStore'
import { createPostText, createPostLink, createPost, type PostType } from '@/lib/api/posts'
import { listCommunities, getCommunityById, type CommunityDoc } from '@/lib/api/communities'
import { auth } from '@/lib/firebase'
import { updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface ValidationErrors {
  title?: string
  body?: string
  url?: string
  image?: string
}

function validatePostInput(
  type: PostType,
  title: string,
  body?: string,
  url?: string,
  imageFile?: File
): ValidationErrors {
  const errors: ValidationErrors = {}

  // Title validation (required, 3-120 chars)
  if (!title || title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters'
  } else if (title.length > 120) {
    errors.title = 'Title must be at most 120 characters'
  }

  // Type-specific validation
  if (type === 'text') {
    if (body && body.length > 10000) {
      errors.body = 'Text content must be at most 10,000 characters'
    }
  } else if (type === 'link') {
    // URL is optional, but if provided, must be valid
    if (url && url.trim()) {
      try {
        const urlObj = new URL(url)
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          errors.url = 'URL must start with http:// or https://'
        }
      } catch {
        errors.url = 'Invalid URL format'
      }
    }
  } else if (type === 'image') {
    // Image is optional, but if provided, must be valid
    if (imageFile) {
      // Check file size (500 KB limit for data URL storage in Firestore)
      if (imageFile.size > 500 * 1024) {
        errors.image = 'Image must be at most 500KB (to store in database)'
      }
      // Check file extension
      const ext = imageFile.name.split('.').pop()?.toLowerCase()
      if (!ext || !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        errors.image = 'Image must be jpg, png, or webp'
      }
    }
  }

  return errors
}

export default function Submit() {
  const navigate = useNavigate()
  const params = useParams<{ name?: string }>()
  const communityName = params.name
  const isAuthed = useAuthStore(selectIsAuthed)
  const loading = useAuthStore((s) => s.loading)
  const user = useAuthStore((s) => s.user)

  const [postType, setPostType] = useState<PostType>('text')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  // Community selection
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null)
  const [communities, setCommunities] = useState<Array<{ id: string } & CommunityDoc>>([])
  const [communitySearch, setCommunitySearch] = useState('')
  const [showCommunityDropdown, setShowCommunityDropdown] = useState(false)
  const [selectedCommunity, setSelectedCommunity] = useState<({ id: string; name: string; title: string; isUserProfile?: boolean } & Partial<CommunityDoc>) | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const communityDropdownRef = useRef<HTMLDivElement>(null)

  // Auth guard: redirect unauthenticated users
  useEffect(() => {
    if (!loading && !isAuthed) {
      navigate('/login?next=/submit', { replace: true })
    }
  }, [loading, isAuthed, navigate])

  // Load communities and handle community from URL
  useEffect(() => {
    if (!isAuthed || !user) return

    const loadCommunities = async () => {
      try {
        const comms = await listCommunities()
        setCommunities(comms)
        
        // Add user profile to the list (at the top)
        const userProfile = {
          id: `u:${user.uid}`,
          name: user.displayName || user.email?.split('@')[0] || 'user',
          title: 'My Profile',
          isUserProfile: true
        }
        
        // If community name is in URL, find and select it
        if (communityName) {
          // Check if it's a user profile (u/username)
          if (communityName.startsWith('u/')) {
            const username = communityName.substring(2)
            if (username === userProfile.name || username === user.uid) {
              setSelectedCommunity(userProfile)
              setSelectedCommunityId(userProfile.id)
            }
          } else {
            // Regular community
            const comm = comms.find(c => c.name === communityName)
            if (comm) {
              setSelectedCommunity(comm)
              setSelectedCommunityId(comm.id)
            }
          }
        } else {
          // Default to user profile if no community selected
          setSelectedCommunity(userProfile)
          setSelectedCommunityId(userProfile.id)
        }
      } catch (error) {
      }
    }

    loadCommunities()
  }, [isAuthed, user, communityName])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (communityDropdownRef.current && !communityDropdownRef.current.contains(event.target as Node)) {
        setShowCommunityDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle image file selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setErrors((prev) => ({ ...prev, image: undefined }))
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Validate form - only title is required, everything else is optional
  const validate = () => {
    const validationErrors = validatePostInput(postType, title, body, url, imageFile || undefined)
    setErrors(validationErrors)
    // Only check for title errors - other fields are optional
    return !validationErrors.title
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validate()) {
      return
    }

    if (!user) {
      setSubmitError('You must be logged in to submit a post')
      return
    }

    setIsSubmitting(true)

    try {
      // Use user profile ID if no community selected, otherwise use selected community
      const communityId = selectedCommunityId || (user ? `u:${user.uid}` : null)
      const isUserProfile = communityId?.startsWith('u:')
      
      if (postType === 'text') {
        await createPost({
          cid: communityId,
          authorUid: user.uid,
          title,
          type: 'text',
          body: body || undefined,
          editedAt: null
        })
        // Navigate to homepage
        navigate('/', { replace: true })
      } else if (postType === 'link') {
        await createPost({
          cid: communityId,
          authorUid: user.uid,
          title,
          type: 'link',
          url: url.trim() || undefined,
          editedAt: null
        })
        // Navigate to homepage
        navigate('/', { replace: true })
      } else if (postType === 'image') {
        // For image posts: create post first to get ID, then upload image with post ID in path if provided
        const docRef = await createPost({
          cid: communityId,
          authorUid: user.uid,
          title,
          type: 'image',
          editedAt: null
        })
        const postId = docRef.id
        
        // Upload image if provided - store as data URL in Firestore (free, no external service needed)
        // Note: Firestore has a 1MB document limit, so we limit images to ~500KB before base64 encoding
        if (imageFile) {
          try {
            // Check file size (500KB limit for base64 encoding to stay under Firestore's 1MB limit)
            if (imageFile.size > 500 * 1024) {
              throw new Error('Image must be under 500KB. Please compress your image and try again.')
            }

            // Convert to data URL (base64 encoded)
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(imageFile)
            })
            
            // Update post with imageUrl (stored as data URL)
            await updateDoc(doc(db, 'posts', postId), { imageUrl: dataUrl })
          } catch (error: any) {
            setSubmitError(error.message || 'Failed to upload image. Please try again with a smaller image.')
            // Delete the post if image upload fails
            await updateDoc(doc(db, 'posts', postId), { type: 'text', body: 'Image upload failed' })
            return
          }
        }
        
        // Navigate to homepage
        navigate('/', { replace: true })
      }
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to create post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const postTypeLabels: Record<PostType, string> = {
    text: 'Post',
    image: 'Images & Video',
    link: 'Link'
  }

  // Check if form is valid for submission
  // Only title is required - everything else is optional
  // IMPORTANT: This hook must be called before any conditional returns
  const isFormValid = useMemo(() => {
    // Title validation - must be at least 3 characters
    const trimmedTitle = title.trim()
    const valid = trimmedTitle.length >= 3
    
    return valid
  }, [title, postType, url, imageFile, body])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-center py-8">Loading...</div>
      </div>
    )
  }

  // Don't render if not authenticated (redirect will happen)
  if (!isAuthed) {
    return null
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">Create a post</h1>
          </div>

          {/* Community Selector */}
          <div className="mb-4 relative" ref={communityDropdownRef}>
            <div
              onClick={() => setShowCommunityDropdown(!showCommunityDropdown)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-4 py-2 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {selectedCommunity ? (
                  <>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      selectedCommunity.isUserProfile ? 'bg-primary-500' : 'bg-blue-500'
                    }`}>
                      {selectedCommunity.isUserProfile ? 'u/' : 'r/'}
                    </div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {selectedCommunity.isUserProfile ? 'u/' : 'r/'}{selectedCommunity.name}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Choose a community</span>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-zinc-500 transition-transform ${showCommunityDropdown ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {showCommunityDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-50 max-h-96 overflow-hidden">
                <div className="p-2 border-b border-zinc-200 dark:border-zinc-700">
                  <input
                    type="text"
                    value={communitySearch}
                    onChange={(e) => setCommunitySearch(e.target.value)}
                    placeholder="Search communities"
                    className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto max-h-80">
                  {/* User Profile Option */}
                  {user && (() => {
                    const userName = user.displayName || user.email?.split('@')[0] || 'user'
                    const userProfile = {
                      id: `u:${user.uid}`,
                      name: userName,
                      title: 'My Profile',
                      isUserProfile: true
                    }
                    const matchesSearch = !communitySearch || 
                      userName.toLowerCase().includes(communitySearch.toLowerCase()) ||
                      'my profile'.includes(communitySearch.toLowerCase()) ||
                      'profile'.includes(communitySearch.toLowerCase())
                    
                    if (!matchesSearch) return null
                    
                    return (
                      <button
                        key={userProfile.id}
                        type="button"
                        onClick={() => {
                          setSelectedCommunity(userProfile)
                          setSelectedCommunityId(userProfile.id)
                          setShowCommunityDropdown(false)
                          setCommunitySearch('')
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 ${
                          selectedCommunity?.isUserProfile ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          u/
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            u/{userName}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">My Profile</div>
                        </div>
                      </button>
                    )
                  })()}
                  {communities
                    .filter((comm) =>
                      communitySearch
                        ? comm.name.toLowerCase().includes(communitySearch.toLowerCase()) ||
                          comm.title.toLowerCase().includes(communitySearch.toLowerCase())
                        : true
                    )
                    .map((comm) => (
                      <button
                        key={comm.id}
                        type="button"
                        onClick={() => {
                          setSelectedCommunity(comm)
                          setSelectedCommunityId(comm.id)
                          setShowCommunityDropdown(false)
                          setCommunitySearch('')
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 ${
                          selectedCommunity?.id === comm.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          r/
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">r/{comm.name}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{comm.title}</div>
                        </div>
                        {comm.memberCount > 0 && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                            {comm.memberCount} {comm.memberCount === 1 ? 'member' : 'members'}
                          </div>
                        )}
                      </button>
                    ))}
                  {communities.filter((comm) =>
                    communitySearch
                      ? comm.name.toLowerCase().includes(communitySearch.toLowerCase()) ||
                        comm.title.toLowerCase().includes(communitySearch.toLowerCase())
                      : true
                  ).length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      No communities found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Post Type Tabs */}
          <div className="mb-4 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex gap-1">
              {(['text', 'image', 'link'] as PostType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setPostType(type)
                    setErrors({})
                    setSubmitError(null)
                  }}
                  className={`px-4 py-2 text-sm font-medium relative ${
                    postType === type
                      ? 'text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }`}
                >
                  {postTypeLabels[type]}
                  {postType === type && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md overflow-hidden">
            {/* Title Input */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  const newTitle = e.target.value
                  setTitle(newTitle)
                  setErrors((prev) => ({ ...prev, title: undefined }))
                }}
                className={`w-full text-base bg-transparent outline-none ${
                  errors.title ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'
                } placeholder-zinc-400`}
                placeholder="Title"
                maxLength={120}
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="mt-2 text-xs text-red-500">{errors.title}</p>
              )}
            </div>

            {/* Content Area */}
            <div className="p-4">
              {postType === 'text' && (
                <div>
                  <textarea
                    value={body}
                    onChange={(e) => {
                      setBody(e.target.value)
                      setErrors((prev) => ({ ...prev, body: undefined }))
                    }}
                    className={`w-full min-h-[200px] text-sm bg-transparent outline-none resize-none ${
                      errors.body ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'
                    } placeholder-zinc-400`}
                    placeholder="Text (optional)"
                    maxLength={10000}
                    disabled={isSubmitting}
                  />
                  {errors.body && (
                    <p className="mt-2 text-xs text-red-500">{errors.body}</p>
                  )}
                  <p className="mt-2 text-xs text-zinc-500">{body.length}/10,000</p>
                </div>
              )}

              {postType === 'link' && (
                <div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value)
                      setErrors((prev) => ({ ...prev, url: undefined }))
                    }}
                    className={`w-full text-sm bg-transparent outline-none border border-zinc-300 dark:border-zinc-600 rounded px-3 py-2 ${
                      errors.url 
                        ? 'border-red-500 text-red-500' 
                        : 'text-zinc-900 dark:text-zinc-100'
                    } placeholder-zinc-400`}
                    placeholder="Url"
                    disabled={isSubmitting}
                  />
                  {errors.url && (
                    <p className="mt-2 text-xs text-red-500">{errors.url}</p>
                  )}
                </div>
              )}

              {postType === 'image' && (
                <div>
                  {!imagePreview ? (
                    <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-md p-8 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageSelect}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                        className="mx-auto px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-full hover:bg-blue-600 disabled:opacity-50"
                      >
                        Upload
                      </button>
                      <p className="mt-2 text-xs text-zinc-500">Drag and drop or click to upload</p>
                      <p className="mt-1 text-xs text-zinc-400">Supports: JPG, PNG, WEBP (max 500KB)</p>
                    </div>
                  ) : (
                    <div>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-w-full max-h-96 rounded-md border border-zinc-200 dark:border-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null)
                          setImagePreview(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="mt-2 text-sm text-blue-500 hover:text-blue-600"
                        disabled={isSubmitting}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {errors.image && (
                    <p className="mt-2 text-xs text-red-500">{errors.image}</p>
                  )}
                </div>
              )}
            </div>

            {/* Submit Error */}
            {submitError && (
              <div className="mx-4 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                {submitError}
              </div>
            )}

            {/* Action Bar */}
            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                disabled={isSubmitting}
                className="px-4 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar - Posting Rules */}
        <div className="w-80 hidden lg:block">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md overflow-hidden">
            <div className="p-4 bg-blue-500 text-white">
              <h2 className="text-sm font-medium">Posting to Reddit</h2>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">1. Remember the human</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs">Be respectful and follow Reddit's content policy.</p>
              </div>
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">2. Behave like you would in real life</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs">Treat others with kindness and respect.</p>
              </div>
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">3. Look for the original source of content</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs">Always link to the original source when possible.</p>
              </div>
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">4. Search for duplicates before posting</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs">Check if your post has already been submitted.</p>
              </div>
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">5. Read the community's rules</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs">Each community has its own rules and guidelines.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
