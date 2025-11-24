import { create } from 'zustand'
import { votePost, streamPost, streamUserVote, getUserVote } from '@/lib/api/posts'

interface PostState {
  postById: Record<string, any>
  unsubscribeById: Record<string, () => void>
  pendingVotes: Record<string, -1|0|1> // Track votes that are being written to Firestore
  optimisticVotePost: (postId: string, value: -1|0|1) => Promise<void>
  upsert: (post: any) => void
  subscribeToPost: (postId: string) => void
  unsubscribeFromPost: (postId: string) => void
}

export const usePostStore = create<PostState>((set, get) => ({
  postById: {},
  unsubscribeById: {},
  pendingVotes: {},
  upsert: (post) => {
    set((s) => {
      const existing = s.postById[post.id]
      if (!existing) {
        // No existing post, just add it
        return { postById: { ...s.postById, [post.id]: post } }
      }
      
      // If post is subscribed, streamPost will handle score updates
      // Don't let feedStore overwrite with potentially stale data
      const isSubscribed = !!s.unsubscribeById[post.id]
      if (isSubscribed) {
        // Preserve score and myVote from existing (streamPost will update score)
        const merged = {
          ...existing,
          ...post,
          score: existing.score, // Keep existing score, streamPost will update it
          myVote: existing.myVote !== undefined ? existing.myVote : post.myVote
        }
        return { postById: { ...s.postById, [post.id]: merged } }
      }
      
      // Not subscribed, safe to merge normally
      const merged = { 
        ...existing, 
        ...post,
        // Preserve myVote from existing if it exists
        myVote: existing.myVote !== undefined ? existing.myVote : post.myVote
      }
      return { postById: { ...s.postById, [post.id]: merged } }
    })
  },
  subscribeToPost: (postId) => {
    const state = get()
    // Don't subscribe if already subscribed
    if (state.unsubscribeById[postId]) return

    // Fetch initial user vote
    getUserVote(postId).then((vote) => {
      set((s) => ({
        postById: {
          ...s.postById,
          [postId]: { ...s.postById[postId], myVote: vote }
        }
      }))
    })

    // Stream post updates
    const unsubPost = streamPost(postId, (post) => {
      if (post) {
        set((s) => {
          const existing = s.postById[postId]
          // Merge: ALWAYS preserve myVote from existing if it exists (don't let streamPost overwrite it)
          // streamUserVote will update myVote separately
          const merged = { 
            ...existing, 
            ...post,
            // Always preserve myVote from existing - streamUserVote handles vote updates
            myVote: existing?.myVote !== undefined ? existing.myVote : post.myVote
          }
          return {
            postById: {
              ...s.postById,
              [postId]: merged
            }
          }
        })
      }
    })

    // Stream user vote updates - this is the source of truth for myVote
    const unsubVote = streamUserVote(postId, (vote) => {
      set((s) => {
        const existing = s.postById[postId]
        const pendingVote = s.pendingVotes[postId]
        
        // If there's a pending vote and streamUserVote returns 0, it might be because
        // the vote document doesn't exist yet (transaction hasn't committed).
        // Only update if the vote matches the pending vote, or if there's no pending vote
        if (pendingVote !== undefined && vote === 0 && pendingVote !== 0) {
          // Keep the pending vote - transaction might not have committed yet
          return {}
        }
        
        // Vote confirmed or no pending vote - update from Firestore
        // Clear pending vote if it matches
        const newPendingVotes = { ...s.pendingVotes }
        if (pendingVote === vote) {
          delete newPendingVotes[postId]
        }
        
        return {
          postById: {
            ...s.postById,
            [postId]: { 
              ...existing,
              myVote: vote // Use the vote from Firestore
            }
          },
          pendingVotes: newPendingVotes
        }
      })
    })

    set((s) => ({
      unsubscribeById: {
        ...s.unsubscribeById,
        [postId]: () => {
          unsubPost()
          unsubVote()
        }
      }
    }))
  },
  unsubscribeFromPost: (postId) => {
    const state = get()
    const unsub = state.unsubscribeById[postId]
    if (unsub) {
      unsub()
      set((s) => {
        const { [postId]: _, ...rest } = s.unsubscribeById
        return { unsubscribeById: rest }
      })
    }
  },
  optimisticVotePost: async (postId, value) => {
    const current = get().postById[postId]
    if (!current) {
      return
    }
    const prevScore = current?.score ?? 0
    const prevValue = current?.myVote ?? 0
    const delta = value - prevValue
    
    // Mark this vote as pending
    set((s) => ({ 
      pendingVotes: { ...s.pendingVotes, [postId]: value },
      postById: { ...s.postById, [postId]: { ...current, myVote: value, score: prevScore + delta } }
    }))
    
    try {
      const res = await votePost(postId, value)
      
      // Update score and hotRank, keep myVote as the optimistic value
      // streamUserVote will confirm it when Firestore updates
      set((s) => {
        const existing = s.postById[postId]
        return {
          postById: { 
            ...s.postById, 
            [postId]: { 
              ...existing,
              score: res.score, 
              hotRank: res.hotRank ?? existing?.hotRank,
              myVote: value // Keep the optimistic vote until streamUserVote confirms
            } 
          }
        }
      })
      
      // streamUserVote will fire when Firestore confirms the write and clear the pending vote
    } catch (error) {
      // Clear pending vote and rollback
      set((s) => {
        const { [postId]: _, ...restPending } = s.pendingVotes
        return { 
          pendingVotes: restPending,
          postById: { ...s.postById, [postId]: current } 
        }
      })
    }
  }
}))
