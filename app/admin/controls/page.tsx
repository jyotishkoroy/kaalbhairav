/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { createClient } from '@/lib/supabase/server'
import { toggleConfig } from './actions'

export default async function ControlsPage() {
  const supabase = await createClient()

  const { data: configs } = await supabase
    .from('site_config')
    .select('*')
    .order('key')

  return (
    <div>
      <h1 className="text-4xl font-serif mb-2">Controls</h1>
      <p className="text-white/60 mb-8 text-sm">
        Kill switches. Use these if something breaks or costs spike.
      </p>

      <div className="space-y-4">
        {configs?.map((config) => {
          const isBoolean = typeof config.value === 'boolean'

          return (
            <div
              key={config.key}
              className="p-5 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between"
            >
              <div>
                <div className="font-medium capitalize">
                  {config.key.replace(/_/g, ' ')}
                </div>
                <div className="text-sm text-white/50">
                  Current value:{' '}
                  <code className="text-white/80">
                    {JSON.stringify(config.value)}
                  </code>
                </div>
              </div>

              {isBoolean && (
                <form action={toggleConfig}>
                  <input type="hidden" name="key" value={config.key} />
                  <input type="hidden" name="value" value={String(!config.value)} />

                  <button
                    className={`px-4 py-2 rounded text-sm ${
                      config.value
                        ? 'bg-red-700 hover:bg-red-600'
                        : 'bg-green-700 hover:bg-green-600'
                    }`}
                  >
                    {config.value ? 'Disable' : 'Enable'}
                  </button>
                </form>
              )}
            </div>
          )
        })}

        {!configs?.length && (
          <p className="text-white/50">No controls found.</p>
        )}
      </div>
    </div>
  )
}