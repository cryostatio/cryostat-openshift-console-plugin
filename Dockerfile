ARG APP_DIR=/opt/app-root/src

FROM registry.access.redhat.com/ubi9/nodejs-22:9.8-1790572348@sha256:ef4f18a7e736696b1314bdc21bcf57bfd50ba3ea4f80c13833f777316b25c035 AS frontend_build
USER root
WORKDIR /usr/src/app
ADD console-extensions.ts console-plugin-metadata.ts eslint.config.js i18next-parser.config.js package.json yarn.lock .prettierrc.yml tsconfig.json webpack.config.ts /usr/src/app/
ADD locales /usr/src/app/locales
ADD i18n-scripts /usr/src/app/i18n-scripts
ADD src/openshift /usr/src/app/src/openshift
ADD src/cryostat-web /usr/src/app/src/cryostat-web
RUN (command -v corepack || npm install --global corepack) && \
    corepack enable
RUN echo "nodeLinker: node-modules" > .yarnrc.yml
RUN yarn install && yarn build

FROM registry.access.redhat.com/ubi9/nodejs-22:9.8-1790572348@sha256:ef4f18a7e736696b1314bdc21bcf57bfd50ba3ea4f80c13833f777316b25c035 AS backend_build
USER root
WORKDIR /usr/src/app
ADD backend /usr/src/app
RUN npm ci && npm run build

FROM registry.access.redhat.com/ubi9/nodejs-22-minimal:9.8-1790648388@sha256:ca1c79182159009eb15a041bc6bb16f390a4e738b9d57d6cc4975f3b2981788b
ARG APP_DIR
ENV SRVDIR="${APP_DIR}"
LABEL io.cryostat.component=console-plugin
COPY --from=backend_build /usr/src/app/node_modules/ "${APP_DIR}"/node_modules
COPY --from=backend_build /usr/src/app/dist/main.js "${APP_DIR}"
COPY --from=backend_build /usr/src/app/dist/server.js "${APP_DIR}"
COPY --from=frontend_build /usr/src/app/dist "${APP_DIR}"/html
ENTRYPOINT [ "/usr/bin/bash", "-c", "/usr/bin/node ${SRVDIR}/main.js" ]
