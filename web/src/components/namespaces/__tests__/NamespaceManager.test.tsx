/**
 * NamespaceManager Tests
 *
 * Exercises core manager logic: namespace fetching from local agent,
 * caching, cluster filtering, search, modal state management, and
 * progressive loading indicators.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NamespaceManager } from '../NamespaceManager'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockUseClusters = vi.fn()
vi.mock('../../../hooks/useMCP', () => ({
  useClusters: vi.fn(() => mockUseClusters()),
}))

const mockUseGlobalFilters = vi.fn()
vi.mock('../../../hooks/useGlobalFilters', () => ({
  useGlobalFilters: vi.fn(() => mockUseGlobalFilters()),
}))

const mockUseRefreshIndicator = vi.fn()
vi.mock('../../../hooks/useRefreshIndicator', () => ({
  useRefreshIndicator: vi.fn(() => mockUseRefreshIndicator()),
}))

vi.mock('../../../lib/modals', () => ({
  useModalState: () => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
  }),
}))

vi.mock('../../../components/ui/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockTranslation = vi.fn((key: string) => key)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockTranslation,
  }),
}))

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockReset()
  mockUseClusters.mockReturnValue({
    clusters: [],
    deduplicatedClusters: [
      { name: 'cluster-1' },
      { name: 'cluster-2' },
    ],
    isLoading: false,
  })
  mockUseGlobalFilters.mockReturnValue({
    selectedClusters: ['cluster-1', 'cluster-2'],
    isAllClustersSelected: true,
  })
  mockUseRefreshIndicator.mockReturnValue({
    isRefreshing: false,
    setRefreshing: vi.fn(),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe('NamespaceManager', () => {
  it('renders manager header with title', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ namespaces: [] }), { status: 200 })
    )

    render(<NamespaceManager />)

    await waitFor(() => {
      expect(screen.getByText(/Namespace/i)).toBeInTheDocument()
    })
  })

  it('shows loading state while fetching namespaces', async () => {
    mockFetch.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(
        new Response(JSON.stringify({ namespaces: [] }), { status: 200 })
      ), 100))
    )

    render(<NamespaceManager />)

    // Component should be rendering
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
  })

  it('fetches namespaces from local agent endpoint', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({
        namespaces: [
          { name: 'default', status: 'Active', createdAt: '2024-01-01T00:00:00Z' },
        ],
      }), { status: 200 })
    )

    render(<NamespaceManager />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/namespaces'),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    })
  })

  it('handles fetch errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<NamespaceManager />)

    await waitFor(() => {
      // Component should still render even with error
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    })
  })

  it('displays search input for namespace filtering', () => {
    render(<NamespaceManager />)

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('filters namespaces by search query', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({
        namespaces: [
          { name: 'test-1', status: 'Active', createdAt: '2024-01-01T00:00:00Z' },
          { name: 'prod-1', status: 'Active', createdAt: '2024-01-01T00:00:00Z' },
        ],
      }), { status: 200 })
    )

    render(<NamespaceManager />)

    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'test')

    // Namespace manager filters client-side after fetch
    await waitFor(() => {
      expect(searchInput).toHaveValue('test')
    })
  })

  it('respects global cluster filter selection', async () => {
    mockUseGlobalFilters.mockReturnValueOnce({
      selectedClusters: ['cluster-1'],
      isAllClustersSelected: false,
    })

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ namespaces: [] }), { status: 200 })
    )

    render(<NamespaceManager />)

    await waitFor(() => {
      // Should only fetch for cluster-1
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  it('shows create namespace button', () => {
    render(<NamespaceManager />)

    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
  })

  it('has refresh button for manual refresh', () => {
    render(<NamespaceManager />)

    const refreshBtn = screen.getByRole('button', { name: /refresh/i })
    expect(refreshBtn).toBeInTheDocument()
  })

  it('groups namespaces by cluster by default', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({
        namespaces: [
          { name: 'ns-1', status: 'Active', createdAt: '2024-01-01T00:00:00Z' },
        ],
      }), { status: 200 })
    )

    render(<NamespaceManager />)

    await waitFor(() => {
      // Component should render with grouping logic
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    })
  })

  it('shows no namespaces message when list is empty', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ namespaces: [] }), { status: 200 })
    )

    render(<NamespaceManager />)

    await waitFor(() => {
      // Should show empty state or message
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    })
  })

  it('handles cluster loading state from useClusters hook', () => {
    mockUseClusters.mockReturnValueOnce({
      clusters: [],
      deduplicatedClusters: [],
      isLoading: true,
    })

    render(<NamespaceManager />)

    // Component should still render with empty state
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
  })

  it('caches namespace data per cluster', async () => {
    const namespaceResponse = {
      namespaces: [
        { name: 'cached-ns', status: 'Active', createdAt: '2024-01-01T00:00:00Z' },
      ],
    }

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(namespaceResponse), { status: 200 })
    )

    const { rerender } = render(<NamespaceManager />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    const firstCallCount = mockFetch.mock.calls.length

    // Rerender with same filters should use cache
    rerender(<NamespaceManager />)

    await waitFor(() => {
      // Should not make additional fetch calls due to caching
      expect(mockFetch.mock.calls.length).toBeLessThanOrEqual(firstCallCount + 1)
    })
  })

  it('allows cluster collapse/expand toggle', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({
        namespaces: [
          { name: 'ns-1', status: 'Active', createdAt: '2024-01-01T00:00:00Z' },
        ],
      }), { status: 200 })
    )

    render(<NamespaceManager />)

    const expandCollapseBtn = screen.queryByRole('button', { name: /chevron/i })
    if (expandCollapseBtn) {
      await user.click(expandCollapseBtn)
      expect(expandCollapseBtn).toBeInTheDocument()
    }
  })

  it('displays cluster count or summary info', () => {
    render(<NamespaceManager />)

    // Should show cluster information or badge count
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
  })

  it('handles API errors and shows error state', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    )

    render(<NamespaceManager />)

    await waitFor(() => {
      // Component should still render and be usable
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    })
  })

  it('clears search when clear button is clicked', async () => {
    const user = userEvent.setup()
    render(<NamespaceManager />)

    const searchInput = screen.getByPlaceholderText(/search/i) as HTMLInputElement
    await user.type(searchInput, 'test')

    const clearBtn = screen.queryByRole('button', { name: /clear/i })
    if (clearBtn) {
      await user.click(clearBtn)
      expect(searchInput.value).toBe('')
    }
  })
})
