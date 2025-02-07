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

function printHelp() {
    echo "Usage:"
    echo -e "\t-h, --help, help: print this message"
    echo -e "\tbuild: build the plugin. See environment variables section. Uses \$IMG, \$PLATFORMS, and \$PUSH_MANIFEST."
    echo -e "\tinstall: install the plugin. Uses \$IMG, \$PLUGIN_NAME, and \$INSTALL_NAMESPACE."
    echo -e "\tuninstall: uninstall the plugin. Uses \$PLUGIN_NAME and \$INSTALL_NAMESPACE."
    echo -e "\treinstall: uninstall the plugin if installed, then install the plugin."
    echo -e "\nEnvironment Variables:"
    echo -e "\t\$IMG the full container image name and tag to build to. Defaults to \$IMAGE_NAMESPACE/\$IMAGE_NAME:\$IMAGE_TAG ."
    echo -e "\t\$PUSH_MANIFEST whether the multiarch container manifest will be pushed to the remote registry after building. Defaults to false ."
    echo -e "\t\$IMAGE_NAMESPACE the container image namespace prefix. Defaults to quay.io/cryostat ."
    echo -e "\t\$IMAGE_NAME the container image name. Defaults to cryostat-openshift-console-plugin ."
    echo -e "\t\$IMAGE_TAG the container image tag. Defaults to latest ."
    echo -e "\t\$PLUGIN_NAME the plugin instance installation name. Defaults to cryostat-plugin ."
    echo -e "\t\$INSTALL_NAMESPACE the plugin instance installation namespace. Defaults to plugin--cryostat-plugin ."
}

case "$1" in
    -h)
        ;&
    --help)
        ;&
    help)
        set +x
        printHelp
        exit 0
        ;;
    build)
        MANIFEST="${IMG}" PLATFORMS="${PLATFORMS:-linux/amd64}" bash "${DIR}/build.bash"
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
        set +x
        echo "Unknown subcommand: $1"
        printHelp
        exit 1
        ;;
esac
