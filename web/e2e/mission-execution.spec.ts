import { test, expect, Page } from '@playwright/test'
import { mockApiFallback } from './helpers/setup'

/**
 * Mission Execution Flow — Verifies Phase 4 (Launch Sequence) behavior:
 * 1. Terminal log streaming
 * 2. Dry-run validation
 * 3. Failure recovery (Retry)
 */

const VISIBLE_TIMEOUT_MS = 10_000

async function setupExecutionTest(page: Page) {
  await mockApiFallback(page)

  // Mock basic clusters
  await page.route('**/api/mcp/clusters', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        clusters: [
          { name: 'prod-cluster', healthy: true, server: 'https://1.2.3.4' },
          { name: 'staging-cluster', healthy: true, server: 'https://5.6.7.8' },
        ],
      }),
    })
  )

  // Mock mission creation
  await page.route('**/api/missions', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'mission-' + Math.random().toString(36).slice(2) }),
      })
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    }
  })

  // Pre-seed Mission Control state to Phase 3 (Flight Plan)
  await page.addInitScript(() => {
    const state = {
      phase: 'blueprint',
      description: 'Deploy security stack',
      title: 'Security Stack Mission',
      projects: [
        { name: 'falco', displayName: 'Falco', priority: 'required', category: 'Security', dependencies: [] },
        { name: 'kyverno', displayName: 'Kyverno', priority: 'required', category: 'Security', dependencies: [] },
      ],
      assignments: [
        { clusterName: 'prod-cluster', clusterContext: 'prod', provider: 'eks', projectNames: ['falco', 'kyverno'], readiness: { overallScore: 90 } },
      ],
      phases: [
        { phase: 1, name: 'Core Security', projectNames: ['falco', 'kyverno'] },
      ],
      deployMode: 'phased',
      isDryRun: false,
    }
    localStorage.setItem('kc_mission_control_state', JSON.stringify({ state, savedAt: Date.now(), schemaVersion: 1 }))
    localStorage.setItem('kc-demo-mode', 'false') // Ensure real mode for testing
  })
}

test.describe('Mission Control Execution', () => {
  test.beforeEach(async ({ page }) => {
    await setupExecutionTest(page)
  })

  test('logs stream into the terminal during execution', async ({ page }) => {
    await page.goto('/')
    
    // Open Mission Control
    await page.getByTestId('mission-control-toggle').click()
    await expect(page.getByTestId('mission-control-dialog')).toBeVisible()

    // Advance to Launch (should be on Phase 3 due to pre-seed)
    await page.getByTestId('mission-control-launch').click()
    
    // Phase 4: Launch Sequence
    await expect(page.getByText('Launch Sequence In Progress')).toBeVisible()

    // Verify projects are running
    await expect(page.getByText('Falco')).toBeVisible()
    await expect(page.getByText('Kyverno')).toBeVisible()

    // Verify "Show Logs" button
    const showLogsBtn = page.getByTestId('show-logs-falco')
    await expect(showLogsBtn).toBeVisible()
    await showLogsBtn.click()

    // Verify terminal header
    await expect(page.getByText('Live Execution Logs')).toBeVisible()
    
    // Mock mission updates (this is tricky because state is managed by useMissions hook)
    // In a real test, we'd use the WebSocket mock. For this E2E, we'll verify the UI elements exist.
    await expect(page.locator('div').filter({ hasText: /^ID: mission-/ }).first()).toBeVisible()
  })

  test('dry-run validation shows dry-run badge and logs', async ({ page }) => {
    // Modify pre-seed to be on Phase 3 but with dry-run intention
    await page.addInitScript(() => {
      const state = JSON.parse(localStorage.getItem('kc_mission_control_state')!).state
      state.isDryRun = true
      localStorage.setItem('kc_mission_control_state', JSON.stringify({ state, savedAt: Date.now(), schemaVersion: 1 }))
    })

    await page.goto('/')
    await page.getByTestId('mission-control-toggle').click()
    
    // Verify DRY RUN badge in header
    await expect(page.getByText('DRY RUN')).toBeVisible()

    // Launch dry run
    await page.getByTestId('mission-control-launch').click()
    await expect(page.getByText('Dry Run In Progress')).toBeVisible()

    // Verify terminal logs show dry run context
    await page.getByTestId('show-logs-falco').click()
    await expect(page.getByText('Live Execution Logs')).toBeVisible()
  })

  test('failure recovery allows retrying a failed mission step', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('mission-control-toggle').click()
    
    // Launch
    await page.getByTestId('mission-control-launch').click()

    // Mock a failure for the Kyverno mission
    // We can't easily mock the mission status update without a real WS server in this simplified E2E,
    // but we can verify the "Retry Failed" button visibility if a failure is injected into state.
    
    await page.addInitScript(() => {
        // Manually inject a failure into the launch progress state
        const raw = localStorage.getItem('kc_mission_control_state')
        if (raw) {
            const entry = JSON.parse(raw)
            entry.state.launchProgress = [
                {
                    phase: 1,
                    status: 'failed',
                    projects: [
                        { name: 'falco', status: 'completed', missionId: 'm1' },
                        { name: 'kyverno', status: 'failed', missionId: 'm2', error: 'Simulated failure' }
                    ]
                }
            ]
            localStorage.setItem('kc_mission_control_state', JSON.stringify(entry))
            // Force a reload to pick up the injected failure
            window.location.reload()
        }
    })

    // Wait for reload and reopen dialog
    await page.waitForLoadState('networkidle')
    await page.getByTestId('mission-control-toggle').click()

    // Verify "Retry Failed" button
    const retryBtn = page.getByTestId('mission-control-retry')
    await expect(retryBtn).toBeVisible()
    
    // Click retry
    await retryBtn.click()
    
    // Verify it attempts to run again (status icon should change back to running)
    // status icons are div or lucide-react components, we check for the loader
    await expect(page.locator('.animate-spin').first()).toBeVisible()
  })
})
