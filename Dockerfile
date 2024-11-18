ARG APP_DIR=/opt/app-root/src

FROM registry.access.redhat.com/ubi9/nodejs-20:latest AS frontend_build
USER root
WORKDIR /usr/src/app
ADD . /usr/src/app
RUN (command -v corepack || npm install --global corepack) && \
    corepack enable && \
    yarn install --immutable && \
    yarn build

FROM registry.access.redhat.com/ubi9/nodejs-20:latest AS backend_build
USER root
WORKDIR /usr/src/app
ADD backend /usr/src/app
RUN npm ci && npm run build:noCheck

FROM registry.access.redhat.com/ubi9/nodejs-20-minimal:latest
ARG APP_DIR
ENV SRVDIR="${APP_DIR}"
COPY --from=backend_build /usr/src/app/node_modules/ "${APP_DIR}"/node_modules
COPY --from=backend_build /usr/src/app/dist/server.js "${APP_DIR}"
COPY --from=frontend_build /usr/src/app/dist "${APP_DIR}"/html
ENTRYPOINT [ "/usr/bin/bash", "-c", "/usr/bin/node ${SRVDIR}/server.js" ]
