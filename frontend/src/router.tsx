import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from './components/Layout'
import Spinner from './components/Spinner'

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'))
const Popular = lazy(() => import('./pages/Popular'))
const All = lazy(() => import('./pages/All'))
const Community = lazy(() => import('./pages/Community'))
const Submit = lazy(() => import('./pages/Submit'))
const PostDetail = lazy(() => import('./pages/PostDetail'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
const ModQueue = lazy(() => import('./pages/ModQueue'))
const Settings = lazy(() => import('./pages/Settings'))
const Search = lazy(() => import('./pages/Search'))
const Login = lazy(() => import('./pages/Login'))
const Chat = lazy(() => import('./pages/Chat'))
const Notifications = lazy(() => import('./pages/Notifications'))
const NotFound = lazy(() => import('./pages/NotFound'))

const LazyWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="flex items-center justify-center min-h-[calc(100vh-3rem)]"><Spinner /></div>}>
    {children}
  </Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <LazyWrapper><Home /></LazyWrapper> },
      { path: '/popular', element: <LazyWrapper><Popular /></LazyWrapper> },
      { path: '/all', element: <LazyWrapper><All /></LazyWrapper> },
      { path: '/r/:name', element: <LazyWrapper><Community /></LazyWrapper> },
      { path: '/submit', element: <LazyWrapper><Submit /></LazyWrapper> },
      { path: '/r/:name/submit', element: <LazyWrapper><Submit /></LazyWrapper> },
      { path: '/r/:name/post/:pid', element: <LazyWrapper><PostDetail /></LazyWrapper> },
      { path: '/u/:uid', element: <LazyWrapper><UserProfile /></LazyWrapper> },
      { path: '/u/:uid/post/:pid', element: <LazyWrapper><PostDetail /></LazyWrapper> },
      { path: '/mod/:name', element: <LazyWrapper><ModQueue /></LazyWrapper> },
      { path: '/settings', element: <LazyWrapper><Settings /></LazyWrapper> },
      { path: '/search', element: <LazyWrapper><Search /></LazyWrapper> },
      { path: '/notifications', element: <LazyWrapper><Notifications /></LazyWrapper> },
      { path: '/chat', element: <LazyWrapper><Chat /></LazyWrapper> },
      { path: '/chat/:conversationId', element: <LazyWrapper><Chat /></LazyWrapper> },
      { path: '*', element: <LazyWrapper><NotFound /></LazyWrapper> }
    ]
  },
  { path: '/login', element: <LazyWrapper><Login /></LazyWrapper> }
])
