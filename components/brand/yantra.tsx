'use client'

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { motion } from 'framer-motion'

export function RotatingYantra() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.16]"
      animate={{ rotate: 360 }}
      transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
    >
      <svg viewBox="0 0 400 400" className="w-[720px] h-[720px] max-w-[95vw]">
        <g stroke="#D97706" strokeWidth="1" fill="none">
          <circle cx="200" cy="200" r="190" />
          <circle cx="200" cy="200" r="160" />

          <polygon points="200,40 80,280 320,280" />
          <polygon points="200,80 110,260 290,260" />
          <polygon points="200,120 140,240 260,240" />
          <polygon points="200,150 160,220 240,220" />

          <polygon points="200,360 80,120 320,120" />
          <polygon points="200,320 110,140 290,140" />
          <polygon points="200,280 140,160 260,160" />
          <polygon points="200,250 160,180 240,180" />

          <circle cx="200" cy="200" r="3" fill="#D97706" />
        </g>
      </svg>
    </motion.div>
  )
}