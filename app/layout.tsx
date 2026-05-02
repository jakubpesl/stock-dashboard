import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Stock Intelligence Dashboard',
  description: 'Osobní akciový dashboard s AI signály',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className={`${inter.className} min-h-screen bg-slate-100 text-slate-900`}>
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg text-[#6c63ff] flex items-center gap-2">
              <span className="text-xl">📊</span>
              <span>Stock Dashboard</span>
            </Link>
            <div className="flex gap-1 text-sm">
              <Link href="/" className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors font-medium">
                Dashboard
              </Link>
              <Link href="/scanner" className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors font-medium">
                Scanner
              </Link>
              <Link href="/settings" className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors font-medium">
                Nastavení
              </Link>
            </div>
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
