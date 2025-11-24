import * as functions from 'firebase-functions';
let client = null;
try {
    const appId = functions.config().algolia?.app_id || '';
    const apiKey = functions.config().algolia?.api_key || '';
    if (appId && apiKey) {
        const req = eval('require');
        client = req('algoliasearch')(appId, apiKey);
    }
}
catch { }
export const onPostCreate = client
    ? functions.firestore.document('posts/{postId}').onCreate(async (snap, context) => {
        const data = snap.data();
        const index = client.initIndex('posts');
        await index.saveObject({ objectID: context.params.postId, title: data.title, body: data.body ?? '', cid: data.cid, createdAt: data.createdAt?.seconds ?? 0 });
    })
    : undefined;
