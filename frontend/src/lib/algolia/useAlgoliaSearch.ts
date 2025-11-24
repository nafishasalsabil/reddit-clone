import { useEffect, useMemo, useState } from 'react'
import { env } from '../env'
import { searchPosts } from '../api/search'

export function useAlgoliaSearch(term: string) {
  const enabled = env.featureSearchAlgolia && !!env.algoliaAppId && !!env.algoliaApiKey
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let off = false
    if (!term) { setResults([]); return }
    setLoading(true)
    ;(async () => {
      try {
        const r = await searchPosts(term)
        if (!off) setResults(r as any[])
      } catch (e: any) {
        if (!off) setError(e?.message ?? 'Search error')
      } finally {
        if (!off) setLoading(false)
      }
    })()
    return () => { off = true }
  }, [term, enabled])

  return { enabled, results, loading, error }
}
