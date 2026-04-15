/**
 * GrantAccessModal Tests
 *
 * Exercises access grant flow: subject kind selection, subject dropdown,
 * role selection, kc-agent API call, service account namespace field,
 * error handling, and discard confirmation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GrantAccessModal } from '../GrantAccessModal'
import type { NamespaceDetails, NamespaceAccessEntry } from '../types'

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

describe('GrantAccessModal', () => {
  const mockOnClose = vi.fn()
  const mockOnGranted = vi.fn()

  const namespace: NamespaceDetails = {
    name: 'test-ns',
    cluster: 'cluster-1',
    status: 'Active',
    createdAt: new Date().toISOString(),
  }

  const existingAccess: NamespaceAccessEntry[] = [
    {
      bindingName: 'binding-1',
      subjectKind: 'User',
      subjectName: 'admin@example.com',
      roleName: 'admin',
      roleKind: 'ClusterRole',
    },
  ]

  it('renders modal with grant access title and namespace info', () => {
    render(
      <GrantAccessModal
        namespace={namespace}
        existingAccess={existingAccess}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    expect(screen.getByText('Grant Access')).toBeInTheDocument()
    expect(screen.getByText(/test-ns/)).toBeInTheDocument()
  })

  it('renders subject type select defaulting to User', () => {
    render(
      <GrantAccessModal
        namespace={namespace}
        existingAccess={existingAccess}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const typeSelect = screen.getByDisplayValue('User') as HTMLSelectElement
    expect(typeSelect).toBeInTheDocument()
  })

  it('allows subject kind selection change', async () => {
    const user = userEvent.setup()
    render(
      <GrantAccessModal
        namespace={namespace}
        existingAccess={existingAccess}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const typeSelect = screen.getByDisplayValue('User') as HTMLSelectElement
    await user.selectOptions(typeSelect, 'Group')

    expect(typeSelect.value).toBe('Group')
  })

  it('filters out subjects that already have access', async () => {
    const user = userEvent.setup()
    render(
      <GrantAccessModal
        namespace={namespace}
        existingAccess={existingAccess}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const subjectInput = screen.getByPlaceholderText(/Select or type a user/i) as HTMLInputElement
    await user.click(subjectInput)

    // Should not show admin@example.com since it's in existingAccess
    const options = screen.queryAllByText('admin@example.com')
    expect(options.length).toBe(0)
  })

  it('shows service account namespace field when ServiceAccount is selected', async () => {
    const user = userEvent.setup()
    render(
      <GrantAccessModal
        namespace={namespace}
        existingAccess={[]}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const typeSelect = screen.getByDisplayValue('User') as HTMLSelectElement
    await user.selectOptions(typeSelect, 'ServiceAccount')

    expect(screen.getByText(/Service Account Namespace/)).toBeInTheDocument()
  })

  it('does not show service account namespace field for User/Group', async () => {
    const user = userEvent.setup()
    render(
      <GrantAccessModal
        namespace={namespace}
        existingAccess={[]}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const typeSelect = screen.getByDisplayValue('User') as HTMLSelectElement
    await user.selectOptions(typeSelect, 'Group')

    expect(screen.queryByText(/Service Account Namespace/)).not.toBeInTheDocument()
  })

  it('successfully grants access with POST to kc-agent', async () => {
    const user = userEvent.setup()
    mockAuthFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))

    render(
      <GrantAccessModal
        namespace={namespace}
        existingAccess={existingAccess}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const subjectInput = screen.getByPlaceholderText(/Select or type a user/i)
    const roleSelect = screen.getByDisplayValue('admin') as HTMLSelectElement
    const grantBtn = screen.getByRole('button', { name: /grant access/i })

    await user.type(subjectInput, 'developer@example.com')
    await user.selectOptions(roleSelect, 'edit')
    await user.click(grantBtn)

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rolebindings'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('developer@example.com'),
        })
      )
    })

    await waitFor(() => {
      expect(mockOnGranted).toHaveBeenCalled()
    })
  })

  it('displays error when grant fails', async () => {
    const user = userEvent.setup()
    mockAuthFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403 })
    )

    render(
      <GrantAccessModal
        namespace={namespace}
        existingAccess={existingAccess}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const subjectInput = screen.getByPlaceholderText(/Select or type a user/i)
    const grantBtn = screen.getByRole('button', { name: /grant access/i })

    await user.type(subjectInput, 'user@example.com')
    await user.click(grantBtn)

    await waitFor(() => {
      expect(screen.getByText(/Permission denied/i)).toBeInTheDocument()
    })
    expect(mockOnGranted).not.toHaveBeenCalled()
  })

  it('disables grant button when subject name is missing', () => {
    render(
      <GrantAccessModal
        namespace={namespace}
        existingAccess={existingAccess}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const grantBtn = screen.getByRole('button', { name: /grant access/i })
    expect(grantBtn).toBeDisabled()
  })

  it('clears subject when subject kind changes', async () => {
    const user = userEvent.setup()
    render(
      <GrantAccessModal
        namespace={namespace}
        existingAccess={existingAccess}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const subjectInput = screen.getByPlaceholderText(/Select or type a user/i) as HTMLInputElement
    const typeSelect = screen.getByDisplayValue('User') as HTMLSelectElement

    await user.type(subjectInput, 'user@example.com')
    expect(subjectInput.value).toBe('user@example.com')

    await user.selectOptions(typeSelect, 'Group')
    
    // Subject input should be cleared when kind changes
    const newSubjectInput = screen.getByPlaceholderText(/Select or type a group/i) as HTMLInputElement
    expect(newSubjectInput.value).toBe('')
  })

  it('shows discard confirmation when closing with unsaved changes', async () => {
    const user = userEvent.setup()
    render(
      <GrantAccessModal
        namespace={namespace}
        existingAccess={existingAccess}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const subjectInput = screen.getByPlaceholderText(/Select or type a user/i)
    await user.type(subjectInput, 'test@example.com')

    const closeBtn = screen.getByRole('button', { name: /cancel/i })
    await user.click(closeBtn)

    await waitFor(() => {
      expect(screen.getByText(/Discard unsaved changes/i)).toBeInTheDocument()
    })
  })

  it('closes without confirmation if form is empty', async () => {
    const user = userEvent.setup()
    render(
      <GrantAccessModal
        namespace={namespace}
        existingAccess={existingAccess}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const closeBtn = screen.getByRole('button', { name: /cancel/i })
    await user.click(closeBtn)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('includes service account namespace in POST body when provided', async () => {
    const user = userEvent.setup()
    mockAuthFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))

    render(
      <GrantAccessModal
        namespace={namespace}
        existingAccess={[]}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const typeSelect = screen.getByDisplayValue('User') as HTMLSelectElement
    await user.selectOptions(typeSelect, 'ServiceAccount')

    const subjectInput = screen.getByPlaceholderText(/Select or type a service account/i)
    const nsInput = screen.getByPlaceholderText(/kube-system/) as HTMLInputElement
    const grantBtn = screen.getByRole('button', { name: /grant access/i })

    await user.type(subjectInput, 'deployer')
    await user.clear(nsInput)
    await user.type(nsInput, 'argocd')
    await user.click(grantBtn)

    await waitFor(() => {
      const callBody = mockAuthFetch.mock.calls[0]?.[1]?.body as string
      expect(callBody).toContain('argocd')
    })
  })
})
