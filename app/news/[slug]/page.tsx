import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 300

type NewsPostPageProps = {
  params: Promise<{ slug: string }>
}

export default async function NewsPostPage({
  params,
}: NewsPostPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('news_posts')
    .select('id, slug, title, summary, body, category, cover_image_url, source_name, source_url, published_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) {
    notFound()
  }

  const shareUrl = `https://tarayai.com/news/${post.slug}`
  const shareText = encodeURIComponent(`${post.title}\n\n${shareUrl}`)

  return (
    <main className="min-h-screen bg-black text-white">
      {post.cover_image_url && (
        <div className="relative h-80 w-full overflow-hidden md:h-96">
          <Image
            src={post.cover_image_url}
            alt=""
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />
        </div>
      )}

      <article
        className={`relative z-10 mx-auto max-w-3xl px-6 py-12 ${
          post.cover_image_url ? '-mt-28' : ''
        }`}
      >
        <Link href="/news" className="text-sm text-white/50 hover:text-white">
          ← Back to News
        </Link>
        <div className="text-sm text-orange-400 uppercase tracking-wide mb-3">
          {post.category?.replace(/_/g, ' ')}
        </div>

        <h1 className="text-5xl font-serif mb-6">{post.title}</h1>

        <p className="text-xl text-white/70 mb-8">{post.summary}</p>

        <div className="text-sm text-white/40 mb-12">
          Source: {post.source_name}
        </div>

        <div className="prose prose-invert max-w-none">
          {post.body ? (
            <div className="whitespace-pre-wrap text-white/80 leading-7">
              {post.body}
            </div>
          ) : (
            <p className="text-white/60">No article body has been added yet.</p>
          )}
        </div>

        <div className="mt-12 rounded-lg border border-white/10 bg-white/[0.04] p-6">
          <p className="mb-2 text-sm text-white/60">Originally from:</p>
          <a
            href={post.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-orange-400 hover:text-orange-300"
          >
            Read the full article at {post.source_name || 'the source'} →
          </a>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-green-600 px-5 py-2 text-sm hover:bg-green-500"
          >
            Share on WhatsApp
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-white/10 px-5 py-2 text-sm hover:bg-white/20"
          >
            Share on X
          </a>
        </div>
      </article>
    </main>
  )
}

export async function generateMetadata({
  params,
}: NewsPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('news_posts')
    .select('title, summary, cover_image_url')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) {
    return {}
  }

  return {
    title: `${post.title} - Tarayai`,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      images: post.cover_image_url ? [post.cover_image_url] : [],
    },
  }
}
