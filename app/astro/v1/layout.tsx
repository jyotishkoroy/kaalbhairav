import { redirect } from 'next/navigation'
import { isAstroV1UIEnabled } from '@/lib/flags/astro-v1'

export default function AstroV1Layout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!isAstroV1UIEnabled()) {
    redirect('/astro')
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {children}
    </div>
  )
}
