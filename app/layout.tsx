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
      <body className={`${inter.className} min-h-screen bg-background text-primary`}>
        <nav className="border-b border-[#2a2a3a] bg-[#1a1a24]/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg text-[#6c63ff]">
              📊 Stock Dashboard
            </Link>
            <div className="flex gap-6 text-sm">
              <Link href="/" className="text-[#94a3b8] hover:text-[#f1f5f9] transition-colors">
                Dashboard
              </Link>
              <Link href="/scanner" className="text-[#94a3b8] hover:text-[#f1f5f9] transition-colors">
                Scanner
              </Link>
              <Link href="/settings" className="text-[#94a3b8] hover:text-[#f1f5f9] transition-colors">
                Nastavení
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
        <footer className="border-t border-[#2a2a3a] mt-16 py-6 text-center">
          <p className="text-[#94a3b8] text-sm">
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
