'use client'

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { useState } from 'react'
import { toggleLike } from '../actions'

export function NewsInteractions({ postId, slug, shareUrl, initiallyLiked }: { postId: string; slug: string; shareUrl: string; initiallyLiked: boolean }) {
  const [liked, setLiked] = useState(initiallyLiked)

  return (
    <div className="mt-8 flex gap-3">
      <form action={toggleLike}>
        <input type="hidden" name="postId" value={postId} />
        <input type="hidden" name="slug" value={slug} />
        <button type="submit" onClick={() => setLiked((v) => !v)} className="rounded-full border border-white/20 px-4 py-2 text-sm">
          {liked ? 'Unlike' : 'Like'}
        </button>
      </form>
      <button
        type="button"
        onClick={async () => {
          const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
          if (canShare) await navigator.share({ url: shareUrl, title: slug })
          else if (navigator.clipboard) await navigator.clipboard.writeText(shareUrl)
          await fetch('/api/news/share', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postId, shareTarget: canShare ? 'web_share' : 'copy' }) })
        }}
        className="rounded-full border border-white/20 px-4 py-2 text-sm"
      >
        Share
      </button>
    </div>
  )
}
