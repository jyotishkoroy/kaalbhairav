import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AstroV1Chat } from './AstroV1Chat'

type Props = {
  params: Promise<{ profileId: string }>
}

export default async function ChatPage({ params }: Props) {
  const { profileId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('birth_profiles')
    .select('id, display_name')
    .eq('id', profileId)
    .eq('user_id', user.id)
    .single()

  if (!profile) notFound()

  return (
    <main className="flex flex-col h-screen max-w-2xl mx-auto px-4">
      <header className="py-4 border-b border-white/10 flex items-center gap-3">
        <a href={`/astro/v1/profile/${profileId}`} className="text-white/40 hover:text-white/70 text-sm">
          ←
        </a>
        <div>
          <p className="font-medium">{profile.display_name}</p>
          <p className="text-xs text-yellow-400/80">Stub mode — detailed predictions unavailable until Phase 5</p>
        </div>
      </header>
      <AstroV1Chat profileId={profileId} />
    </main>
  )
}
