import * as functions from 'firebase-functions'
import { getFirestore } from 'firebase-admin/firestore'

const db = getFirestore()

export const onCommentWrite = functions.firestore
  .document('posts/{postId}/comments/{commentId}')
  .onWrite(async (change, context) => {
    const postRef = db.doc(`posts/${context.params.postId}`)
    if (!change.before.exists && change.after.exists) {
      await postRef.update({ commentCount: (await postRef.get()).data()?.commentCount + 1 })
    } else if (change.before.exists && !change.after.exists) {
      await postRef.update({ commentCount: Math.max(0, (await postRef.get()).data()?.commentCount - 1) })
    } else {
      // no-op on updates
    }
  })
