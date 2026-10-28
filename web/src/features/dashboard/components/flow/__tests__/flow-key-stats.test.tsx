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
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import type { DashboardFlowNode } from '@/features/dashboard/types'

import { FlowKeyStats } from '../flow-key-stats'

function node(
  id: string,
  label: string,
  kind: DashboardFlowNode['kind'],
  tokens: number,
  requests: number
): DashboardFlowNode {
  return {
    id,
    label,
    kind,
    value: tokens,
    requests,
    quota: tokens / 5,
    tokens,
    color: '#000000',
    colorKey: id,
  }
}

const nodes: DashboardFlowNode[] = [
  node('token:1', 'qq-bot', 'token', 5309608370, 1896289),
  node('token:2', 'open-webui', 'token', 2228257313, 795806),
  node('user:1', 'demo', 'user', 9999999999, 1),
]

describe('flow key stats', () => {
  test('ranks api keys by token usage and ignores other stages', () => {
    render(<FlowKeyStats nodes={nodes} timeRangeMinutes={1440} />)

    const cards = screen.getAllByRole('group')
    expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
      'qq-bot',
      'open-webui',
    ])
    expect(screen.queryByText('demo')).not.toBeInTheDocument()
  })

  test('shows token totals and per-minute rates for the selected range', () => {
    render(<FlowKeyStats nodes={nodes} timeRangeMinutes={1440} />)

    expect(screen.getByText('5.3B')).toBeInTheDocument()
    expect(screen.getByText('2.2B')).toBeInTheDocument()
    // 1,896,289 requests over 1440 minutes
    expect(screen.getByText('1,316.87')).toBeInTheDocument()
    // 5,309,608,370 tokens over 1440 minutes
    expect(screen.getByText('3.7M')).toBeInTheDocument()
  })

  test('keeps the merged overflow bucket after the real keys', () => {
    render(
      <FlowKeyStats
        nodes={[
          node('token:__other__', 'Other tokens', 'token', 9999, 10),
          node('token:1', 'qq-bot', 'token', 100, 1),
          node('token:2', 'open-webui', 'token', 200, 2),
        ]}
        timeRangeMinutes={60}
      />
    )

    const cards = screen.getAllByRole('group')
    expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
      'open-webui',
      'qq-bot',
      'Other tokens',
    ])
  })

  test('renders nothing when the token stage has no nodes', () => {
    const { container } = render(
      <FlowKeyStats
        nodes={[node('user:1', 'demo', 'user', 10, 1)]}
        timeRangeMinutes={60}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })
})
