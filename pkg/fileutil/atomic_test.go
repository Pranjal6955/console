package fileutil

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"
)

func TestAtomicWriteFile(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "atomic-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	t.Run("SuccessfulWrite", func(t *testing.T) {
		path := filepath.Join(tmpDir, "test1.txt")
		data := []byte("hello world")
		perm := os.FileMode(0644)

		err := AtomicWriteFile(path, data, perm)
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}

		got, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("failed to read file: %v", err)
		}
		if !bytes.Equal(got, data) {
			t.Errorf("expected %q, got %q", string(data), string(got))
		}

		info, err := os.Stat(path)
		if err != nil {
			t.Fatalf("failed to stat file: %v", err)
		}
		if info.Mode().Perm() != perm {
			t.Errorf("expected perm %o, got %o", perm, info.Mode().Perm())
		}
	})

	t.Run("OverwriteExisting", func(t *testing.T) {
		path := filepath.Join(tmpDir, "test2.txt")
		err := os.WriteFile(path, []byte("old data"), 0600)
		if err != nil {
			t.Fatalf("failed to write initial file: %v", err)
		}

		data := []byte("new data")
		perm := os.FileMode(0644)

		err = AtomicWriteFile(path, data, perm)
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}

		got, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("failed to read file: %v", err)
		}
		if !bytes.Equal(got, data) {
			t.Errorf("expected %q, got %q", string(data), string(got))
		}
		
		info, err := os.Stat(path)
		if err != nil {
			t.Fatalf("failed to stat file: %v", err)
		}
		if info.Mode().Perm() != perm {
			t.Errorf("expected perm %o, got %o", perm, info.Mode().Perm())
		}
	})

	t.Run("InvalidDirectory", func(t *testing.T) {
		path := filepath.Join(tmpDir, "non-existent-dir", "test.txt")
		data := []byte("data")
		
		err := AtomicWriteFile(path, data, 0644)
		if err == nil {
			t.Error("expected error for non-existent directory, got nil")
		}
	})
}
