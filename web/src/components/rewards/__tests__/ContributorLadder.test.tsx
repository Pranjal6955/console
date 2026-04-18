import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ContributorBanner } from '../ContributorLadder'

// Mocking dependencies
vi.mock('../../../hooks/useRewards', () => ({
    useRewards: () => ({
        totalCoins: 5500, // Pilot rank
        githubPoints: 100,
        githubRewards: [],
        isGitHubRefreshing: false,
        refreshGitHub: vi.fn(),
    }),
}))

vi.mock('../../../lib/auth', () => ({
    useAuth: () => ({
        user: { github_login: 'test-user' },
    }),
}))

vi.mock('../../../lib/analytics', () => ({
    emitLinkedInShare: vi.fn(),
}))

// Mocking window.location
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'location', {
        value: {
            origin: 'http://localhost:5174',
        },
        writable: true,
    })
}

// Mocking navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
    value: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
    },
})

describe('ContributorBanner', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the contributor rank and coins', () => {
        render(<ContributorBanner />)
        expect(screen.getAllByText('Pilot').length).toBeGreaterThan(0)
        expect(screen.getByText('5,500')).toBeTruthy()
    })

    it('toggles the Badge Integration panel', () => {
        render(<ContributorBanner />)

        // Panel should hidden by default
        expect(screen.queryByText('GitHub Integration')).toBeNull()

        // Click the toggle button (it's the one with "Badge" text based on my redesign)
        const badgeToggle = screen.getByText('Badge')
        fireEvent.click(badgeToggle)

        // Panel should now be visible
        expect(screen.getByText('GitHub Integration')).toBeTruthy()
        expect(screen.getByText('Copy Badge Snippet')).toBeTruthy()
    })

    it('copies markdown snippet to clipboard', async () => {
        render(<ContributorBanner />)

        // Open panel
        fireEvent.click(screen.getByText('Badge'))

        // Find and click copy button (find by title)
        const copyButton = screen.getByTitle('Copy Markdown')
        fireEvent.click(copyButton)

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            expect.stringContaining('http://localhost:5174/api/badge/test-user')
        )
    })

    it('opens external GitHub profile when "Open Profile README" is clicked', () => {
        const windowSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

        render(<ContributorBanner />)
        fireEvent.click(screen.getByText('Badge'))

        const githubButton = screen.getByText('Open Profile README')
        fireEvent.click(githubButton)

        expect(windowSpy).toHaveBeenCalledWith(
            'https://github.com/test-user/test-user/edit/main/README.md',
            '_blank',
            'noopener,noreferrer'
        )
    })
})
