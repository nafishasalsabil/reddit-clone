import * as admin from 'firebase-admin';
import { vote } from './vote';
import { onCommentWrite } from './comments';
import { onPostCreate } from './algolia';
if (admin.apps.length === 0) {
    admin.initializeApp();
}
export { vote, onCommentWrite };
// onPostCreate is optional
export { onPostCreate };
