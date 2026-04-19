#!/bin/bash
# check-tiers-drift.sh
# Verifies that generated contributor tier files are in sync with Go source.

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "Running contributor tier generator..."
go run scripts/gen-tiers-ts.go

# Check for changes in generated files
CHANGES=$(git status --porcelain web/src/types/rewards.generated.ts web/netlify/functions/rewards-tiers.generated.ts)

if [ -n "$CHANGES" ]; then
  echo "❌ Error: Contributor tiers are out of sync!"
  echo "Manual changes to .generated.ts files are not allowed, or tiers.go was updated without re-running the generator."
  echo "Run 'go run scripts/gen-tiers-ts.go' locally and commit the following changes:"
  echo ""
  git diff web/src/types/rewards.generated.ts web/netlify/functions/rewards-tiers.generated.ts
  exit 1
fi

echo "✅ Success: Contributor tiers are in sync."
exit 0
