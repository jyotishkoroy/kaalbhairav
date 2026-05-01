import { describe, expect, it } from 'vitest'
import { classifyTopic } from '@/lib/news/topics'

describe('news topic classifier', () => {
  it('prefers tantra over manuscript/archive', () => expect(classifyTopic('Tantric Shaiva manuscript digitized from rare palm-leaf archive', '', ['archive'])).toBe('tantra'))
  it('prefers temple or ritual over archaeology', () => expect(['temple', 'ritual']).toContain(classifyTopic('Archaeologists discover ancient temple shrine with ritual offerings', '', [])))
  it('handles curse tablet', () => expect(['ritual', 'manuscript']).toContain(classifyTopic('Cuneiform curse tablet reveals ancient magical ritual', '', [])))
  it('handles pilgrimage route', () => expect(['temple', 'religion', 'deity']).toContain(classifyTopic('New Hindu pilgrimage route opens near Shiva shrine', '', [])))
  it('handles esotericism', () => expect(['esotericism', 'occult']).toContain(classifyTopic('Alchemy and Rosicrucian esotericism in newly released journal issue', '', ['research'])))
})
