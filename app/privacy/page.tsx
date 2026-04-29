/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

export const metadata = {
  title: 'Privacy Policy - Tarayai',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16 text-white/80">
        <h1 className="text-4xl font-serif mb-4 text-white">Privacy Policy</h1>
        <p className="text-sm text-white/50 mb-12">Last updated: April 24, 2026</p>

        <div className="space-y-8 leading-relaxed">
          <section>
            <h2 className="text-2xl font-serif text-white mb-3">
              What we collect
            </h2>
            <p>
              When you sign in with Google, we receive your name, email, and
              profile picture. If you use astrology features, we collect birth
              date, birth time, and birth place. If you use Still, your journal
              entries are stored for your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-3">
              How we use it
            </h2>
            <p>
              Your email is used for authentication. Birth data is used to give
              symbolic astrology context. Journal entries are private reflections
              shown only to you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-3">
              How we store it
            </h2>
            <p>
              Birth data is encrypted at rest before storage. Application data is
              stored in Supabase. Secrets are kept outside the public codebase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-3">
              Third parties
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Supabase for database and authentication</li>
              <li>Vercel for hosting</li>
              <li>Google for OAuth sign-in</li>
              <li>Groq for AI inference</li>
              <li>Upstash for rate limiting</li>
              <li>Cloudflare for DNS and security</li>
            </ul>
            <p className="mt-3">We do not sell your data.</p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-3">
              Your rights
            </h2>
            <p>
              Under India&apos;s DPDP Act 2023, you may request access,
              correction, or deletion of your personal data. Email{' '}
              <a href="mailto:privacy@tarayai.com" className="text-orange-400 underline">
                privacy@tarayai.com
              </a>{' '}
              for privacy requests.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
