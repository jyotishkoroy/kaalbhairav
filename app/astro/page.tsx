import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AstroChat from './chat'

export default async function AstroPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/astro')
  }

  const { data: chart } = await supabase
    .from('birth_charts')
    .select('place_name')
    .eq('user_id', user.id)
    .single()

  if (!chart) {
    redirect('/astro/setup')
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <AstroChat placeName={chart.place_name} />
    </main>
  )
}
