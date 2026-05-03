import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import NavLinks from '@/components/NavLinks'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Stock Intelligence Dashboard',
  description: 'Osobní akciový dashboard s AI signály',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className={`${inter.className} min-h-screen bg-slate-100 text-slate-900`}>
        <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between" style={{ height: '3.75rem' }}>
            <Link href="/" className="font-bold text-[#6c63ff] flex items-center gap-2.5 group">
              <span className="w-8 h-8 bg-[#6c63ff] rounded-lg flex items-center justify-center text-white text-sm shadow-sm shadow-[#6c63ff]/30 group-hover:shadow-md group-hover:shadow-[#6c63ff]/40 transition-shadow">📈</span>
              <span className="text-base tracking-tight">Stock Dashboard</span>
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
