package rewards

import (
	"testing"
)

func TestGetContributorLevel(t *testing.T) {
	tests := []struct {
		coins    int
		expected string
		progress int
	}{
		{0, "Observer", 0},
		{100, "Observer", 20},
		{500, "Explorer", 0},
		{1000, "Explorer", 33}, // (1000-500)/(2000-500) = 500/1500 = 33.33%
		{2000, "Navigator", 0},
		{5000, "Pilot", 0},
		{15000, "Commander", 0},
		{50000, "Captain", 0},
		{150000, "Admiral", 0},
		{500000, "Legend", 100},
		{1000000, "Legend", 100},
	}

	for _, tt := range tests {
		res := GetContributorLevel(tt.coins)
		if res.Current.Name != tt.expected {
			t.Errorf("GetContributorLevel(%d) expected %s, got %s", tt.coins, tt.expected, res.Current.Name)
		}
		if res.Progress != tt.progress {
			t.Errorf("GetContributorLevel(%d) expected progress %d, got %d", tt.coins, tt.progress, res.Progress)
		}
	}
}
