import * as functions from 'firebase-functions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { rateLimit } from './rateLimit';
import { computeHot } from './computeHot';
const db = getFirestore();
export const vote = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
    const { targetType, targetId, value } = data;
    if (!['post', 'comment'].includes(targetType) || typeof targetId !== 'string' || ![-1, 0, 1].includes(value)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid vote payload');
    }
    const uid = context.auth.uid;
    const rl = rateLimit(`${uid}:${targetType}:${targetId}`);
    if (!rl.allowed)
        throw new functions.https.HttpsError('resource-exhausted', 'Too many votes, slow down');
    const voteDoc = db.doc(`votes/${targetType}_${targetId}/userVotes/${uid}`);
    const targetDoc = db.doc(`${targetType === 'post' ? 'posts' : `posts/${(await db.doc(`comments/${targetId}`).get()).data()?.postId}/comments`}/${targetId}`);
    const result = await db.runTransaction(async (tx) => {
        const prevSnap = await tx.get(voteDoc);
        const prevValue = prevSnap.exists ? prevSnap.data()?.value : 0;
        const delta = value - prevValue;
        if (delta === 0)
            return { score: (await tx.get(targetDoc)).data()?.score };
        // Upsert user vote
        if (value === 0)
            tx.delete(voteDoc);
        else
            tx.set(voteDoc, { value, updatedAt: Timestamp.now() });
        // Update aggregate score
        const tSnap = await tx.get(targetDoc);
        if (!tSnap.exists)
            throw new functions.https.HttpsError('not-found', 'Target not found');
        const tData = tSnap.data();
        if (!tData)
            throw new functions.https.HttpsError('not-found', 'Target data not found');
        const score = tData.score + delta;
        const update = { score };
        if (targetType === 'post') {
            const createdAt = tData.createdAt;
            update.hotRank = computeHot(score, createdAt);
        }
        tx.update(targetDoc, update);
        return update;
    });
    return result;
});
