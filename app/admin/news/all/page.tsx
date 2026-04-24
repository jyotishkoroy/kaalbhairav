import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { deletePost, publishPost, unpublishPost } from './actions'

export default async function AllNewsPostsPage() {
  const { supabase } = await requireAdmin()

  const { data: posts, error } = await supabase
    .from('news_posts')
    .select('id, slug, title, summary, category, source_name, status, published_at, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
  }

  return (
    <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
      <div className="mb-10">
        <Link href="/admin/news" className="text-sm text-white/50 hover:text-white">
          ← Back to Admin News
        </Link>

        <h1 className="text-5xl font-serif mt-6 mb-3">All News Posts</h1>

        <p className="text-white/60">
          Manage draft, published, and rejected news posts.
        </p>
      </div>

      {!posts?.length && (
        <div className="border border-white/10 rounded-xl p-8 text-white/50">
          No posts found.
        </div>
      )}

      <div className="space-y-6">
        {posts?.map((post) => (
          <div
            key={post.id}
            className="border border-white/10 rounded-xl p-6 bg-white/[0.03]"
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-xs text-orange-400 uppercase tracking-wide mb-2">
                  {post.category} · {post.status}
                </div>

                <h2 className="text-2xl font-serif mb-2">{post.title}</h2>

                <p className="text-white/70 mb-3">{post.summary}</p>

                <div className="text-xs text-white/40">
                  Source: {post.source_name || 'Unknown'}
                </div>

                {post.status === 'published' && (
                  <Link
                    href={`/news/${post.slug}`}
                    className="inline-block text-xs text-white/50 hover:text-white mt-3"
                  >
                    View public post →
                  </Link>
                )}
              </div>

              <div className="flex flex-wrap gap-3 justify-end shrink-0">
                <Link
                  href={`/admin/news/${post.id}/edit`}
                  className="border border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/10"
                >
                  Edit
                </Link>
                {post.status !== 'published' && (
                  <form action={publishPost}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button
                      type="submit"
                      className="bg-green-500 text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-green-400"
                    >
                      Publish
                    </button>
                  </form>
                )}

                {post.status === 'published' && (
                  <form action={unpublishPost}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button
                      type="submit"
                      className="bg-yellow-400 text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-yellow-300"
                    >
                      Unpublish
                    </button>
                  </form>
                )}

                <form action={deletePost}>
                  <input type="hidden" name="postId" value={post.id} />
                  <button
                    type="submit"
                    className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-red-400"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
