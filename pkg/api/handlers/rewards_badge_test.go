package handlers

import (
	"errors"
	"io"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/kubestellar/console/pkg/rewards"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeBadgeFetcher is a test double for badgeRewardsFetcher.
type fakeBadgeFetcher struct {
	points   map[string]int
	unknown  map[string]bool
	errorFor map[string]error
	lastHit  bool
}

func (f *fakeBadgeFetcher) fetchUserRewardsForBadge(login string) (*GitHubRewardsResponse, bool, error) {
	if err, ok := f.errorFor[login]; ok {
		return nil, f.lastHit, err
	}
	if f.unknown[login] {
		return nil, f.lastHit, errBadgeUnknownLogin
	}
	if pts, ok := f.points[login]; ok {
		return &GitHubRewardsResponse{TotalPoints: pts}, f.lastHit, nil
	}
	return nil, f.lastHit, errBadgeUnknownLogin
}

func newBadgeTestApp(fetcher badgeRewardsFetcher) *fiber.App {
	app := fiber.New()
	h := NewBadgeHandler(fetcher)
	app.Get("/api/rewards/badge/:github_login", h.GetBadge)
	return app
}

func TestBadgeHandler_KnownLogin_RendersPremiumSVG(t *testing.T) {
	const pilotCoins = 5000
	const expectedTierName = "Pilot"

	fetcher := &fakeBadgeFetcher{
		points:  map[string]int{"alice": pilotCoins},
		lastHit: false,
	}
	app := newBadgeTestApp(fetcher)

	req, _ := http.NewRequest("GET", "/api/rewards/badge/alice", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "image/svg+xml", resp.Header.Get("Content-Type"))

	body, _ := io.ReadAll(resp.Body)
	svg := string(body)
	assert.Contains(t, svg, "<svg")
	assert.Contains(t, svg, "KubeStellar")
	assert.Contains(t, svg, expectedTierName)
	assert.Contains(t, svg, "5000 pts")
}

func TestBadgeHandler_UnknownLogin_RendersUnknownSVG(t *testing.T) {
	fetcher := &fakeBadgeFetcher{
		unknown: map[string]bool{"nobody": true},
	}
	app := newBadgeTestApp(fetcher)

	req, _ := http.NewRequest("GET", "/api/rewards/badge/nobody", nil)
	resp, _ := app.Test(req)

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	body, _ := io.ReadAll(resp.Body)
	assert.Contains(t, string(body), "Unknown")
}

func TestBadgeHandler_UpstreamError_RendersErrorSVG(t *testing.T) {
	fetcher := &fakeBadgeFetcher{
		errorFor: map[string]error{"broken": errors.New("upstream failed")},
	}
	app := newBadgeTestApp(fetcher)

	req, _ := http.NewRequest("GET", "/api/rewards/badge/broken", nil)
	resp, _ := app.Test(req)

	assert.Equal(t, http.StatusBadGateway, resp.StatusCode)
	body, _ := io.ReadAll(resp.Body)
	assert.Contains(t, string(body), "Upstream Error")
}

func TestGenerateBadgeSVG_Legend(t *testing.T) {
	tier := rewards.ContributorLevels[len(rewards.ContributorLevels)-1] // Legend
	svg := generateBadgeSVG(tier, 1000000)

	assert.Contains(t, svg, "Legend")
	assert.Contains(t, svg, "1000000 pts")
	assert.Contains(t, svg, "url(#legendGradient)")
}
