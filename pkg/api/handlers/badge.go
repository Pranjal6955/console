package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/kubestellar/console/pkg/store"
)

type BadgeHandler struct {
	store store.Store
}

func NewBadgeHandler(s store.Store) *BadgeHandler {
	return &BadgeHandler{store: s}
}

// GetBadge returns a dynamic SVG badge for a user.
// GET /api/badge/:username
func (h *BadgeHandler) GetBadge(c *fiber.Ctx) error {
	username := c.Params("username")
	if username == "" {
		return c.Status(fiber.StatusBadRequest).SendString("Username is required")
	}

	// 1. Lookup user
	user, err := h.store.GetUserByGitHubLogin(username)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Database error")
	}

	coins := 0
	if user != nil {
		// 2. Lookup rewards
		rewards, err := h.store.GetUserRewards(user.ID.String())
		if err == nil && rewards != nil {
			coins = rewards.Coins
		}
	}

	// 3. Select level
	level := getLevelForCoins(coins)

	// 4. Generate SVG
	svg := generateBadgeSVG(level.Name, level.Icon, level.Color, coins)

	// 5. Set headers
	c.Set("Content-Type", "image/svg+xml")
	// Cache for 1 hour to ensure fast rendering via GitHub Camo
	c.Set("Cache-Control", "public, max-age=3600, s-maxage=3600")

	return c.SendString(svg)
}

type contributorLevel struct {
	Name     string
	Icon     string
	MinCoins int
	Color    string
}

var contributorLevels = []contributorLevel{
	{Name: "Legend", Icon: "sparkles", MinCoins: 500000, Color: "#facc15"},
	{Name: "Admiral", Icon: "crown", MinCoins: 150000, Color: "#f87171"},
	{Name: "Captain", Icon: "star", MinCoins: 50000, Color: "#fb923c"},
	{Name: "Commander", Icon: "shield", MinCoins: 15000, Color: "#c084fc"},
	{Name: "Pilot", Icon: "rocket", MinCoins: 5000, Color: "#4ade80"},
	{Name: "Navigator", Icon: "map", MinCoins: 2000, Color: "#22d3ee"},
	{Name: "Explorer", Icon: "compass", MinCoins: 500, Color: "#60a5fa"},
	{Name: "Observer", Icon: "telescope", MinCoins: 0, Color: "#94a3b8"},
}

func getLevelForCoins(coins int) contributorLevel {
	for _, l := range contributorLevels {
		if coins >= l.MinCoins {
			return l
		}
	}
	return contributorLevels[len(contributorLevels)-1]
}

func generateBadgeSVG(name, iconName, color string, coins int) string {
	// Design parameters
	width := 160
	height := 28
	borderRadius := 4

	// Legend gradient handling
	bgFill := "rgba(15, 15, 35, 0.8)"
	borderStroke := color
	if name == "Legend" {
		bgFill = "url(#legendGradient)"
	}

	return fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="%d" height="%d" viewBox="0 0 %d %d" fill="none" xmlns="http://www.w3.org/2000/svg">
	<defs>
		<linearGradient id="legendGradient" x1="0" y1="0" x2="160" y2="28" gradientUnits="userSpaceOnUse">
			<stop stop-color="#facc15" stop-opacity="0.2"/>
			<stop offset="0.5" stop-color="#fbbf24" stop-opacity="0.3"/>
			<stop offset="1" stop-color="#f59e0b" stop-opacity="0.2"/>
		</linearGradient>
		<style>
			@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&amp;display=swap');
			.label { font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 400; font-style: italic; fill: #64748b; }
			.value { font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600; fill: %s; }
		</style>
	</defs>

	<!-- Background -->
	<rect width="%d" height="%d" rx="%d" fill="#0a0a1a" />
	<rect x="0.5" y="0.5" width="%d" height="%d" rx="%d" fill="%s" stroke="%s" stroke-opacity="0.3" />

	<!-- Text -->
	<text x="12" y="18" class="label">KubeStellar</text>
	<text x="75" y="18" class="value">%s</text>
</svg>`,
		width, height, width, height,
		color,
		width, height, borderRadius,
		width-1, height-1, borderRadius-1, bgFill, borderStroke,
		name)
}
