#!/usr/bin/env bash

set -xe

DIR="$(dirname "$(readlink -f "$0")")"

IMAGE_NAMESPACE=${IMAGE_NAMESPACE:-quay.io/cryostat}
IMAGE_NAME=${IMAGE_NAME:-cryostat-openshift-console-plugin}
IMAGE_TAG=${IMAGE_TAG:-latest}
IMG="${IMAGE_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"

PLUGIN_NAME=${PLUGIN_NAME:-cryostat-plugin}
INSTALL_NAMESPACE=plugin--${PLUGIN_NAME,,}

function install() {
    helm upgrade \
        --set plugin.image="${IMG}" \
        --install "${PLUGIN_NAME:-cryostat-plugin}" \
        --namespace "${INSTALL_NAMESPACE}" \
        --create-namespace \
        charts/openshift-console-plugin
}

function uninstall() {
    helm uninstall "${PLUGIN_NAME:-cryostat-plugin}" \
        --namespace "${INSTALL_NAMESPACE}"
}

case "$1" in
    build)
        bash "${DIR}/build.bash"
        ;;
    install)
        install
        ;;
    uninstall)
        uninstall
        ;;
    reinstall)
        uninstall || true
        install
        ;;
    *)
        echo "Unknown subcommand: $1"
        exit 1
        ;;
esac
