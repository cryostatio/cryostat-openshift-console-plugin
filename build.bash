#!/usr/bin/env bash

set -xe

DIR="$(dirname "$(readlink -f "$0")")"

IMAGE_NAMESPACE=${IMAGE_NAMESPACE:-quay.io/cryostat}
IMAGE_NAME=${IMAGE_NAME:-cryostat-openshift-console-plugin}
IMAGE_TAG=${IMAGE_TAG:-latest}
MANIFEST="${IMAGE_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"

PUSH_MANIFEST=${PUSH_MANIFEST:-false}

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

if [ "${PUSH_MANIFEST}" = "true" ]; then
    podman push "${MANIFEST}"
fi
