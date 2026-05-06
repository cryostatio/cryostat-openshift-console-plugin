#!/usr/bin/env bash
# Get SDK shared modules for Renovate configuration
# Outputs a JSON array of package names

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$SCRIPT_DIR/lib-sdk-shared-modules.sh"

cd "$PROJECT_ROOT"

SDK_VERSION=$(node -p "require('./package.json').devDependencies['@openshift-console/dynamic-plugin-sdk']" 2>/dev/null)

if [ -z "$SDK_VERSION" ]; then
    echo "Error: Could not determine SDK version" >&2
    exit 1
fi

MODULES=$(get_sdk_shared_module_names "$SDK_VERSION" 2>/dev/null)

if [ -z "$MODULES" ]; then
    echo "Error: Could not query SDK shared modules" >&2
    exit 1
fi

echo "$MODULES" | jq -R -s 'split("\n") | map(select(length > 0))'