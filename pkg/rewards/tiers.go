package rewards

import "math"

// ContributorLevel defines a rank in the contributor ladder.
type ContributorLevel struct {
	Rank        int    `json:"rank"`
	Name        string `json:"name"`
	Icon        string `json:"icon"` // Lucide icon name
	MinCoins    int    `json:"minCoins"`
	Color       string `json:"color"`       // Tailwind color prefix
	BgClass     string `json:"bgClass"`     // CSS class for background
	TextClass   string `json:"textClass"`   // CSS class for text
	BorderClass string `json:"borderClass"` // CSS class for border
}

// ContributorLevels is the canonical list of contributor ranks.
var ContributorLevels = []ContributorLevel{
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
	Current     ContributorLevel  `json:"current"`
	Next        *ContributorLevel `json:"next"`
	Progress    int               `json:"progress"` // 0-100 percent to next level
	CoinsToNext int               `json:"coinsToNext"`
}

// GetContributorLevel computes the rank details for a given coin total.
func GetContributorLevel(totalCoins int) ContributorLevelSummary {
	var current ContributorLevel = ContributorLevels[0]
	var next *ContributorLevel = nil

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
