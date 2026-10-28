/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { IconBadge } from '@/components/ui/icon-badge'
import type { DashboardFlowNode } from '@/features/dashboard/types'
import { toIntlLocale } from '@/i18n/languages'
import { formatCompactNumber, formatNumber, formatQuota } from '@/lib/format'

interface FlowKeyStatsProps {
  nodes: DashboardFlowNode[]
  timeRangeMinutes: number
}

// Per-API-key summary above the flow chart. It reads the token nodes the flow
// graph already built, so the numbers always match the rendered ribbons.
export function FlowKeyStats(props: FlowKeyStatsProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const minutes = Math.max(props.timeRangeMinutes, 1)
  const keys = props.nodes
    .filter((node) => node.kind === 'token')
    .sort((a, b) => b.tokens - a.tokens)

  if (keys.length === 0) return null

  return (
    <div className='flex flex-wrap gap-2'>
      {keys.map((key) => {
        const fullTokens = formatNumber(key.tokens, locale)
        return (
          <div
            key={key.id}
            role='group'
            aria-label={key.label}
            className='min-w-0 flex-1 basis-64 rounded-lg border px-4 py-3'
          >
            <div className='flex min-w-0 items-center gap-2'>
              <IconBadge tone='chart-4' size='stat'>
                <KeyRound />
              </IconBadge>
              <span
                className='text-muted-foreground truncate text-sm font-medium'
                title={key.label}
              >
                {key.label}
              </span>
            </div>

            <div
              className='text-foreground mt-2.5 truncate font-mono text-2xl leading-tight font-bold tracking-tight tabular-nums'
              title={fullTokens}
            >
              {formatCompactNumber(key.tokens, locale)}
            </div>
            <div className='text-muted-foreground/60 mt-0.5 text-xs'>
              {t('Tokens')}
            </div>

            <div className='mt-2.5 grid grid-cols-2 gap-2'>
              <div className='bg-muted/40 rounded-md px-2.5 py-1.5'>
                <div className='text-muted-foreground truncate text-xs leading-tight font-medium'>
                  {t('Quota')}
                </div>
                <div className='mt-1 truncate text-sm font-semibold tabular-nums'>
                  {formatQuota(key.quota)}
                </div>
              </div>
              <div className='bg-muted/40 rounded-md px-2.5 py-1.5'>
                <div className='text-muted-foreground truncate text-xs leading-tight font-medium'>
                  {t('Requests')}
                </div>
                <div className='mt-1 truncate text-sm font-semibold tabular-nums'>
                  {formatNumber(key.requests, locale)}
                </div>
              </div>
              <div className='bg-muted/40 rounded-md px-2.5 py-1.5'>
                <div className='text-muted-foreground truncate text-xs leading-tight font-medium'>
                  {t('Average RPM')}
                </div>
                <div className='mt-1 truncate text-sm font-semibold tabular-nums'>
                  {formatNumber(key.requests / minutes, locale)}
                </div>
              </div>
              <div className='bg-muted/40 rounded-md px-2.5 py-1.5'>
                <div className='text-muted-foreground truncate text-xs leading-tight font-medium'>
                  {t('Average TPM')}
                </div>
                <div className='mt-1 truncate text-sm font-semibold tabular-nums'>
                  {formatCompactNumber(key.tokens / minutes, locale)}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
