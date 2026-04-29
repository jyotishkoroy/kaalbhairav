/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

export const metadata = {
  title: 'Terms of Service - tarayai',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16 text-white/80">
        <h1 className="text-4xl font-serif mb-4 text-white">Terms of Service</h1>
        <p className="text-sm text-white/50 mb-12">Last updated: April 24, 2026</p>

        <div className="space-y-8 leading-relaxed">
          <section>
            <h2 className="text-2xl font-serif text-white mb-3">
              Nature of content
            </h2>
            <p>
              Astrology and spiritual content on Kaalbhairav is offered as
              reflection and symbolism, not prediction, medical diagnosis, legal
              counsel, or financial advice. For those matters, consult qualified
              professionals.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-3">News</h2>
            <p>
              News posts are curated commentary linking to original sources.
              Copyright belongs to the original publishers. Rights holders can
              email{' '}
              <a href="mailto:takedown@kaalbhairav.org" className="text-orange-400 underline">
                takedown@kaalbhairav.org
              </a>{' '}
              for review.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-3">
              User conduct
            </h2>
            <p>
              Do not post hate speech, sectarian attacks, harassment, spam, or
              encouragement of violence. Accounts violating this may be suspended
              or deleted.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-3">
              Limitation of liability
            </h2>
            <p>
              Kaalbhairav is provided as-is. You are responsible for your own
              decisions and actions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-3">Contact</h2>
            <p>
              Questions about these terms can be sent to{' '}
              <a href="mailto:hello@kaalbhairav.org" className="text-orange-400 underline">
                hello@kaalbhairav.org
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
