package handlers

import (
	"io"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/kubestellar/console/pkg/rewards"
	"github.com/stretchr/testify/assert"
)

func TestGetContributorBadge(t *testing.T) {
	app := fiber.New()
	handler := NewRewardsHandler(RewardsConfig{})

	app.Get("/api/rewards/badge/:github_login", handler.GetContributorBadge)

	t.Run("Unknown User returns Observer", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/rewards/badge/unknown-user", nil)
		resp, _ := app.Test(req)

		assert.Equal(t, 200, resp.StatusCode)
		assert.Equal(t, "image/svg+xml", resp.Header.Get("Content-Type"))

		body, _ := io.ReadAll(resp.Body)
		assert.Contains(t, string(body), "Observer")
		assert.Contains(t, string(body), "0 pts")
	})

	t.Run("Cached User returns correct tier", func(t *testing.T) {
		handler.mu.Lock()
		handler.cache["top-contributor"] = &rewardsCacheEntry{
			response: &GitHubRewardsResponse{
				TotalPoints: 500000,
			},
			fetchedAt: time.Now(),
		}
		handler.mu.Unlock()

		req := httptest.NewRequest("GET", "/api/rewards/badge/top-contributor", nil)
		resp, _ := app.Test(req)

		assert.Equal(t, 200, resp.StatusCode)
		body, _ := io.ReadAll(resp.Body)
		assert.Contains(t, string(body), "Legend")
		assert.Contains(t, string(body), "500000 pts")
	})
}

func TestGenerateBadgeSVG(t *testing.T) {
	level := rewards.ContributorLevels[len(rewards.ContributorLevels)-1] // Legend
	svg := generateBadgeSVG(level, 1000000)

	assert.Contains(t, svg, "<svg")
	assert.Contains(t, svg, "Legend")
	assert.Contains(t, svg, "1000000 pts")
	assert.Contains(t, svg, "url(#legendGradient)") // Legend specific
}
