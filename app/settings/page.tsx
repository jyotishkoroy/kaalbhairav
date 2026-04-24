import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { deleteAccount } from './actions'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in?next=/settings')

  return (
    <main className="min-h-screen bg-black text-white max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-serif mb-8">Settings</h1>

      <div className="space-y-6">
        <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
          <h2 className="text-xl mb-2">Account</h2>
          <p className="text-white/60 text-sm">Signed in as {user.email}</p>
        </div>

        <div className="p-6 bg-red-950/20 border border-red-900/30 rounded-lg">
          <h2 className="text-xl mb-2 text-red-300">Delete account</h2>
          <p className="text-white/60 text-sm mb-4">
            This will mark your account for deletion. Your profile, birth chart, journal entries,
            and conversations may be removed permanently. This cannot be undone.
          </p>

          <form action={deleteAccount}>
            <button
              type="submit"
              className="px-4 py-2 bg-red-700 rounded hover:bg-red-600 text-sm"
            >
              Delete my account
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}