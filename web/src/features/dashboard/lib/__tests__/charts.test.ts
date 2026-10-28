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
import { describe, expect, test } from 'vitest'

import type { QuotaDataItem } from '@/features/dashboard/types'
import { getCurrencyDisplay } from '@/lib/currency'
import type { TimeGranularity } from '@/lib/time'

import { processChartData, processUserChartData } from '../charts'

const cases: Array<{
  granularity: TimeGranularity
  start: string
  interval: number
  labels: string[]
}> = [
  {
    granularity: 'hour',
    start: '2025-12-31T20:00:00',
    interval: 3600,
    labels: [
      '12-31 20:00',
      '12-31 21:00',
      '12-31 22:00',
      '12-31 23:00',
      '01-01 00:00',
      '01-01 01:00',
      '01-01 02:00',
      '01-01 03:00',
    ],
  },
  {
    granularity: 'day',
    start: '2025-12-27T12:00:00',
    interval: 86400,
    labels: [
      '12-27',
      '12-28',
      '12-29',
      '12-30',
      '12-31',
      '01-01',
      '01-02',
      '01-03',
    ],
  },
  {
    granularity: 'week',
    start: '2025-11-29T12:00:00',
    interval: 604800,
    labels: [
      '11-29 - 12-05',
      '12-06 - 12-12',
      '12-13 - 12-19',
      '12-20 - 12-26',
      '12-27 - 01-02',
      '01-03 - 01-09',
      '01-10 - 01-16',
      '01-17 - 01-23',
    ],
  },
]

function unorderedUsage(start: string, interval: number): QuotaDataItem[] {
  const first = new Date(start).getTime() / 1000
  const rows = Array.from({ length: 8 }, (_, i) => ({
    created_at: first + i * interval,
    model_name: 'model-a',
    username: 'alice',
    quota: (i + 1) * 500000,
    count: i + 1,
  }))
  // Same hour, or a second hourly record within the same day/week label.
  const duplicate = {
    ...rows[0],
    created_at: first + (interval === 3600 ? 0 : 3600),
    quota: 5000000,
    count: 10,
  }
  return [
    rows[7],
    rows[2],
    duplicate,
    rows[5],
    rows[0],
    rows[6],
    rows[1],
    rows[4],
    rows[3],
  ]
}

describe.each(cases)('dashboard $granularity chart chronology', (scenario) => {
  test('orders model buckets across New Year while aggregating repeated labels', () => {
    const data = unorderedUsage(scenario.start, scenario.interval)
    const original = structuredClone(data)
    const result = processChartData(data, scenario.granularity)

    for (const key of ['spec_line', 'spec_area', 'spec_model_line'] as const) {
      const values: Array<{ Time: string; rawQuota: number; Count: number }> =
        result[key].data[0].values
      expect(values.map((row) => row.Time)).toEqual(scenario.labels)
      expect(
        values.map((row) =>
          key === 'spec_model_line' ? row.Count : row.rawQuota / 500000
        )
      ).toEqual([11, 2, 3, 4, 5, 6, 7, 8])
    }
    expect(data).toEqual(original)
  })

  test('orders user buckets across New Year while aggregating repeated labels', () => {
    const data = unorderedUsage(scenario.start, scenario.interval)
    const original = structuredClone(data)
    const result = processUserChartData(data, scenario.granularity)
    const values: Array<{ Time: string; rawQuota: number }> =
      result.spec_user_trend.data[0].values

    expect(values.map((row) => row.Time)).toEqual(scenario.labels)
    expect(values.map((row) => row.rawQuota / 500000)).toEqual([
      11, 2, 3, 4, 5, 6, 7, 8,
    ])
    expect(data).toEqual(original)
  })

  test('keeps the existing seven padded model buckets in chronological order', () => {
    const data = [unorderedUsage(scenario.start, scenario.interval)[0]]
    const result = processChartData(data, scenario.granularity)

    for (const key of ['spec_line', 'spec_area', 'spec_model_line'] as const) {
      const values: Array<{ Time: string; rawQuota: number; Count: number }> =
        result[key].data[0].values
      expect(values.map((row) => row.Time)).toEqual(scenario.labels.slice(1))
      expect(
        values.map((row) =>
          key === 'spec_model_line' ? row.Count : row.rawQuota / 500000
        )
      ).toEqual([0, 0, 0, 0, 0, 0, 8])
    }
  })
})

describe('dashboard consumption metric', () => {
  const firstDay = Math.floor(new Date('2026-01-05T00:00:00').getTime() / 1000)
  const secondDay = firstDay + 86400

  // Cache columns are present on purpose: the token view reports recorded
  // prompt+completion usage, so cache reads must not be folded in again.
  const data: QuotaDataItem[] = [
    {
      created_at: firstDay,
      model_name: 'model-a',
      username: 'alice',
      quota: 500000,
      count: 2,
      token_used: 1200,
      cache_read_tokens: 300,
      cache_creation_tokens: 100,
    },
    {
      created_at: firstDay,
      model_name: 'model-b',
      username: 'alice',
      quota: 250000,
      count: 1,
      token_used: 800,
      cache_read_tokens: 0,
      cache_creation_tokens: 0,
    },
    {
      created_at: secondDay,
      model_name: 'model-a',
      username: 'alice',
      quota: 100000,
      count: 1,
      token_used: 500,
      cache_read_tokens: 50,
      cache_creation_tokens: 0,
    },
  ]

  type Point = { Time: string; Model: string; Usage: number; TimeSum: number }

  function areaPoints(metric?: 'quota' | 'tokens'): Point[] {
    const result = processChartData(data, 'day', undefined, undefined, metric)
    return result.spec_area.data[0].values as Point[]
  }

  function dayLabelBeforeLast(points: Point[]): string | undefined {
    const labels = [...new Set(points.map((point) => point.Time))]
    return labels.at(-2)
  }

  test('plots recorded token usage per model when the metric is tokens', () => {
    const points = areaPoints('tokens')
    const firstDayLabel = dayLabelBeforeLast(points)
    const dayPoints = points.filter((point) => point.Time === firstDayLabel)

    expect(
      dayPoints
        .map((point) => [point.Model, point.Usage])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    ).toEqual([
      ['model-a', 1200],
      ['model-b', 800],
    ])
    expect(dayPoints[0].TimeSum).toBe(2000)
  })

  test('keeps cache tokens out of the token total', () => {
    const result = processChartData(data, 'day', undefined, undefined, 'tokens')

    // 1200 + 800 + 500 recorded tokens; the 450 cached tokens are not added.
    expect(result.totalQuotaDisplay).toMatch(/2\.5\s*K/i)
  })

  test('keeps plotting quota money when no metric is given', () => {
    const { config } = getCurrencyDisplay()
    const points = areaPoints()
    const firstDayLabel = dayLabelBeforeLast(points)
    const modelA = points.find(
      (point) => point.Time === firstDayLabel && point.Model === 'model-a'
    )

    expect(modelA?.Usage).toBeCloseTo(500000 / config.quotaPerUnit, 4)
  })
})
