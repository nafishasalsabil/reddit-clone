import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { env } from '../env'

let algoliaClient: any = null
if (env.featureSearchAlgolia && env.algoliaAppId && env.algoliaApiKey) {
  try {
    const req = (eval('require') as NodeRequire)
    algoliaClient = req('algoliasearch')(env.algoliaAppId, env.algoliaApiKey)
  } catch {
    // no-op; stays null
  }
}

export async function searchPosts(term: string) {
  if (algoliaClient) {
    const index = algoliaClient.initIndex('posts')
    const res = await index.search(term, { hitsPerPage: 20 })
    return res.hits
  }
  const posts = collection(db, 'posts')
  // Simple Firestore search fallback (title prefix)
  const q = query(posts, where('title', '>=', term), where('title', '<=', term + '\uf8ff'), orderBy('title'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
