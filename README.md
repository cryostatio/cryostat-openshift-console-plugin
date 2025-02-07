<a target="_blank" href="https://cryostat.io">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/images/cryostat_logo_hori_rgb_reverse.svg">
    <img src="./docs/images/cryostat_logo_hori_rgb_default.svg">
  </picture>
</a>

[![CI build and push](https://github.com/cryostatio/cryostat-openshift-console-plugin/actions/workflows/push-ci.yaml/badge.svg)](https://github.com/cryostatio/cryostat-openshift-console-plugin/actions/workflows/push-ci.yaml)
[![Google Group : Cryostat Development](https://img.shields.io/badge/Google%20Group-Cryostat%20Development-blue.svg)](https://groups.google.com/g/cryostat-development)

Dynamic plugin for [Red Hat OpenShift Container Platform](https://www.redhat.com/en/technologies/cloud-computing/openshift/container-platform) (OCP) Console. This provides [Cryostat Web](https://github.com/cryostatio/cryostat-web) functionality directly within the OCP Console so that users do not need to visit individual Cryostat instances' UIs. Usage of this plugin requires the [Cryostat Operator](https://github.com/cryostatio/cryostat-operator) or [Cryostat Helm Chart](https://github.com/cryostatio/cryostat-helm) to create Cryostat instances for the plugin to interact with.

## SEE ALSO

* [cryostat.io](https://cryostat.io) : upstream documentation website with user
  guides, tutorials, blog posts, and other user-facing content. Start here if
  what you've read so far sounds interesting and you want to know more as a
  **user**, rather than as a _developer_. Here you will find instructions on
  how to install Cryostat using the
  [Cryostat Operator](https://github.com/cryostatio/cryostat-operator), how to
  configure your applications to enable connectivity, and how to use the
  Cryostat application.

* [cryostat-operator](https://github.com/cryostatio/cryostat-operator) : an Operator
  for deploying Cryostat in your OpenShift or Kubernetes cluster.

* [cryostat-helm](https://github.com/cryostatio/cryostat-helm): a Helm Chart for
  deploying Cryostat in your OpenShift or Kubernetes cluster

## Requirements

- OpenShift Container Platform 4.15+
- Cryostat Operator installed on the cluster and at least one Cryostat CR created, or Cryostat Helm Chart

The Cryostat project follows [semantic versioning](https://semver.org/). To ensure compatibility, please keep your Cryostat component versions matching. If you use the Operator to install Cryostat then this will be done automatically.

## Development

### Initialize the project:
```bash
$ git submodule init
$ git submodule update --remote
$ pushd src/cryostat-web
$ yarn install
$ yarn yarn:frzinstall
$ popd
$ yarn install
$ pushd backend
$ npm ci
$ popd
```

### Deploying the plugin:
```bash
$ export IMAGE_NAMESPACE=quay.io/$myusername # replace $myusername with your quay.io username, or else set this to a different repository
$ PLATFORMS=linux/amd64 PUSH_MANIFEST=true ./plugin.bash build
$ ./plugin.bash install
```

### Development using local backend (Cryostat or Prism):

#### Terminal 1: Run the plugin locally
```
yarn run start
```

Plugin assets will be accessible at http://localhost:9001

#### Terminal 2: Run a local backend, either a Prism mock server or local Cryostat

```
npm run mock-server

OR

(in a Cryostat repo)
CRYOSTAT_HTTP_PORT=8181 bash smoketest.bash -tkp
```

Cryostat is accessible at http://localhost:8181, and for simplicity Prism has been configured to use the same port.

#### Terminal 3: Run a local OpenShift Console with plugin-proxy
```
yarn run start-console
```

The OpenShift Console running the plugin will be available at http://localhost:9000

## References

- [Console Plugin SDK README](https://github.com/openshift/console/tree/master/frontend/packages/console-dynamic-plugin-sdk)
- [Customization Plugin Example](https://github.com/spadgett/console-customization-plugin)
- [Dynamic Plugin Enhancement Proposal](https://github.com/openshift/enhancements/blob/master/enhancements/console/dynamic-plugins.md)
