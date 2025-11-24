# Reddit Clone Monorepo

Production-oriented Firebase + React monorepo (TypeScript), with strict typing, tests, CI, and one-command dev.

## Stack
- Frontend: React + Vite + Tailwind + TypeScript + React Router + Zustand
- Backend: Firebase Auth, Firestore, Storage, Cloud Functions (TypeScript)
- Optional Search: Algolia (behind feature flags)

## Structure
- `frontend/` — React app
- `functions/` — Cloud Functions
- `firestore.rules`, `storage.rules` — Security rules
- `firebase.json`, `.firebaserc` — Firebase config + emulators
- `.github/workflows/ci.yml` — CI
- `Makefile` — DX commands

## Quick Start
1. Prereqs: Node 20+, pnpm 9+, Firebase CLI
2. Install
```bash
cd reddit-clone
make install
```
3. Configure Firebase project
```bash
firebase login
firebase use <project-id>
```
4. Frontend env
```bash
cp frontend/.env.example frontend/.env
# Fill VITE_FB_* and feature flags
```
5. Run emulators + frontend
```bash
make dev
```

## Deploy
- Rules + Functions:
```bash
make deploy
```

## Feature Flags / Search
- Default search uses Firestore filters
- To enable Algolia, set in frontend `.env`:
```
VITE_FEATURE_SEARCH_ALGOLIA=true
VITE_ALGOLIA_APP_ID=...
VITE_ALGOLIA_API_KEY=...
```
- For Functions (optional onPostCreate sync):
```bash
firebase functions:config:set app.env="prod" algolia.app_id="<id>" algolia.api_key="<key>"
```

## Indexes (Firestore)
Composite indexes are defined in `firestore.indexes.json`:
- Global hot: posts by `hotRank desc`, `createdAt desc`
- Community hot: `cid asc`, `hotRank desc`
- Community new: `cid asc`, `createdAt desc`
- Conversations: `participantUids (array-contains)`, `updatedAt desc`
- User search: `username asc` and `displayName asc`

To deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

For emulators, indexes are loaded from `firestore.indexes.json` automatically when emulators start.

## Tests
- Frontend: Vitest + RTL (`pnpm -C frontend test`)
- Functions: Jest (`pnpm -C functions test`)

## Next Steps
- App Check
- Algolia production config and synonyms
- Cloud Logging/Monitoring dashboards
