package rewards

import "testing"

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

func TestGetTier_Boundaries(t *testing.T) {
	tests := []struct {
		name       string
		totalCoins int
		wantName   string
		wantRank   int
	}{
		{"zero coins → Observer", 0, "Observer", 1},
		{"negative coins → Observer", -100, "Observer", 1},
		{"just below Explorer → Observer", 499, "Observer", 1},
		{"exact Explorer threshold → Explorer", 500, "Explorer", 2},
		{"mid Explorer → Explorer", 1999, "Explorer", 2},
		{"exact Navigator threshold → Navigator", 2000, "Navigator", 3},
		{"exact Pilot threshold → Pilot", 5000, "Pilot", 4},
		{"exact Commander threshold → Commander", 15000, "Commander", 5},
		{"exact Captain threshold → Captain", 50000, "Captain", 6},
		{"exact Admiral threshold → Admiral", 150000, "Admiral", 7},
		{"exact Legend threshold → Legend", 500000, "Legend", 8},
		{"far above Legend → Legend", 10000000, "Legend", 8},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := GetTier(tc.totalCoins)
			if got.Name != tc.wantName || got.Rank != tc.wantRank {
				t.Fatalf("GetTier(%d) = {Name: %q, Rank: %d}, want {Name: %q, Rank: %d}",
					tc.totalCoins, got.Name, got.Rank, tc.wantName, tc.wantRank)
			}
		})
	}
}

func TestContributorLevels_Invariants(t *testing.T) {
	if len(ContributorLevels) == 0 {
		t.Fatal("ContributorLevels is empty")
	}

	for i, tier := range ContributorLevels {
		wantRank := i + 1
		if tier.Rank != wantRank {
			t.Errorf("ContributorLevels[%d].Rank = %d, want %d", i, tier.Rank, wantRank)
		}
		if tier.Name == "" || tier.Icon == "" || tier.Color == "" {
			t.Errorf("ContributorLevels[%d] has empty required field", i)
		}
		if i > 0 && tier.MinCoins <= ContributorLevels[i-1].MinCoins {
			t.Errorf("ContributorLevels[%d].MinCoins = %d, not ascending", i, tier.MinCoins)
		}
	}

	if ContributorLevels[0].MinCoins != 0 {
		t.Errorf("ContributorLevels[0].MinCoins = %d, want 0", ContributorLevels[0].MinCoins)
	}
}
