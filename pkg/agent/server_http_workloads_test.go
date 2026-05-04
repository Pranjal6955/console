package agent

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kubestellar/console/pkg/k8s"
)

func TestServer_HandleScaleHTTP(t *testing.T) {
	// 1. Setup server with mock k8s client
	k8sClient, _ := k8s.NewMultiClusterClient("")
	s := &Server{
		k8sClient:      k8sClient,
		allowedOrigins: []string{"*"},
	}

	// 2. Test request
	reqBody := map[string]interface{}{
		"workloadName":   "test-deploy",
		"namespace":      "default",
		"targetClusters": []string{"cluster1"},
		"replicas":       3,
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/workloads/scale", bytes.NewReader(body))
	w := httptest.NewRecorder()

	s.handleScaleHTTP(w, req)

	// Since cluster1 doesn't exist, it should return an error from ScaleWorkload
	// but we expect the handler to have processed the request.
	// Actually, GetDynamicClient("cluster1") will fail inside ScaleWorkload.
	if w.Code != http.StatusOK && w.Code != http.StatusInternalServerError {
		t.Errorf("Unexpected status code: %d", w.Code)
	}

	var resp map[string]interface{}
	json.NewDecoder(w.Body).Decode(&resp)
	// Even on failure, success field should be present if it reached k8sClient call
	if _, ok := resp["success"]; !ok {
		t.Error("Response should contain 'success' field")
	}
}

func TestServer_HandleDeployWorkloadHTTP_Validation(t *testing.T) {
	s := &Server{
		allowedOrigins: []string{"*"},
	}

	// Test missing workloadName
	reqBody := map[string]interface{}{
		"namespace": "default",
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/workloads/deploy", bytes.NewReader(body))
	w := httptest.NewRecorder()

	s.handleDeployWorkloadHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for missing workloadName, got %d", w.Code)
	}
}

func TestServer_HandlePodsHTTP(t *testing.T) {
	k8sClient, _ := k8s.NewMultiClusterClient("")
	s := &Server{
		k8sClient:      k8sClient,
		allowedOrigins: []string{"*"},
	}

	req := httptest.NewRequest("GET", "/pods?cluster=cluster1&namespace=default", nil)
	w := httptest.NewRecorder()

	s.handlePodsHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable && w.Code != http.StatusOK {
		t.Errorf("Expected 503 or 200, got %d", w.Code)
	}
}
