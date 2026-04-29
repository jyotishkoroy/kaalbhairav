import { createClient } from '@/lib/supabase/server'
import { RotatingYantra } from '@/components/brand/yantra'
import Link from 'next/link'

export const revalidate = 600

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const today = new Date().toISOString().slice(0, 10)
  const { data: insight } = await supabase
    .from('daily_insights')
    .select('*')
    .eq('insight_date', today)
    .maybeSingle()

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative min-h-[80vh] flex items-center justify-center px-6 text-center overflow-hidden">
        <RotatingYantra />
        <div className="relative z-10 max-w-2xl space-y-8">
          <h1 className="text-7xl md:text-8xl font-serif">tarayai</h1>
          <p className="text-xl text-white/70 leading-relaxed">
            A grounded space for spiritual reflection, authentic stories, and the quiet questions.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            {user ? (
              <>
                <Link href="/astro/v1" className="px-8 py-3 bg-orange-600 rounded-full hover:bg-orange-500">
                  Ask the Guru
                </Link>
                <Link href="/still" className="px-8 py-3 border border-orange-500/40 rounded-full hover:bg-orange-500/10">
                  Open Still
                </Link>
                <Link href="/news" className="px-8 py-3 border border-white/20 rounded-full hover:bg-white/5">
                  Read News
                </Link>
              </>
            ) : (
              <Link href="/sign-in" className="px-8 py-3 bg-white text-black rounded-full hover:bg-white/90">
                Begin your journey
              </Link>
            )}
          </div>
        </div>
      </section>

      {insight && (
        <section className="max-w-2xl mx-auto px-6 py-12">
          <div className="p-8 bg-gradient-to-br from-orange-900/20 to-red-900/20 border border-orange-500/20 rounded-2xl">
            <div className="text-xs uppercase tracking-widest text-orange-400 mb-4">
              Today&apos;s Panchang
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
              <div>
                <div className="text-white/40">Tithi</div>
                <div>{insight.tithi}</div>
              </div>
              <div>
                <div className="text-white/40">Nakshatra</div>
                <div>{insight.nakshatra}</div>
              </div>
              <div>
                <div className="text-white/40">Rashi</div>
                <div>{insight.rashi}</div>
              </div>
            </div>

            {insight.bhairav_message && (
              <p className="text-lg italic text-white/80">
                &quot;{insight.bhairav_message}&quot;
              </p>
            )}
          </div>
        </section>
      )}

      <footer className="border-t border-white/10 mt-24 py-12 px-6 text-center text-sm text-white/40">
        <div className="space-x-6">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/settings">Settings</Link>
          <a href="mailto:takedown@tarayai.com">Takedown</a>
        </div>
        <p className="mt-4">Jai Maa Tara</p>
      </footer>
    </main>
  )
}