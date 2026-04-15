/**
 * CreateNamespaceModal Tests
 *
 * Exercises namespace creation flow: form validation, cluster selection,
 * team label input, API call to kc-agent, error handling, and discard
 * confirmation on unsaved changes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateNamespaceModal } from '../CreateNamespaceModal'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockAuthFetch = vi.fn()
vi.mock('../../../lib/api', () => ({
  authFetch: vi.fn((...args) => mockAuthFetch(...args)),
}))

const mockTranslation = vi.fn((key: string) => key)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockTranslation,
  }),
}))

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockAuthFetch.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe('CreateNamespaceModal', () => {
  const mockOnClose = vi.fn()
  const mockOnCreated = vi.fn()
  const clusters = ['cluster-1', 'cluster-2', 'cluster-3']

  it('renders with cluster dropdown and form fields', () => {
    render(
      <CreateNamespaceModal
        clusters={clusters}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    expect(screen.getByText('Create Namespace')).toBeInTheDocument()
    expect(screen.getByDisplayValue('cluster-1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('my-namespace')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('platform-team')).toBeInTheDocument()
  })

  it('initializes with first cluster selected', () => {
    render(
      <CreateNamespaceModal
        clusters={clusters}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    const clusterSelect = screen.getByDisplayValue('cluster-1') as HTMLSelectElement
    expect(clusterSelect.value).toBe('cluster-1')
  })

  it('allows cluster selection change', async () => {
    const user = userEvent.setup()
    render(
      <CreateNamespaceModal
        clusters={clusters}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    const clusterSelect = screen.getByDisplayValue('cluster-1') as HTMLSelectElement
    await user.selectOptions(clusterSelect, 'cluster-2')

    expect(clusterSelect.value).toBe('cluster-2')
  })

  it('converts namespace name to lowercase and removes invalid characters', async () => {
    const user = userEvent.setup()
    render(
      <CreateNamespaceModal
        clusters={clusters}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    const nameInput = screen.getByPlaceholderText('my-namespace') as HTMLInputElement
    await user.type(nameInput, 'MyNamespace_With@Symbols')

    // Should be converted to lowercase and special chars removed
    expect(nameInput.value).toBe('mynamespace-with-symbols')
  })

  it('successfully creates namespace with POST to kc-agent', async () => {
    const user = userEvent.setup()
    mockAuthFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))

    render(
      <CreateNamespaceModal
        clusters={clusters}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    const nameInput = screen.getByPlaceholderText('my-namespace')
    const teamInput = screen.getByPlaceholderText('platform-team')
    const createBtn = screen.getByRole('button', { name: /create/i })

    await user.type(nameInput, 'test-ns')
    await user.type(teamInput, 'my-team')
    await user.click(createBtn)

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.stringContaining('/namespaces'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: expect.stringContaining('test-ns'),
        })
      )
    })

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalledWith('cluster-1')
    })
  })

  it('displays error when creation fails', async () => {
    const user = userEvent.setup()
    mockAuthFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Namespace already exists' }), { status: 409 })
    )

    render(
      <CreateNamespaceModal
        clusters={clusters}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    const nameInput = screen.getByPlaceholderText('my-namespace')
    const createBtn = screen.getByRole('button', { name: /create/i })

    await user.type(nameInput, 'existing-ns')
    await user.click(createBtn)

    await waitFor(() => {
      expect(screen.getByText(/Namespace already exists/i)).toBeInTheDocument()
    })
    expect(mockOnCreated).not.toHaveBeenCalled()
  })

  it('disables create button when name or cluster is missing', async () => {
    render(
      <CreateNamespaceModal
        clusters={clusters}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    const createBtn = screen.getByRole('button', { name: /create/i })
    expect(createBtn).toBeDisabled()
  })

  it('shows discard confirmation when closing with unsaved changes', async () => {
    const user = userEvent.setup()
    render(
      <CreateNamespaceModal
        clusters={clusters}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    const nameInput = screen.getByPlaceholderText('my-namespace')
    await user.type(nameInput, 'test-ns')

    const closeBtn = screen.getByRole('button', { name: /cancel/i })
    await user.click(closeBtn)

    await waitFor(() => {
      expect(screen.getByText(/Discard unsaved changes/i)).toBeInTheDocument()
    })
  })

  it('closes without confirmation if form is empty', async () => {
    const user = userEvent.setup()
    render(
      <CreateNamespaceModal
        clusters={clusters}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    const closeBtn = screen.getByRole('button', { name: /cancel/i })
    await user.click(closeBtn)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('includes team label in POST body when provided', async () => {
    const user = userEvent.setup()
    mockAuthFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))

    render(
      <CreateNamespaceModal
        clusters={clusters}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    const nameInput = screen.getByPlaceholderText('my-namespace')
    const teamInput = screen.getByPlaceholderText('platform-team')
    const createBtn = screen.getByRole('button', { name: /create/i })

    await user.type(nameInput, 'test-ns')
    await user.type(teamInput, 'platform-team')
    await user.click(createBtn)

    await waitFor(() => {
      const callBody = mockAuthFetch.mock.calls[0]?.[1]?.body as string
      expect(callBody).toContain('"team":"platform-team"')
    })
  })

  it('disables create button while creation is in progress', async () => {
    const user = userEvent.setup()
    mockAuthFetch.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(new Response(JSON.stringify({}), { status: 200 })), 200))
    )

    render(
      <CreateNamespaceModal
        clusters={clusters}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    const nameInput = screen.getByPlaceholderText('my-namespace')
    const createBtn = screen.getByRole('button', { name: /create/i })

    await user.type(nameInput, 'test-ns')
    await user.click(createBtn)

    expect(createBtn).toBeDisabled()
    expect(screen.getByRole('button', { name: /Creating/i })).toBeInTheDocument()
  })
})
