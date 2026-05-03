'use client'
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
  return (
    <div className="flex gap-1 text-sm">
      {links.map(({ href, label }) => {
        const active = href === '/' ? path === '/' : path.startsWith(href)
        return (
          <Link key={href} href={href}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              active
                ? 'bg-[#6c63ff]/10 text-[#6c63ff]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}>
            {label}
          </Link>
        )
      })}
    </div>
  )
}
