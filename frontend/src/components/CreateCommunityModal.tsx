import { useState, useMemo, useEffect } from 'react'
import { createCommunity } from '@/lib/api/communities'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

interface Topic {
  id: string
  name: string
  category: string
}

const TOPICS: Topic[] = [
  // Anime & Cosplay
  { id: 'anime-manga', name: 'Anime & Manga', category: 'Anime & Cosplay' },
  { id: 'cosplay', name: 'Cosplay', category: 'Anime & Cosplay' },
  
  // Art
  { id: 'performing-arts', name: 'Performing Arts', category: 'Art' },
  { id: 'architecture', name: 'Architecture', category: 'Art' },
  { id: 'design', name: 'Design', category: 'Art' },
  { id: 'art', name: 'Art', category: 'Art' },
  { id: 'filmmaking', name: 'Filmmaking', category: 'Art' },
  { id: 'digital-art', name: 'Digital Art', category: 'Art' },
  { id: 'photography', name: 'Photography', category: 'Art' },
  
  // Business & Finance
  { id: 'personal-finance', name: 'Personal Finance', category: 'Business & Finance' },
  { id: 'crypto', name: 'Crypto', category: 'Business & Finance' },
  { id: 'economics', name: 'Economics', category: 'Business & Finance' },
  { id: 'business-news', name: 'Business News & Discussion', category: 'Business & Finance' },
  { id: 'deals-marketplace', name: 'Deals & Marketplace', category: 'Business & Finance' },
  { id: 'startups', name: 'Startups & Entrepreneurship', category: 'Business & Finance' },
  { id: 'real-estate', name: 'Real Estate', category: 'Business & Finance' },
  { id: 'stocks-investing', name: 'Stocks & Investing', category: 'Business & Finance' },
  
  // Collectibles & Other Hobbies
  { id: 'model-building', name: 'Model Building', category: 'Collectibles & Other Hobbies' },
  { id: 'collectibles', name: 'Collectibles', category: 'Collectibles & Other Hobbies' },
  { id: 'other-hobbies', name: 'Other Hobbies', category: 'Collectibles & Other Hobbies' },
  { id: 'toys', name: 'Toys', category: 'Collectibles & Other Hobbies' },
]

interface CreateCommunityModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateCommunityModal({ isOpen, onClose }: CreateCommunityModalProps) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [topicFilter, setTopicFilter] = useState('')
  const [communityName, setCommunityName] = useState('')
  const [communityTitle, setCommunityTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredTopics = useMemo(() => {
    if (!topicFilter.trim()) return TOPICS
    const filter = topicFilter.toLowerCase()
    return TOPICS.filter(topic => 
      topic.name.toLowerCase().includes(filter) || 
      topic.category.toLowerCase().includes(filter)
    )
  }, [topicFilter])

  const topicsByCategory = useMemo(() => {
    const grouped: Record<string, Topic[]> = {}
    filteredTopics.forEach(topic => {
      if (!grouped[topic.category]) {
        grouped[topic.category] = []
      }
      grouped[topic.category].push(topic)
    })
    return grouped
  }, [filteredTopics])

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setSelectedTopics([])
      setTopicFilter('')
      setCommunityName('')
      setCommunityTitle('')
      setDescription('')
      setIsSubmitting(false)
    }
  }, [isOpen])

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev => {
      if (prev.includes(topicId)) {
        return prev.filter(id => id !== topicId)
      } else if (prev.length < 3) {
        return [...prev, topicId]
      }
      return prev
    })
  }

  const handleNext = () => {
    if (step === 1) {
      // Topics step - can proceed even with 0 topics
      setStep(2)
    } else if (step === 2) {
      // Community name step
      if (communityName.trim() && communityTitle.trim()) {
        setStep(3)
      }
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    if (!user || !communityName.trim() || !communityTitle.trim()) return

    setIsSubmitting(true)
    try {
      // Validate community name (alphanumeric, lowercase, no spaces)
      const name = communityName.trim().toLowerCase().replace(/\s+/g, '')
      if (!/^[a-z0-9]+$/.test(name)) {
        alert('Community name must contain only letters and numbers')
        setIsSubmitting(false)
        return
      }

      const docRef = await createCommunity({
        name,
        title: communityTitle.trim(),
        description: description.trim() || undefined,
        createdBy: user.uid
      })

      onClose()
      navigate(`/r/${name}`)
    } catch (error: any) {
      alert(error.message || 'Failed to create community')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {step === 1 && 'Add topics'}
            {step === 2 && 'Name your community'}
            {step === 3 && 'Customize your community'}
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
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Add up to 3 topics to help interested redditors find your community.
              </p>

              {/* Filter */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={topicFilter}
                    onChange={(e) => setTopicFilter(e.target.value)}
                    placeholder="Filter topics"
                    className="w-full px-4 py-2 pl-10 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Topics Counter */}
              <div className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Topics {selectedTopics.length}/3
              </div>

              {/* Topics List */}
              <div className="space-y-6 max-h-[400px] overflow-y-auto">
                {Object.entries(topicsByCategory).map(([category, topics]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-2">
                      {category}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {topics.map(topic => {
                        const isSelected = selectedTopics.includes(topic.id)
                        return (
                          <button
                            key={topic.id}
                            onClick={() => toggleTopic(topic.id)}
                            disabled={!isSelected && selectedTopics.length >= 3}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              isSelected
                                ? 'bg-primary-500 text-white'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                          >
                            {topic.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                Choose a name and title for your community. The name will be used in the URL.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Community name <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 dark:text-zinc-400">r/</span>
                    <input
                      type="text"
                      value={communityName}
                      onChange={(e) => setCommunityName(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                      placeholder="communityname"
                      className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      maxLength={21}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Letters and numbers only. No spaces.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Community title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={communityTitle}
                    onChange={(e) => setCommunityTitle(e.target.value)}
                    placeholder="Community Title"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    maxLength={100}
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    A short, descriptive title for your community.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                Add a description to help people understand what your community is about.
              </p>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your community..."
                  rows={6}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {description.length}/500 characters
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-zinc-200 dark:border-zinc-700">
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full ${
                  s === step
                    ? 'bg-primary-500'
                    : s < step
                    ? 'bg-primary-300 dark:bg-primary-600'
                    : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={step === 1 ? onClose : handleBack}
              className="px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={step === 2 && (!communityName.trim() || !communityTitle.trim())}
                className="px-4 py-2 text-sm font-semibold bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !communityName.trim() || !communityTitle.trim()}
                className="px-4 py-2 text-sm font-semibold bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Community'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

