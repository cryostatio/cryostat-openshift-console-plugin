#!/usr/bin/env bash

set -xe

DIR="$(dirname "$(readlink -f "$0")")"

IMAGE_NAMESPACE=${IMAGE_NAMESPACE:-quay.io/cryostat}
IMAGE_NAME=${IMAGE_NAME:-cryostat-openshift-console-plugin}
IMAGE_TAG=${IMAGE_TAG:-latest}
IMG="${IMAGE_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"

PLUGIN_NAME=${PLUGIN_NAME:-cryostat-plugin}
INSTALL_NAMESPACE=plugin--${PLUGIN_NAME,,}

CLUSTER_REGISTRY=${CLUSTER_REGISTRY:-image-registry.openshift-image-registry.svc:5000}
CLUSTER_IMG="${CLUSTER_REGISTRY}/${INSTALL_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"

# Builds the plugin image on the cluster that the oc client is currently logged in to, uploading the
# working tree as the build context. The resulting image is pushed to the cluster's internal registry
# in the plugin's own install namespace, so no external registry or pull secret is required.
#
# A rebuild overwrites the existing tag rather than producing a new one, so an already running
# Deployment is restarted afterwards to pull the replacement image.
function clusterBuild() {
    oc create namespace "${INSTALL_NAMESPACE}" --dry-run=client -o yaml | oc apply -f -

    if ! oc get buildconfig "${IMAGE_NAME}" --namespace "${INSTALL_NAMESPACE}" &> /dev/null; then
        oc new-build \
            --name "${IMAGE_NAME}" \
            --binary \
            --strategy docker \
            --to "${IMAGE_NAME}:${IMAGE_TAG}" \
            --namespace "${INSTALL_NAMESPACE}"
    fi

    local replacing=false
    if oc get imagestreamtag "${IMAGE_NAME}:${IMAGE_TAG}" --namespace "${INSTALL_NAMESPACE}" &> /dev/null; then
        replacing=true
    fi

    oc start-build "${IMAGE_NAME}" \
        --namespace "${INSTALL_NAMESPACE}" \
        --from-dir "${DIR}" \
        --follow

    if [ "${replacing}" = "true" ]; then
        restartPlugin
    fi
}

# Restarts the installed plugin Deployment, if there is one. The Deployment is named after
# .Values.plugin.name rather than the Helm release, so it is selected by the release label that the
# chart applies instead of by name.
function restartPlugin() {
    local deployments
    deployments="$(oc get deployments \
        --selector "app.kubernetes.io/instance=${PLUGIN_NAME}" \
        --namespace "${INSTALL_NAMESPACE}" \
        --output name)"

    if [ -z "${deployments}" ]; then
        return 0
    fi

    # Intentionally unquoted: there may be more than one Deployment to roll.
    # shellcheck disable=SC2086
    oc rollout restart ${deployments} --namespace "${INSTALL_NAMESPACE}"
    # shellcheck disable=SC2086
    oc rollout status ${deployments} --namespace "${INSTALL_NAMESPACE}" --timeout "${ROLLOUT_TIMEOUT:-5m}"
}

function install() {
    helm upgrade \
        --set plugin.image="${1:-${IMG}}" \
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
    echo -e "\tcluster-build: build the plugin on the cluster the oc client is logged in to, pushing to the cluster's internal registry. Restarts the plugin if the build replaced an existing image. Uses \$CLUSTER_IMG, \$INSTALL_NAMESPACE, and \$ROLLOUT_TIMEOUT."
    echo -e "\tinstall: install the plugin. Uses \$IMG, \$PLUGIN_NAME, and \$INSTALL_NAMESPACE."
    echo -e "\tcluster-install: install the plugin using the image produced by cluster-build. Uses \$CLUSTER_IMG, \$PLUGIN_NAME, and \$INSTALL_NAMESPACE."
    echo -e "\tuninstall: uninstall the plugin. Uses \$PLUGIN_NAME and \$INSTALL_NAMESPACE."
    echo -e "\treinstall: uninstall the plugin if installed, then install the plugin."
    echo -e "\nEnvironment Variables:"
    echo -e "\t\$IMG the full container image name and tag to build to. Defaults to \$IMAGE_NAMESPACE/\$IMAGE_NAME:\$IMAGE_TAG ."
    echo -e "\t\$PUSH_MANIFEST whether the multiarch container manifest will be pushed to the remote registry after building. Defaults to false ."
    echo -e "\t\$IMAGE_NAMESPACE the container image namespace prefix. Defaults to quay.io/cryostat ."
    echo -e "\t\$IMAGE_NAME the container image name. Defaults to cryostat-openshift-console-plugin ."
    echo -e "\t\$IMAGE_TAG the container image tag. Defaults to latest ."
    echo -e "\t\$CLUSTER_REGISTRY the in-cluster registry that cluster-build pushes to. Defaults to image-registry.openshift-image-registry.svc:5000 ."
    echo -e "\t\$CLUSTER_IMG the image reference produced by cluster-build. Defaults to \$CLUSTER_REGISTRY/\$INSTALL_NAMESPACE/\$IMAGE_NAME:\$IMAGE_TAG ."
    echo -e "\t\$ROLLOUT_TIMEOUT how long cluster-build waits for the restarted plugin to become ready. Defaults to 5m ."
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
    cluster-build)
        clusterBuild
        ;;
    install)
        install
        ;;
    cluster-install)
        install "${CLUSTER_IMG}"
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
