package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/kubestellar/console/pkg/rewards"
)

// colorToHex maps Tailwind color names to their premium hex representatives.
var colorToHex = map[string]string{
	"gray":   "#94a3b8", // slate-400
	"blue":   "#60a5fa", // blue-400
	"cyan":   "#22d3ee", // cyan-400
	"green":  "#4ade80", // green-400
	"purple": "#c084fc", // purple-400
	"orange": "#fb923c", // orange-400
	"red":    "#f87171", // red-400
	"yellow": "#facc15", // yellow-400
}

// innerIconSVG contains the inner content (paths, circles) of Lucide icons.
var innerIconSVG = map[string]string{
	"Telescope": `<path d="m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44" /><path d="m13.56 11.747 4.332-.924" /><path d="m16 21-3.105-6.21" /><path d="M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z" /><path d="m6.158 8.633 1.114 4.456" /><path d="m8 21 3.105-6.21" /><circle cx="12" cy="13" r="2" />`,
	"Compass":   `<circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" />`,
	"Map":       `<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" /><path d="M15 5.764v15" /><path d="M9 3.236v15" />`,
	"Rocket":    `<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09" /><path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05" />`,
	"Shield":    `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />`,
	"Star":      `<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />`,
	"Crown":     `<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" /><path d="M5 21h14" />`,
	"Sparkles":  `<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" />`,
}

// Badge rendering + transport constants.
const (
	badgeContentType         = "image/svg+xml; charset=utf-8"
	badgeCacheControlSuccess = "public, max-age=3600"
	badgeCacheControlError   = "no-store"
	badgeLoginHashPrefixLen  = 12
	badgeUnknownTierName     = "Unknown"
	badgeErrorTierName       = "Error"
)

// badgeRewardsFetcher is the narrow seam BadgeHandler depends on.
type badgeRewardsFetcher interface {
	fetchUserRewardsForBadge(login string) (resp *GitHubRewardsResponse, cacheHit bool, err error)
}

// errBadgeUnknownLogin signals an empty/404 upstream.
var errBadgeUnknownLogin = errors.New("unknown github login")

// fetchUserRewardsForBadge adapts RewardsHandler to badgeRewardsFetcher.
func (h *RewardsHandler) fetchUserRewardsForBadge(login string) (*GitHubRewardsResponse, bool, error) {
	h.mu.RLock()
	if entry, ok := h.cache[login]; ok && time.Since(entry.fetchedAt) < rewardsCacheTTL {
		h.mu.RUnlock()
		resp := *entry.response
		return &resp, true, nil
	}
	h.mu.RUnlock()

	token := h.resolveToken()
	resp, err := h.fetchUserRewards(login, token)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "404") || strings.Contains(msg, "422") {
			return nil, false, errBadgeUnknownLogin
		}
		return nil, false, err
	}

	h.mu.Lock()
	h.cache[login] = &rewardsCacheEntry{
		response:  resp,
		fetchedAt: time.Now(),
	}
	h.mu.Unlock()

	return resp, false, nil
}

// BadgeHandler serves the public contributor-tier badge SVG.
type BadgeHandler struct {
	fetcher badgeRewardsFetcher
}

// NewBadgeHandler wraps a fetcher (usually *RewardsHandler) and exposes
// GetBadge.
func NewBadgeHandler(fetcher badgeRewardsFetcher) *BadgeHandler {
	return &BadgeHandler{fetcher: fetcher}
}

// GetBadge renders an SVG tier badge for :github_login (public, rate-limited).
func (h *BadgeHandler) GetBadge(c *fiber.Ctx) error {
	login := strings.TrimSpace(c.Params("github_login"))
	if login == "" {
		return h.renderErrorSVG(c, fiber.StatusBadGateway, "Login Required", "#e05d44")
	}

	resp, cacheHit, err := h.fetcher.fetchUserRewardsForBadge(login)
	if errors.Is(err, errBadgeUnknownLogin) {
		emitBadgeFetchedEvent(login, badgeUnknownTierName, cacheHit)
		return h.renderBadge(c, rewards.Tier{Name: badgeUnknownTierName, Color: "gray"}, 0)
	} else if err != nil {
		slog.Error("[rewards/badge] upstream fetch failed", "login", login, "error", err)
		emitBadgeFetchedEvent(login, badgeErrorTierName, cacheHit)
		return h.renderErrorSVG(c, fiber.StatusBadGateway, "Upstream Error", "#e05d44")
	}

	points := resp.TotalPoints
	tier := rewards.GetTier(points)

	emitBadgeFetchedEvent(login, tier.Name, cacheHit)

	c.Set("Content-Type", "image/svg+xml")
	c.Set("Cache-Control", badgeCacheControlSuccess)
	// Use the logic from HEAD for ETag and response
	c.Set("ETag", fmt.Sprintf(`"tier-%s-%s"`, tier.Name, login))

	svg := generateBadgeSVG(tier, points)
	return c.SendString(svg)
}

