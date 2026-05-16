'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/scanner', label: 'Scanner' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/settings', label: 'Nastavení' },
]

export default function NavLinks() {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [path])

  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:flex gap-1 text-sm">
        {links.map(({ href, label }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                active ? 'bg-[#6c63ff]/10 text-[#6c63ff]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}>
              {label}
            </Link>
          )
        })}
      </div>

      {/* Mobile hamburger button */}
      <button
        className="sm:hidden flex flex-col justify-center gap-1.5 w-9 h-9 p-2 rounded-lg hover:bg-slate-100 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu">
        <span className={`block h-0.5 bg-slate-700 rounded-full transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`block h-0.5 bg-slate-700 rounded-full transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
        <span className={`block h-0.5 bg-slate-700 rounded-full transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {/* Mobile dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed top-[3.75rem] left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-xl">
            {links.map(({ href, label }) => {
              const active = href === '/' ? path === '/' : path.startsWith(href)
              return (
                <Link key={href} href={href}
                  className={`flex items-center px-6 py-4 text-base font-medium border-b border-slate-50 last:border-0 transition-colors ${
                    active ? 'text-[#6c63ff] bg-[#6c63ff]/5' : 'text-slate-700 hover:bg-slate-50'
                  }`}>
                  {label}
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#6c63ff]" />}
                </Link>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
