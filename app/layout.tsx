import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import NavLinks from '@/components/NavLinks'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Stock Intelligence Dashboard',
  description: 'Osobní akciový dashboard s AI signály',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className={`${inter.className} min-h-screen text-slate-900`}>
        <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between" style={{ height: '3.75rem' }}>
            <Link href="/" className="flex items-center gap-2.5 group">
              {/* Logo icon */}
              <svg width="32" height="32" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"
                className="rounded-lg shadow-sm shadow-[#6c63ff]/30 group-hover:shadow-md group-hover:shadow-[#6c63ff]/40 transition-shadow">
                <rect width="512" height="512" rx="115" fill="#1a1a24"/>
                <rect x="118" y="342" width="58" height="120" rx="10" fill="#6c63ff" opacity="0.5"/>
                <rect x="188" y="278" width="58" height="184" rx="10" fill="#6c63ff" opacity="0.7"/>
                <rect x="258" y="200" width="58" height="262" rx="10" fill="#6c63ff" opacity="0.85"/>
                <rect x="328" y="120" width="58" height="342" rx="10" fill="#6c63ff"/>
                <polyline points="147,320 217,255 287,178 357,98" fill="none" stroke="#22c55e" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="357" cy="98" r="24" fill="#22c55e"/>
              </svg>
              <div className="leading-tight">
                <span className="font-bold text-sm text-slate-900 tracking-tight block">Stock</span>
                <span className="font-light text-xs text-[#6c63ff] tracking-widest uppercase block">Intelligence</span>
              </div>
            </Link>
            <NavLinks />
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
        <footer className="border-t border-slate-200 bg-white mt-16 py-6 text-center">
          <p className="text-slate-400 text-sm">
            ⚠️ Tato aplikace slouží pouze k informačním účelům a nepředstavuje finanční poradenství.
          </p>
        </footer>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(console.error)}`,
          }}
        />
      </body>
    </html>
  )
}
