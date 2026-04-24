import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function NewsPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('news_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12 max-w-3xl mx-auto">
      <Link href="/news" className="text-sm text-white/50 hover:text-white">
        ← Back to News
      </Link>

      <article className="mt-10">
        <div className="text-sm text-orange-400 uppercase tracking-wide mb-3">
          {post.category}
        </div>

        <h1 className="text-5xl font-serif mb-6">
          {post.title}
        </h1>

        <p className="text-xl text-white/70 mb-8">
          {post.summary}
        </p>

        <div className="text-sm text-white/40 mb-12">
          Source: {post.source_name}
        </div>

        <div className="prose prose-invert max-w-none">
          <p>
            This is the full article page. Later, we will replace this placeholder
            with full article body content from the database.
          </p>
        </div>
      </article>
    </main>
  )
}