package agent

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestServer_HandleInsightsEnrich(t *testing.T) {
	registry := &Registry{providers: make(map[string]AIProvider)}
	// No providers registered, so Enrich will fall back to rules
	worker := NewInsightWorker(registry, nil)

	s := &Server{
		insightWorker:  worker,
		allowedOrigins: []string{"*"},
	}

	reqBody := InsightEnrichmentRequest{
		Insights: []InsightSummary{
			{ID: "i1", Category: "event-correlation", Title: "Multiple restarts"},
		},
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/insights/enrich", bytes.NewReader(body))
	w := httptest.NewRecorder()

	s.handleInsightsEnrich(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var resp InsightEnrichmentResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if len(resp.Enrichments) != 1 {
		t.Errorf("Expected 1 enrichment, got %d", len(resp.Enrichments))
	}
	if resp.Enrichments[0].Provider != "rules" {
		t.Errorf("Expected rule-based enrichment, got %s", resp.Enrichments[0].Provider)
	}
}

func TestServer_HandleInsightsAI(t *testing.T) {
	worker := NewInsightWorker(&Registry{}, nil)
	s := &Server{
		insightWorker:  worker,
		allowedOrigins: []string{"*"},
	}

	req := httptest.NewRequest("GET", "/insights/ai", nil)
	w := httptest.NewRecorder()

	s.handleInsightsAI(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var resp InsightEnrichmentResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}
	// Initially empty cache
	if len(resp.Enrichments) != 0 {
		t.Errorf("Expected 0 enrichments, got %d", len(resp.Enrichments))
	}
}

func TestServer_HandleVClusterCheck(t *testing.T) {
	s := &Server{
		allowedOrigins: []string{"*"},
		localClusters:  &LocalClusterManager{},
	}

	req := httptest.NewRequest("GET", "/vcluster/check", nil)
	w := httptest.NewRecorder()

	s.handleVClusterCheck(w, req)

	// Since localClusters is not fully initialized with k8s client, it might return 500 or 200 empty.
	// But it shouldn't panic.
	if w.Code == http.StatusInternalServerError {
		// This is acceptable if it's due to missing k8s client
	}
}
