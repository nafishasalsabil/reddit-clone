import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { joinCommunity, leaveCommunity, isUserMember, getCommunityByName } from '@/lib/api/communities'

interface JoinLeaveButtonProps {
  communityName: string
  communityId?: string
  onJoinChange?: (joined: boolean) => void
}

export default function JoinLeaveButton({ communityName, communityId, onJoinChange }: JoinLeaveButtonProps) {
  const { user } = useAuthStore()
  const [isJoined, setIsJoined] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)

  useEffect(() => {
    if (!user || !communityName) {
      setIsLoading(false)
      return
    }

    const checkMembership = async () => {
      try {
        let cid = communityId
        if (!cid) {
          // Get community by name
          const community = await getCommunityByName(communityName)
          if (!community) {
            setIsLoading(false)
            return
          }
          cid = community.id
        }
        
        const joined = await isUserMember(cid, user.uid)
        setIsJoined(joined)
        onJoinChange?.(joined)
      } catch (error) {
      } finally {
        setIsLoading(false)
      }
    }

    checkMembership()
  }, [user, communityName, communityId, onJoinChange])

  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!user || isJoining) return

    try {
      setIsJoining(true)
      let cid = communityId
      if (!cid) {
        const community = await getCommunityByName(communityName)
        if (!community) {
          throw new Error('Community not found')
        }
        cid = community.id
      }
      
      if (isJoined) {
        await leaveCommunity(cid, user.uid)
        setIsJoined(false)
        onJoinChange?.(false)
      } else {
        await joinCommunity(cid, user.uid)
        setIsJoined(true)
        onJoinChange?.(true)
      }
    } catch (error) {
    } finally {
      setIsJoining(false)
    }
  }

  if (!user || isLoading) {
    return null
  }

  return (
    <button
      onClick={handleJoin}
      disabled={isJoining}
      className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
        isJoined
          ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600'
          : 'bg-primary-500 text-white hover:bg-primary-600'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isJoining ? '...' : isJoined ? 'Joined' : 'Join'}
    </button>
  )
}