func (h *BadgeHandler) renderBadge(c *fiber.Ctx, tier rewards.Tier, points int) error {
	c.Set("Content-Type", "image/svg+xml")
	c.Set("Cache-Control", badgeCacheControlSuccess)
	return c.SendString(generateBadgeSVG(tier, points))
}

func (h *BadgeHandler) renderErrorSVG(c *fiber.Ctx, status int, msg string, color string) error {
	c.Set("Content-Type", "image/svg+xml")
	c.Set("Cache-Control", badgeCacheControlError)
	// Fallback minimal error badge using premium styles
	svg := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="240" height="40" viewBox="0 0 240 40" fill="none" xmlns="http://www.w3.org/2000/svg">
	<rect width="240" height="40" rx="8" fill="#03030b" />
	<text x="24" y="24" font-family="Inter, sans-serif" font-size="10" font-weight="700" fill="#6366f1">KubeStellar</text>
	<text x="112" y="24" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="%s">%s</text>
</svg>`, color, msg)
	return c.Status(status).SendString(svg)
}

func generateBadgeSVG(tier rewards.Tier, points int) string {
	width := 240
	height := 40
	borderRadius := 8

	hexColor := colorToHex[tier.Color]
	if hexColor == "" {
		hexColor = "#94a3b8"
	}

	iconContent := innerIconSVG[tier.Icon]
	if iconContent == "" {
		iconContent = innerIconSVG["Star"]
	}

	bgFill := "rgba(10, 10, 26, 0.95)"
	borderOpacity := "0.2"
	if tier.Name == "Legend" {
		bgFill = "url(#legendGradient)"
		borderOpacity = "0.4"
	}

	return fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="%d" height="%d" viewBox="0 0 %d %d" fill="none" xmlns="http://www.w3.org/2000/svg">
	<defs>
		<linearGradient id="legendGradient" x1="0" y1="0" x2="%d" y2="%d" gradientUnits="userSpaceOnUse">
			<stop stop-color="#facc15" stop-opacity="0.15"/>
			<stop offset="0.5" stop-color="#fbbf24" stop-opacity="0.25"/>
			<stop offset="1" stop-color="#f59e0b" stop-opacity="0.15"/>
		</linearGradient>
		<style>
			@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;display=swap');
			.brand { font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; fill: #6366f1; text-transform: uppercase; letter-spacing: 1px; }
			.rank { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; fill: %s; }
			.score { font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 400; fill: #64748b; }
		</style>
	</defs>

	<!-- Background -->
	<rect width="%d" height="%d" rx="%d" fill="#03030b" />
	<rect x="0.5" y="0.5" width="%d" height="%d" rx="%d" fill="%s" stroke="%s" stroke-opacity="%s" />

	<!-- Left Panel: Brand -->
	<path d="M12 12l2 2 4-4" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8" />
	<text x="24" y="24" class="brand">KubeStellar</text>

	<!-- Divider -->
	<line x1="100" y1="10" x2="100" y2="30" stroke="#1e293b" />

	<!-- Right Panel: Rank + Icon -->
	<g transform="translate(112, 10)">
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="%s" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			%s
		</svg>
		<text x="28" y="15" class="rank">%s</text>
		<text x="28" y="26" class="score">%d pts</text>
	</g>
</svg>`,
		width, height, width, height,
		width, height,
		hexColor,
		width, height, borderRadius,
		width-1, height-1, borderRadius-1, bgFill, hexColor, borderOpacity,
		hexColor, iconContent, tier.Name, points)
}

func emitBadgeFetchedEvent(githubLogin, tierName string, cacheHit bool) {
	hash := sha256.Sum256([]byte(githubLogin))
	loginHash := hex.EncodeToString(hash[:])[:12]

	realMeasurementID := ga4RealMeasurementID()
	if realMeasurementID != "" {
		payload := url.Values{}
		payload.Set("v", "2")
		payload.Set("tid", realMeasurementID)
		payload.Set("en", "badge_fetched")
		payload.Set("ep.tier", tierName)
		payload.Set("ep.login_hash", loginHash)
		payload.Set("ep.cache_hit", fmt.Sprintf("%v", cacheHit))

		go func() {
			target := "https://www.google-analytics.com/g/collect"
			_, _ = analyticsClient.PostForm(target, payload)
		}()
	}

	slog.Debug(
		"[rewards/badge] badge_fetched",
		"tier", tierName,
		"login_hashed", loginHash,
		"cache_hit", cacheHit,
	)
}
