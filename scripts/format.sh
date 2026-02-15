#!/usr/bin/env bash
#
# MusicStream — Format Code & Markdown
# Formats all TypeScript/TSX source files and Markdown docs in one command.
#
# Usage:
#   ./scripts/format.sh          # Format everything (code + markdown)
#   ./scripts/format.sh --check  # Check formatting without writing (CI mode)
#   ./scripts/format.sh --code   # Format only code (backend + mobile)
#   ./scripts/format.sh --docs   # Format only markdown files
#

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CHECK_MODE=false
CODE_ONLY=false
DOCS_ONLY=false

# Parse args
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_MODE=true ;;
    --code)  CODE_ONLY=true ;;
    --docs)  DOCS_ONLY=true ;;
    --help|-h)
      echo "Usage: ./scripts/format.sh [--check] [--code] [--docs]"
      echo ""
      echo "  --check   Check formatting without writing changes (for CI)"
      echo "  --code    Format only TypeScript/TSX source files"
      echo "  --docs    Format only Markdown files"
      echo ""
      echo "With no flags, formats everything."
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Run ./scripts/format.sh --help for usage."
      exit 1
      ;;
  esac
done

PRETTIER_CMD="--write"
if $CHECK_MODE; then
  PRETTIER_CMD="--check"
fi

ERRORS=0

# ─── Format Backend Code ─────────────────────────────────────────────
format_backend() {
  echo "━━━ Backend (TypeScript) ━━━"
  if [ -d "$ROOT_DIR/backend/node_modules/.bin" ]; then
    cd "$ROOT_DIR/backend"
    if $CHECK_MODE; then
      npx prettier --check "src/**/*.ts" "test/**/*.ts" 2>/dev/null && echo "  ✓ Backend code is formatted" || { echo "  ✗ Backend code needs formatting"; ERRORS=$((ERRORS + 1)); }
    else
      npx prettier --write "src/**/*.ts" "test/**/*.ts" 2>/dev/null
      echo "  ✓ Backend code formatted"
    fi
  else
    echo "  ⚠ Skipped — run 'cd backend && npm install' first"
    ERRORS=$((ERRORS + 1))
  fi
}

# ─── Format Mobile Code ──────────────────────────────────────────────
format_mobile() {
  echo "━━━ Mobile (TypeScript/TSX) ━━━"
  if [ -d "$ROOT_DIR/mobile/node_modules/.bin" ]; then
    cd "$ROOT_DIR/mobile"
    if $CHECK_MODE; then
      npx prettier --check "src/**/*.{ts,tsx}" "__tests__/**/*.{ts,tsx}" "App.tsx" 2>/dev/null && echo "  ✓ Mobile code is formatted" || { echo "  ✗ Mobile code needs formatting"; ERRORS=$((ERRORS + 1)); }
    else
      npx prettier --write "src/**/*.{ts,tsx}" "__tests__/**/*.{ts,tsx}" "App.tsx" 2>/dev/null
      echo "  ✓ Mobile code formatted"
    fi
  else
    echo "  ⚠ Skipped — run 'cd mobile && npm install' first"
    ERRORS=$((ERRORS + 1))
  fi
}

# ─── Format Markdown Files ───────────────────────────────────────────
format_docs() {
  echo "━━━ Markdown Files ━━━"
  cd "$ROOT_DIR"

  # Use backend's prettier (or mobile's) to format root-level and docs markdown
  local PRETTIER_BIN=""
  if [ -x "$ROOT_DIR/backend/node_modules/.bin/prettier" ]; then
    PRETTIER_BIN="$ROOT_DIR/backend/node_modules/.bin/prettier"
  elif [ -x "$ROOT_DIR/mobile/node_modules/.bin/prettier" ]; then
    PRETTIER_BIN="$ROOT_DIR/mobile/node_modules/.bin/prettier"
  fi

  if [ -z "$PRETTIER_BIN" ]; then
    echo "  ⚠ Skipped — prettier not found. Run npm install in backend/ or mobile/"
    ERRORS=$((ERRORS + 1))
    return
  fi

  # Collect all markdown files (root + docs/ + infrastructure/docs/)
  local MD_FILES=()
  for f in "$ROOT_DIR"/*.md "$ROOT_DIR"/docs/*.md "$ROOT_DIR"/infrastructure/docs/*.md; do
    [ -f "$f" ] && MD_FILES+=("$f")
  done

  if [ ${#MD_FILES[@]} -eq 0 ]; then
    echo "  No markdown files found"
    return
  fi

  if $CHECK_MODE; then
    "$PRETTIER_BIN" --check "${MD_FILES[@]}" 2>/dev/null && echo "  ✓ Markdown files are formatted" || { echo "  ✗ Markdown files need formatting"; ERRORS=$((ERRORS + 1)); }
  else
    "$PRETTIER_BIN" --write "${MD_FILES[@]}" 2>/dev/null
    echo "  ✓ ${#MD_FILES[@]} markdown files formatted"
  fi
}

# ─── Run ──────────────────────────────────────────────────────────────
echo ""
if $CHECK_MODE; then
  echo "🔍 Checking formatting..."
else
  echo "🎨 Formatting MusicStream project..."
fi
echo ""

if $DOCS_ONLY; then
  format_docs
elif $CODE_ONLY; then
  format_backend
  echo ""
  format_mobile
else
  format_backend
  echo ""
  format_mobile
  echo ""
  format_docs
fi

echo ""
if [ $ERRORS -gt 0 ]; then
  if $CHECK_MODE; then
    echo "❌ Formatting check failed ($ERRORS issue(s)). Run ./scripts/format.sh to fix."
    exit 1
  else
    echo "⚠  Completed with $ERRORS warning(s)."
    exit 1
  fi
else
  if $CHECK_MODE; then
    echo "✅ All files are properly formatted."
  else
    echo "✅ All formatting complete."
  fi
fi
