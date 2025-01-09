#!/usr/bin/env bash

set -xe

DIR="$(dirname "$(readlink -f "$0")")"
MANIFEST="${MANIFEST:-quay.io/cryostat/cryostat-openshift-console-plugin:latest}"

if podman manifest exists "${MANIFEST}"; then
    podman manifest rm "${MANIFEST}"
fi

podman buildx build \
    --platform="${PLATFORMS:-linux/amd64,linux/arm64}" \
    --manifest "${MANIFEST}" \
    --file "${DIR}/Dockerfile" \
    --pull=always \
    --ignorefile "${DIR}/.dockerignore" \
    "${DIR}"
