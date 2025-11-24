import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { createCustomFeed } from '@/lib/api/customFeeds'

interface CreateCustomFeedModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateCustomFeedModal({ isOpen, onClose }: CreateCustomFeedModalProps) {
  const { user } = useAuthStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [showOnProfile, setShowOnProfile] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !name.trim()) return

    setIsSubmitting(true)
    try {
      await createCustomFeed({
        name: name.trim(),
        description: description.trim() || undefined,
        isPrivate,
        showOnProfile,
        createdBy: user.uid
      })
      
      // Reset form
      setName('')
      setDescription('')
      setIsPrivate(false)
      setShowOnProfile(true)
      onClose()
    } catch (error: any) {
      alert(error.message || 'Failed to create custom feed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Create custom feed
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Name<span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{name.length}/50</span>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              placeholder="Enter feed name"
              required
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Description Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Description
              </label>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{description.length}/500</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Enter feed description"
              rows={4}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Make Private Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Make private
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Only viewable by you
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                isPrivate ? 'bg-primary-500' : 'bg-zinc-300 dark:bg-zinc-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPrivate ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Show on Profile Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Show on profile
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Display this feed on your profile so others can find it
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowOnProfile(!showOnProfile)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                showOnProfile ? 'bg-primary-500' : 'bg-zinc-300 dark:bg-zinc-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showOnProfile ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-4 py-2 text-sm font-semibold bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

