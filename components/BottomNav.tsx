'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createContext, useContext, useState, ReactNode } from 'react'

// ============================================
// NAV HEIGHT CONSTANT
// Used for consistent spacing across the app
// ============================================
export const BOTTOM_NAV_HEIGHT = 72 // px

// ============================================
// NAV VISIBILITY CONTEXT
// Allows pages to hide the nav during modals
// ============================================

interface NavVisibilityContextType {
  hidden: boolean
  setHidden: (hidden: boolean) => void
}

const NavVisibilityContext = createContext<NavVisibilityContextType>({
  hidden: false,
  setHidden: () => {},
})

export function useNavVisibility() {
  return useContext(NavVisibilityContext)
}

export function NavVisibilityProvider({ children, showNav = true }: { children: ReactNode; showNav?: boolean }) {
  const [hidden, setHidden] = useState(false)
  const hideNav = hidden || !showNav
  return (
    <NavVisibilityContext.Provider value={{ hidden, setHidden }}>
      <div className={`app-layout ${hideNav ? 'nav-hidden' : ''}`}>
        {children}
      </div>
    </NavVisibilityContext.Provider>
  )
}

// ============================================
// BOTTOM NAV COMPONENT
// Persistent navigation bar for the app
// ============================================

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { hidden } = useNavVisibility()

  // Don't render on login page
  if (pathname === '/login') return null

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <nav className={`app-bottom-nav ${hidden ? 'app-bottom-nav-hidden' : ''}`}>
        <button 
          className={`app-nav-item ${isActive('/budget') ? 'active' : ''}`} 
          onClick={() => router.push('/budget')}
        >
          <span className="app-nav-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </span>
          <span>Budget</span>
        </button>

        <button 
          className={`app-nav-item app-nav-center ${isActive('/') ? 'active' : ''}`} 
          onClick={() => router.push('/')}
        >
          <span className="app-nav-icon-wrap app-nav-center-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </span>
          <span>Home</span>
        </button>

        <button 
          className={`app-nav-item ${isActive('/trips') ? 'active' : ''}`} 
          onClick={() => router.push('/trips')}
        >
          <span className="app-nav-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </span>
          <span>Trips</span>
        </button>

        <button 
          className={`app-nav-item ${isActive('/community') ? 'active' : ''}`} 
          onClick={() => router.push('/community')}
        >
          <span className="app-nav-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </span>
          <span>Deals</span>
        </button>
      </nav>
    </>
  )
}

// ============================================
// STYLES
// Compact nav bar with proper spacing
// ============================================

const styles = `
  /* Layout wrapper - handles bottom padding for nav */
  .app-layout {
    min-height: 100vh;
    padding-bottom: ${BOTTOM_NAV_HEIGHT}px;
    padding-bottom: calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px));
  }
  
  /* Remove padding when nav is hidden (modals) */
  .app-layout.nav-hidden {
    padding-bottom: 0;
  }
  
  /* Bottom navigation bar */
  .app-bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: ${BOTTOM_NAV_HEIGHT}px;
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 8px 16px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    background: linear-gradient(180deg, rgba(10, 22, 40, 0.96), rgba(5, 13, 24, 0.98));
    border-top: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    z-index: 100;
    transition: transform 0.25s ease, opacity 0.25s ease;
  }
  
  .app-bottom-nav-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translateY(100%);
  }
  
  .app-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 14px;
    background: none;
    border: none;
    color: #64748b;
    font-size: 0.625rem;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.2s;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .app-nav-item:hover { 
    color: #94a3b8; 
  }
  
  .app-nav-item.active { 
    color: #34d399; 
  }
  
  /* Icon wrap: same size for all, circle + glow only when this tab is active */
  .app-nav-icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, box-shadow 0.2s;
  }
  
  .app-nav-item.active .app-nav-icon-wrap {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
    border: 3px solid rgba(5, 13, 24, 0.9);
  }
  
  .app-nav-center {
    position: relative;
    margin-top: -16px;
  }
  
  .app-nav-center-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, box-shadow 0.2s;
  }
  
  /* Center (Home): same size when active; no ring when inactive */
  .app-nav-center .app-nav-icon-wrap {
    width: 48px;
    height: 48px;
  }
  
  .app-nav-item.active.app-nav-center .app-nav-icon-wrap {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.5);
    border: 3px solid rgba(5, 13, 24, 0.9);
  }
`
