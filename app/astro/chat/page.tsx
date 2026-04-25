import Link from 'next/link'
import AstroChat from '../chat'

type AstroChatPageProps = {
  searchParams: Promise<{
    profile_id?: string
    place?: string
  }>
}

export default async function AstroChatPage({ searchParams }: AstroChatPageProps) {
  const params = await searchParams
  const profileId = params.profile_id
  const placeName = params.place ?? null

  if (!profileId) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm font-medium text-zinc-500">/astro V1</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">Astro chat</h1>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-700 shadow-sm">
          <p className="font-medium text-zinc-950">No chart selected.</p>
          <p className="mt-2 text-sm">
            Open a saved chart first, then start chat from that chart so the backend can attach the correct profile ID.
          </p>

          <Link
            href="/astro"
            className="mt-4 inline-flex rounded-full bg-zinc-950 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Go to Astro
          </Link>
        </div>
      </main>
    )
  }

  return <AstroChat placeName={placeName} profileId={profileId} />
}