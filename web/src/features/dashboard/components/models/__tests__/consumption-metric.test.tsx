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
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { QuotaDataItem } from '@/features/dashboard/types'

import { ConsumptionDistributionChart } from '../consumption-distribution-chart'

vi.mock('@visactor/react-vchart', () => ({
  VChart: () => <div data-testid='vchart' />,
}))

vi.mock('@visactor/vchart', () => ({
  ThemeManager: { setCurrentTheme: vi.fn() },
}))

const STORAGE_KEY = 'dashboard_consumption_metric'

const data: QuotaDataItem[] = [
  {
    created_at: Math.floor(new Date('2026-01-05T00:00:00').getTime() / 1000),
    model_name: 'model-a',
    quota: 500000,
    count: 1,
    token_used: 1200,
  },
]

describe('consumption distribution metric switcher', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  test('defaults to the token view and switches to quota on click', async () => {
    const user = userEvent.setup()
    render(<ConsumptionDistributionChart data={data} />)

    const tokenButton = screen.getByRole('button', { name: 'Tokens' })
    expect(tokenButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Token Distribution')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quota' }))

    expect(screen.getByRole('button', { name: 'Quota' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(tokenButton).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Quota Distribution')).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('quota')
  })

  test('restores the saved quota preference on the next visit', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'quota')
    render(<ConsumptionDistributionChart data={data} />)

    expect(screen.getByText('Quota Distribution')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quota' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })
})
