import { useLayoutEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const themeKey = 'nothi-theme'

function readTheme() {
  try {
    return localStorage.getItem(themeKey) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(readTheme)
  const isDark = theme === 'dark'
  const Icon = isDark ? Moon : Sun

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(themeKey, theme)
    } catch {
      // The toggle still works for the current session without browser storage.
    }
  }, [theme])

  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label="Dark mode"
      aria-pressed={isDark}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  )
}
