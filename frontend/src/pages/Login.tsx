import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore, selectIsAuthed } from '@/store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isAuthed = useAuthStore(selectIsAuthed)
  const loading = useAuthStore((s) => s.loading)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail)
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail)

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loadingAuth, setLoadingAuth] = useState(false)

  const next = searchParams.get('next') || '/'

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthed) {
      navigate(next, { replace: true })
    }
  }, [loading, isAuthed, navigate, next])

  const handleGoogleSignIn = async () => {
    try {
      setError('')
      await signInWithGoogle()
      // Navigation will happen automatically via the useEffect above
    } catch (error: any) {
      setError(error.message || 'Failed to sign in with Google')
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoadingAuth(true)

    try {
      if (isSignUp) {
        if (!displayName.trim() || !username.trim()) {
          setError('Display name and username are required')
          setLoadingAuth(false)
          return
        }
        await signUpWithEmail(email.trim(), password, displayName.trim(), username.trim())
      } else {
        await signInWithEmail(email.trim(), password)
      }
      // Navigation will happen automatically via the useEffect above
    } catch (error: any) {
      setError(error.message || `Failed to ${isSignUp ? 'sign up' : 'sign in'}`)
    } finally {
      setLoadingAuth(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="text-center py-8">Loading...</div>
      </div>
    )
  }

  if (isAuthed) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="mt-8">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isSignUp ? 'Sign up' : 'Sign in'} to continue
        </h1>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded p-6 space-y-4">
          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alice"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="alice_wonder"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@reddit.test"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loadingAuth}
              className="w-full px-4 py-2 bg-primary-500 text-white rounded font-semibold hover:bg-primary-600 disabled:bg-zinc-400 disabled:cursor-not-allowed transition-colors"
            >
              {loadingAuth ? 'Loading...' : (isSignUp ? 'Sign up' : 'Sign in')}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-300 dark:border-zinc-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-zinc-900 text-zinc-500">Or</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 rounded font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>

          {/* Toggle Sign Up/Sign In */}
          <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setIsSignUp(false)
                    setError('')
                  }}
                  className="text-primary-500 hover:underline font-semibold"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setIsSignUp(true)
                    setError('')
                  }}
                  className="text-primary-500 hover:underline font-semibold"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

