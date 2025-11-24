import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem('theme') as Theme | null
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = create<ThemeState>((set) => {
  const initialTheme = getInitialTheme()
  
  // Initialize on first load
  if (typeof window !== 'undefined') {
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')
  }
  
  return {
    theme: initialTheme,
    setTheme: (theme: Theme) => {
      set({ theme })
      localStorage.setItem('theme', theme)
      if (typeof window !== 'undefined') {
        document.documentElement.classList.toggle('dark', theme === 'dark')
      }
    },
    toggleTheme: () => {
      set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light'
        localStorage.setItem('theme', newTheme)
        if (typeof window !== 'undefined') {
          document.documentElement.classList.toggle('dark', newTheme === 'dark')
        }
        return { theme: newTheme }
      })
    }
  }
})

