'use client'

import { Inter } from 'next/font/google'
import { Button } from '@/components/ui/button'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold">Algo salio mal</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Ocurrio un error inesperado. Intenta recargar la pagina.
          </p>
          <Button onClick={() => reset()}>Reintentar</Button>
        </div>
      </body>
    </html>
  )
}
