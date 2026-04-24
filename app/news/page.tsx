import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'

export default async function NewsPage() {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('news_posts')
    .select('id, slug, title, summary, cover_image_url, source_name, category, published_at, like_count, comment_count')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20)

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12 max-w-4xl mx-auto">
      <h1 className="text-5xl font-serif mb-12">News</h1>
      <div className="space-y-8">
        {posts?.map((post) => (
          <Link
            key={post.id}
            href={`/news/${post.slug}`}
            className="block border-b border-white/10 pb-8 hover:opacity-80"
          >
            {post.cover_image_url && (
              <Image
                src={post.cover_image_url}
                alt=""
                width={1200}
                height={675}
                className="w-full aspect-video object-cover rounded mb-4"
              />
            )}
            <div className="text-sm text-orange-400 uppercase tracking-wide mb-2">
              {post.category}
            </div>
            <h2 className="text-2xl font-serif mb-2">{post.title}</h2>
            <p className="text-white/70">{post.summary}</p>
            <div className="text-xs text-white/40 mt-3">
              Source: {post.source_name}
            </div>
          </Link>
        ))}
        {!posts?.length && (
          <p className="text-white/50">No posts yet. Check back soon.</p>
        )}
      </div>
    </main>
  )
}
