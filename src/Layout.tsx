import { type ReactNode } from 'react'

const Footer = () => {
  return (
    <footer className="shrink-0 border-t bg-card/60 px-4 py-1.5 text-center text-[11px] text-muted-foreground backdrop-blur-md">
      © {new Date().getFullYear()} Suat Sülün. All rights reserved.
    </footer>
  )
}

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  // Mobile: allow the page to grow + scroll so the controls fit below the
  // preview. Desktop (md+): pin the whole UI to one viewport — only inner
  // panels scroll when their content overflows.
  return (
    <div className="flex min-h-dvh flex-col md:h-screen md:overflow-hidden">
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  )
}
