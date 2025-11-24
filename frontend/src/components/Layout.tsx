import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Topbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-950 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

