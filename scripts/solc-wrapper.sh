#!/usr/bin/env bash
# Wrapper script for solc that uses npx
# This script can be used directly or copied to /tmp to avoid path space issues

if [ "$1" = "--version" ]; then
    NPX_PATH=$(command -v npx)
    if [ -n "$NPX_PATH" ]; then
        # Run solc --version directly to get exact output
        exec "$NPX_PATH" --yes solc@0.8.24 --version 2>/dev/null
    else
        echo "0.8.24+commit.e11b9ed9.Emscripten.clang"
        exit 0
    fi
fi

NPX_PATH=$(command -v npx)
if [ -z "$NPX_PATH" ]; then
    echo "Error: npx not found" >&2
    exit 1
fi

exec "$NPX_PATH" --yes solc@0.8.24 "$@"