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
$ export PLUGIN_NAME=cryostat-plugin
$ export IMAGE_TAG=quay.io/$myusername/cryostat-openshift-console-plugin:latest # replace $myusername with your quay.io username, or else set this to a different repository
$ PLATFORMS=linux/amd64 MANIFEST=$IMAGE_TAG ./build.bash
$ podman manifest push $IMAGE_TAG
$ helm upgrade --set plugin.image=$IMAGE_TAG -i $PLUGIN_NAME charts/openshift-console-plugin -n plugin--${PLUGIN_NAME,,} --create-namespace
$ helm uninstall $PLUGIN_NAME -n plugin--${PLUGIN_NAME,,}
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

# OpenShift Console Plugin Template

This project is a minimal template for writing a new OpenShift Console dynamic
plugin.

[Dynamic plugins](https://github.com/openshift/console/tree/master/frontend/packages/console-dynamic-plugin-sdk)
allow you to extend the
[OpenShift UI](https://github.com/openshift/console)
at runtime, adding custom pages and other extensions. They are based on
[webpack module federation](https://webpack.js.org/concepts/module-federation/).
Plugins are registered with console using the `ConsolePlugin` custom resource
and enabled in the console operator config by a cluster administrator.

Using the latest `v1` API version of `ConsolePlugin` CRD, requires OpenShift 4.12
and higher. For using old `v1alpha1` API version us OpenShift version 4.10 or 4.11.

For an example of a plugin that works with OpenShift 4.11, see the `release-4.11` branch.
For a plugin that works with OpenShift 4.10, see the `release-4.10` branch.

[Node.js](https://nodejs.org/en/) and [yarn](https://yarnpkg.com) are required
to build and run the example. To run OpenShift console in a container, either
[Docker](https://www.docker.com) or [podman 3.2.0+](https://podman.io) and
[oc](https://console.redhat.com/openshift/downloads) are required.

## Getting started

After cloning this repo, you should update the plugin metadata such as the
plugin name in the `consolePlugin` declaration of [package.json](package.json).

```json
"consolePlugin": {
  "name": "console-plugin-template",
  "version": "0.0.1",
  "displayName": "My Plugin",
  "description": "Enjoy this shiny, new console plugin!",
  "exposedModules": {
    "ExamplePage": "./components/ExamplePage"
  },
  "dependencies": {
    "@console/pluginAPI": "*"
  }
}
```

The template adds a single example page in the Home navigation section. The
extension is declared in the [console-extensions.json](console-extensions.json)
file and the React component is declared in
[src/components/ExamplePage.tsx](src/components/ExamplePage.tsx).

You can run the plugin using a local development environment or build an image
to deploy it to a cluster.

## Development

### Option 1: Local

In one terminal window, run:

1. `yarn install`
2. `yarn run start`

In another terminal window, run:

1. `oc login` (requires [oc](https://console.redhat.com/openshift/downloads) and an [OpenShift cluster](https://console.redhat.com/openshift/create))
2. `yarn run start-console` (requires [Docker](https://www.docker.com) or [podman 3.2.0+](https://podman.io))

This will run the OpenShift console in a container connected to the cluster
you've logged into. The plugin HTTP server runs on port 9001 with CORS enabled.
Navigate to <http://localhost:9000/example> to see the running plugin.

#### Running start-console with Apple silicon and podman

If you are using podman on a Mac with Apple silicon, `yarn run start-console`
might fail since it runs an amd64 image. You can workaround the problem with
[qemu-user-static](https://github.com/multiarch/qemu-user-static) by running
these commands:

```bash
podman machine ssh
sudo -i
rpm-ostree install qemu-user-static
systemctl reboot
```

### Option 2: Docker + VSCode Remote Container

Make sure the
[Remote Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
extension is installed. This method uses Docker Compose where one container is
the OpenShift console and the second container is the plugin. It requires that
you have access to an existing OpenShift cluster. After the initial build, the
cached containers will help you start developing in seconds.

1. Create a `dev.env` file inside the `.devcontainer` folder with the correct values for your cluster:

```bash
OC_PLUGIN_NAME=console-plugin-template
OC_URL=https://api.example.com:6443
OC_USER=kubeadmin
OC_PASS=<password>
```

2. `(Ctrl+Shift+P) => Remote Containers: Open Folder in Container...`
3. `yarn run start`
4. Navigate to <http://localhost:9000/example>

## Docker image

Before you can deploy your plugin on a cluster, you must build an image and
push it to an image registry.

1. Build the image:

   ```sh
   docker build -t quay.io/my-repository/my-plugin:latest .
   ```

2. Run the image:

   ```sh
   docker run -it --rm -d -p 9001:80 quay.io/my-repository/my-plugin:latest
   ```

3. Push the image:

   ```sh
   docker push quay.io/my-repository/my-plugin:latest
   ```

NOTE: If you have a Mac with Apple silicon, you will need to add the flag
`--platform=linux/amd64` when building the image to target the correct platform
to run in-cluster.

## Deployment on cluster

A [Helm](https://helm.sh) chart is available to deploy the plugin to an OpenShift environment.

The following Helm parameters are required:

`plugin.image`: The location of the image containing the plugin that was previously pushed

Additional parameters can be specified if desired. Consult the chart [values](charts/openshift-console-plugin/values.yaml) file for the full set of supported parameters.

### Installing the Helm Chart

Install the chart using the name of the plugin as the Helm release name into a new namespace or an existing namespace as specified by the `plugin_console-plugin-template` parameter and providing the location of the image within the `plugin.image` parameter by using the following command:

```shell
helm upgrade -i  my-plugin charts/openshift-console-plugin -n plugin__cryostat-plugin --create-namespace --set plugin.image=my-plugin-image-location
```

NOTE: When deploying on OpenShift 4.10, it is recommended to add the parameter `--set plugin.securityContext.enabled=false` which will omit configurations related to Pod Security.

NOTE: When defining i18n namespace, adhere `plugin__<name-of-the-plugin>` format. The name of the plugin should be extracted from the `consolePlugin` declaration within the [package.json](package.json) file.

## i18n

The plugin template demonstrates how you can translate messages in with [react-i18next](https://react.i18next.com/). The i18n namespace must match
the name of the `ConsolePlugin` resource with the `plugin__` prefix to avoid
naming conflicts. For example, the plugin template uses the
`plugin__cryostat-plugin` namespace. You can use the `useTranslation` hook
with this namespace as follows:

```tsx
conster Header: React.FC = () => {
  const { t } = useTranslation('plugin__cryostat-plugin');
  return <h1>{t('Hello, World!')}</h1>;
};
```

For labels in `console-extensions.json`, you can use the format
`%plugin__cryostat-plugin~My Label%`. Console will replace the value with
the message for the current language from the `plugin__cryostat-plugin`
namespace. For example:

```json
  {
    "type": "console.navigation/section",
    "properties": {
      "id": "admin-demo-section",
      "perspective": "admin",
      "name": "%plugin__cryostat-plugin~Plugin Template%"
    }
  }
```

Running `yarn i18n` updates the JSON files in the `locales` folder of the
plugin template when adding or changing messages.

## Linting

This project adds prettier, eslint, and stylelint. Linting can be run with
`yarn run lint`.

The stylelint config disallows hex colors since these cause problems with dark
mode (starting in OpenShift console 4.11). You should use the
[PatternFly global CSS variables](https://patternfly-react-main.surge.sh/developer-resources/global-css-variables#global-css-variables)
for colors instead.

The stylelint config also disallows naked element selectors like `table` and
`.pf-` or `.co-` prefixed classes. This prevents plugins from accidentally
overwriting default console styles, breaking the layout of existing pages. The
best practice is to prefix your CSS classnames with your plugin name to avoid
conflicts. Please don't disable these rules without understanding how they can
break console styles!

## Reporting

Steps to generate reports

1. In command prompt, navigate to root folder and execute the command `yarn run cypress-merge`
2. Then execute command `yarn run cypress-generate`
The cypress-report.html file is generated and should be in (/integration-tests/screenshots) directory

## References

- [Console Plugin SDK README](https://github.com/openshift/console/tree/master/frontend/packages/console-dynamic-plugin-sdk)
- [Customization Plugin Example](https://github.com/spadgett/console-customization-plugin)
- [Dynamic Plugin Enhancement Proposal](https://github.com/openshift/enhancements/blob/master/enhancements/console/dynamic-plugins.md)
