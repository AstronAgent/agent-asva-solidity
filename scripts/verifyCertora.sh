#!/bin/bash
set -e

export $(grep -v '^#' .env | xargs 2>/dev/null || true)

# Use solc-0.8.24
SOLC_BINARY="$HOME/Library/Application Support/svm/0.8.24/solc-0.8.24"

if [ ! -f "$SOLC_BINARY" ]; then
    SOLC_BINARY=$(find "$HOME" -name "solc-0.8.24" -type f 2>/dev/null | head -1)
fi

if [ ! -f "$SOLC_BINARY" ] || [ ! -x "$SOLC_BINARY" ]; then
    echo "Warning: solc-0.8.24 not found, using npx"
    PROJECT_NAME=$(basename "$(pwd)" | tr ' ' '_')
    TMP_WRAPPER="/tmp/solc-wrapper-${PROJECT_NAME}.sh"
    cat > "$TMP_WRAPPER" << 'WRAPPER'
#!/usr/bin/env bash
exec npx --yes solc@0.8.24 "$@"
WRAPPER
    chmod +x "$TMP_WRAPPER"
    SOLC_BINARY="$TMP_WRAPPER"
else
    PROJECT_NAME=$(basename "$(pwd)" | tr ' ' '_')
    TMP_SOLC="/tmp/solc-0.8.24-${PROJECT_NAME}"
    ln -sf "$SOLC_BINARY" "$TMP_SOLC"
    chmod +x "$TMP_SOLC" 2>/dev/null
    SOLC_BINARY="$TMP_SOLC"
fi

if ! "$SOLC_BINARY" --version >/dev/null 2>&1; then
    echo "Error: solc failed"
    exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# FULL VERIFICATION
certoraRun \
    "${PROJECT_ROOT}/src/RavenAccessWithSubgraphHooks.sol" \
    "${PROJECT_ROOT}/certora/mocks/MockERC20.sol" \
    --verify RavenAccessWithSubgraphHooks:certora/specs/RavenAccess.spec \
    --link RavenAccessWithSubgraphHooks:USDC=MockERC20 \
    --link RavenAccessWithSubgraphHooks:USDT=MockERC20 \
    --solc "$SOLC_BINARY" \
    --solc_optimize 200 \
    --solc_via_ir \
    --packages_path "${PROJECT_ROOT}/node_modules" \
    --optimistic_loop \
    --loop_iter 3 \
    --msg "RavenAccess: FINAL - ALL PROVED" \
    --rule_sanity basic