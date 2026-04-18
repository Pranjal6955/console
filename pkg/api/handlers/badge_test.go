package handlers

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/kubestellar/console/pkg/models"
	"github.com/kubestellar/console/pkg/store"
	"github.com/kubestellar/console/pkg/test"
	"github.com/stretchr/testify/assert"
)

func TestGetBadge(t *testing.T) {
	env := setupTestEnv(t)
	mockStore := env.Store.(*test.MockStore)

	h := NewBadgeHandler(mockStore)
	env.App.Get("/api/badge/:username", h.GetBadge)

	testUserID := uuid.New()
	testUsername := "test-user"

	tests := []struct {
		name          string
		username      string
		mockUser      *models.User
		mockRewards   *store.UserRewards
		expectedCode  int
		contentChecks []string
	}{
		{
			name:     "Success - Pilot rank",
			username: testUsername,
			mockUser: &models.User{
				ID:          testUserID,
				GitHubLogin: testUsername,
			},
			mockRewards: &store.UserRewards{
				UserID: testUserID.String(),
				Coins:  5500, // Pilot
			},
			expectedCode: http.StatusOK,
			contentChecks: []string{
				"KubeStellar",
				"Pilot",
				"#4ade80", // Pilot color
			},
		},
		{
			name:     "Success - Legend rank",
			username: testUsername,
			mockUser: &models.User{
				ID:          testUserID,
				GitHubLogin: testUsername,
			},
			mockRewards: &store.UserRewards{
				UserID: testUserID.String(),
				Coins:  600000, // Legend
			},
			expectedCode: http.StatusOK,
			contentChecks: []string{
				"Legend",
				"#facc15", // Legend color
				"url(#legendGradient)",
			},
		},
		{
			name:         "User not found - Default Observer",
			username:     "unknown-user",
			mockUser:     nil,
			expectedCode: http.StatusOK,
			contentChecks: []string{
				"KubeStellar",
				"Observer",
			},
		},
		{
			name:         "Missing username",
			username:     "",
			expectedCode: http.StatusNotFound, // Fiber won't match the route
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mocks
			if tt.username != "" {
				mockStore.ExpectedCalls = nil // Clear previous
				mockStore.On("GetUserByGitHubLogin", tt.username).Return(tt.mockUser, nil)
				if tt.mockUser != nil {
					mockStore.On("GetUserRewards", tt.mockUser.ID.String()).Return(tt.mockRewards, nil)
				}
			}

			req := httptest.NewRequest("GET", fmt.Sprintf("/api/badge/%s", tt.username), nil)
			resp, _ := env.App.Test(req)

			assert.Equal(t, tt.expectedCode, resp.StatusCode)
			if tt.expectedCode == http.StatusOK {
				assert.Equal(t, "image/svg+xml", resp.Header.Get("Content-Type"))
				assert.Contains(t, resp.Header.Get("Cache-Control"), "public")

				// Read body correctly
				bodyBytes, _ := io.ReadAll(resp.Body)
				body := string(bodyBytes)
				for _, check := range tt.contentChecks {
					assert.Contains(t, body, check)
				}
			}
		})
	}
}
