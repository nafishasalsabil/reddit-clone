export const env = {
  apiKey: import.meta.env.VITE_FB_API_KEY as string,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FB_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET as string,
  appId: import.meta.env.VITE_FB_APP_ID as string,
  featureSearchAlgolia: (import.meta.env.VITE_FEATURE_SEARCH_ALGOLIA ?? 'false') === 'true',
  algoliaAppId: (import.meta.env.VITE_ALGOLIA_APP_ID ?? '') as string,
  algoliaApiKey: (import.meta.env.VITE_ALGOLIA_API_KEY ?? '') as string
}

export function assertFrontendEnv() {
  const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'] as const
  for (const key of required) {
    if (!env[key]) {
      // eslint-disable-next-line no-console
    }
  }
}
