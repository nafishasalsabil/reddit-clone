import { create } from 'zustand'
import { streamHotPosts, streamNewPosts, streamTopPosts } from '@/lib/api/posts'

export type FeedTab = 'hot'|'new'|'top'

interface FeedState {
  activeTab: FeedTab
  posts: any[]
  loading: boolean
  communityId?: string
  unsubscribe?: () => void
  setTab: (t: FeedTab, cid?: string) => void
}

export const useFeedStore = create<FeedState>((set, get) => ({
  activeTab: 'hot',
  posts: [],
  loading: false,
  communityId: undefined,
  setTab: (t, cid) => {
    const prevUnsub = get().unsubscribe
    if (prevUnsub) prevUnsub()
    
    // Set loading state
    set({ loading: true, posts: [] })
    
    let unsub: () => void
    if (t === 'hot') {
      unsub = streamHotPosts({ cid }, (ps) => set({ posts: ps, loading: false }))
    } else if (t === 'new') {
      unsub = streamNewPosts({ cid }, (ps) => set({ posts: ps, loading: false }))
    } else if (t === 'top') {
      unsub = streamTopPosts({ cid }, (ps) => set({ posts: ps, loading: false }))
    } else {
      // Fallback to hot
      unsub = streamHotPosts({ cid }, (ps) => set({ posts: ps, loading: false }))
    }
    
    set({ activeTab: t, communityId: cid, unsubscribe: unsub })
  }
}))
