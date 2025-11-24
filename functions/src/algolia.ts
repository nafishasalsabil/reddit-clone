import * as functions from 'firebase-functions'
import { getFirestore } from 'firebase-admin/firestore'

let client: any = null
try {
  const appId = (functions.config().algolia?.app_id as string) || ''
  const apiKey = (functions.config().algolia?.api_key as string) || ''
  if (appId && apiKey) {
    const req = (eval('require') as NodeRequire)
    client = req('algoliasearch')(appId, apiKey)
  }
} catch {}

export const onPostCreate = client
  ? functions.firestore.document('posts/{postId}').onCreate(async (snap, context) => {
      const data = snap.data()
      const index = client.initIndex('posts')
      await index.saveObject({ objectID: context.params.postId, title: data.title, body: data.body ?? '', cid: data.cid, createdAt: data.createdAt?.seconds ?? 0 })
    })
  : undefined as unknown as functions.CloudFunction<unknown>
