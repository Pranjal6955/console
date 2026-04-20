// Package rewards is the canonical source for contributor rank tiers.
//
// The contributor ladder (Observer → Explorer → Navigator → Pilot → Commander
// → Captain → Admiral → Legend) was originally defined client-side in
// web/src/types/rewards.ts. Phase 1 of RFC #8862 ports the definition to Go
// so the backend can serve authoritative rank data (e.g. public badge
// endpoint in Phase 2) without the TS and Go copies silently drifting.
//
// The TypeScript side now consumes a generated file at
// web/src/types/rewards.generated.ts (produced by scripts/gen-rewards-types.ts
// from this file). A CI drift check ensures the two stay in lockstep.
//
// See https://github.com/kubestellar/console/issues/8862 for the full RFC.
package rewards

import "math"

// Tier describes a single rung of the contributor ladder. Fields mirror the
// TypeScript ContributorLevel interface at web/src/types/rewards.ts so that
// the generated TS file is a drop-in replacement for the legacy hand-written
// CONTRIBUTOR_LEVELS constant.
type Tier struct {
	// Rank is the ladder position, 1-indexed (Observer = 1, Legend = 8).
	Rank int `json:"rank"`
	// Name is the human-readable tier label used in UI.
	Name string `json:"name"`
	// Icon is the Lucide icon name rendered next to the tier label.
	Icon string `json:"icon"`
	// MinCoins is the inclusive lower bound of the tier's coin range.
	MinCoins int `json:"minCoins"`
	// Color is a Tailwind color prefix (e.g. "gray", "blue") used by
	// callers that compute derived class names at render time.
	Color string `json:"color"`
	// BgClass is the Tailwind background class for the tier badge.
	BgClass string `json:"bgClass"`
	// TextClass is the Tailwind text color class for the tier badge.
	TextClass string `json:"textClass"`
	// BorderClass is the Tailwind border class for the tier badge.
	BorderClass string `json:"borderClass"`
}

// ContributorLevels is the ordered (ascending by MinCoins) list of tiers.
// DO NOT reorder or mutate at runtime — the TS codegen depends on the
// source-file order and existing rank numbers are persisted in user data.
var ContributorLevels = []Tier{
	{
		Rank:        1,
		Name:        "Observer",
		Icon:        "Telescope",
		MinCoins:    0,
		Color:       "gray",
		BgClass:     "bg-gray-500/20",
		TextClass:   "text-muted-foreground",
		BorderClass: "border-gray-500/30",
	},
	{
		Rank:        2,
		Name:        "Explorer",
		Icon:        "Compass",
		MinCoins:    500,
		Color:       "blue",
		BgClass:     "bg-blue-500/20",
		TextClass:   "text-blue-400",
		BorderClass: "border-blue-500/30",
	},
	{
		Rank:        3,
		Name:        "Navigator",
		Icon:        "Map",
		MinCoins:    2000,
		Color:       "cyan",
		BgClass:     "bg-cyan-500/20",
		TextClass:   "text-cyan-400",
		BorderClass: "border-cyan-500/30",
	},
	{
		Rank:        4,
		Name:        "Pilot",
		Icon:        "Rocket",
		MinCoins:    5000,
		Color:       "green",
		BgClass:     "bg-green-500/20",
		TextClass:   "text-green-400",
		BorderClass: "border-green-500/30",
	},
	{
		Rank:        5,
		Name:        "Commander",
		Icon:        "Shield",
		MinCoins:    15000,
		Color:       "purple",
		BgClass:     "bg-purple-500/20",
		TextClass:   "text-purple-400",
		BorderClass: "border-purple-500/30",
	},
	{
		Rank:        6,
		Name:        "Captain",
		Icon:        "Star",
		MinCoins:    50000,
		Color:       "orange",
		BgClass:     "bg-orange-500/20",
		TextClass:   "text-orange-400",
		BorderClass: "border-orange-500/30",
	},
	{
		Rank:        7,
		Name:        "Admiral",
		Icon:        "Crown",
		MinCoins:    150000,
		Color:       "red",
		BgClass:     "bg-red-500/20",
		TextClass:   "text-red-400",
		BorderClass: "border-red-500/30",
	},
	{
		Rank:        8,
		Name:        "Legend",
		Icon:        "Sparkles",
		MinCoins:    500000,
		Color:       "yellow",
		BgClass:     "bg-gradient-to-r from-yellow-400/30 via-amber-300/30 to-yellow-500/30",
		TextClass:   "text-yellow-300",
		BorderClass: "border-yellow-400/50",
	},
}

// ContributorLevelSummary provides progress information for a contributor.
type ContributorLevelSummary struct {
	Current     Tier  `json:"current"`
	Next        *Tier `json:"next"`
	Progress    int   `json:"progress"` // 0-100 percent to next level
	CoinsToNext int   `json:"coinsToNext"`
}

// GetContributorLevel computes the rank details for a given coin total.
// Returns a summary including progress to the next level.
func GetContributorLevel(totalCoins int) ContributorLevelSummary {
	var current Tier = ContributorLevels[0]
	var next *Tier = nil

	for i := len(ContributorLevels) - 1; i >= 0; i-- {
		if totalCoins >= ContributorLevels[i].MinCoins {
			current = ContributorLevels[i]
			if i < len(ContributorLevels)-1 {
				next = &ContributorLevels[i+1]
			}
			break
		}
	}

	if next == nil {
		return ContributorLevelSummary{
			Current:     current,
			Next:        nil,
			Progress:    100,
			CoinsToNext: 0,
		}
	}

	rangeStart := current.MinCoins
	rangeEnd := next.MinCoins
	coinsInRange := totalCoins - rangeStart
	rangeSize := rangeEnd - rangeStart

	progress := int(math.Max(0, math.Min(100, math.Round(float64(coinsInRange)/float64(rangeSize)*100))))
	coinsToNext := rangeEnd - totalCoins

	return ContributorLevelSummary{
		Current:     current,
		Next:        next,
		Progress:    progress,
		CoinsToNext: coinsToNext,
	}
}

// GetTier returns the highest Tier whose MinCoins is ≤ totalCoins.
// Phase 2's badge endpoint is the first Go caller and it has no use for the progress fields.
func GetTier(totalCoins int) Tier {
	current := ContributorLevels[0]
	for i := len(ContributorLevels) - 1; i >= 0; i-- {
		if totalCoins >= ContributorLevels[i].MinCoins {
			current = ContributorLevels[i]
			break
		}
	}
	return current
}
