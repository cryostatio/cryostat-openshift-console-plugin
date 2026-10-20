/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import '@patternfly/react-catalog-view-extension/dist/css/react-catalog-view-extension.css';
import '@patternfly/quickstarts/dist/quickstarts.min.css';
import '@app/app.css';
import '@app/Topology/styles/base.css';
import '@console-plugin/styles/plugin.css';
import { ChartContext } from '@app/Dashboard/Charts/context';
import { store } from '@app/Shared/Redux/ReduxStore';
import { Notification, NotificationCategory } from '@app/Shared/Services/api.types';
import { CapabilitiesContext } from '@app/Shared/Services/Capabilities';
import { NotificationsContext, NotificationsInstance } from '@app/Shared/Services/Notifications.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { Alert, AlertGroup, Bullseye, Card, CardBody, CardTitle, Content, Spinner } from '@patternfly/react-core';
import { DisconnectedIcon } from '@patternfly/react-icons';
import _ from 'lodash';
import * as React from 'react';
import { Provider } from 'react-redux';
import { map } from 'rxjs';
import { CryostatServiceContext } from './CryostatServiceContext';
import CryostatSelector from './CryostatSelector';

const LoadingState: React.FC = () => (
  <Bullseye>
    <Spinner />
  </Bullseye>
);

const ErrorState: React.FC<{ err: any }> = ({ err }) => (
  <Card>
    <CardTitle>Error</CardTitle>
    <CardBody>
      <Content component="p">{JSON.stringify(err, null, 2)}</Content>
    </CardBody>
  </Card>
);

const EmptyState: React.FC = () => (
  <Card>
    <CardTitle>
      <DisconnectedIcon />
      &nbsp; No instance selected
    </CardTitle>
    <CardBody>
      <Content component="p">To view this content, select a Cryostat instance.</Content>
    </CardBody>
  </Card>
);

const NotificationGroup: React.FC = () => {
  const services = React.useContext(ServiceContext);
  const notificationsContext = React.useContext(NotificationsContext);
  const [notifications, setNotifications] = React.useState([] as Notification[]);
  const [visibleNotificationsCount, setVisibleNotificationsCount] = React.useState(5);

  const addSubscription = useSubscriptions();

  React.useEffect(() => {
    services.targets.queryForTargets().subscribe();
    services.api.testBaseServer();
    notificationsContext.clearAll();
  }, [services.targets, services.api, notificationsContext]);

  React.useEffect(() => {
    addSubscription(services.settings.visibleNotificationsCount().subscribe(setVisibleNotificationsCount));
  }, [addSubscription, services.settings, setVisibleNotificationsCount]);

  React.useEffect(() => {
    addSubscription(
      notificationsContext
        .notifications()
        .pipe(
          map((ns) => {
            // FIXME this notification processing is very hacky.
            const visible = ns
              // we don't have a notification drawer, so hiding the read or hidden notifications makes sense
              .filter((n) => !n.hidden && !n.read)
              // we're only interested in showing action success or failure notifications
              .filter((n) => n.variant === 'success' || n.variant === 'danger')
              // the target selector component tries to eagerly fetch the target list, which
              // it does too early and fails at first. It will retry and succeed later.
              // This logic should be cleaned up in Cryostat Web.
              .filter((n) => n.title != 'Target List Update Failed')
              // some API requests, like querying for JMC Agent presence in a selected target,
              // are expected to respond with failure status codes. Suppress these notifications.
              .filter((n) => n.title != 'Request failed')
              // disable any notifications the user has specifically turned off
              .filter((n) => services.settings.notificationsEnabledFor(NotificationCategory[n.category || '']))
              // order chronologically
              .sort((prev, curr) => {
                if (!prev.timestamp) return -1;
                if (!curr.timestamp) return 1;
                return prev.timestamp - curr.timestamp;
              });

            const byKey = _.uniqBy(visible, 'key');
            const byMessage = _.uniqBy(byKey, 'message');

            return byMessage.slice(0, visibleNotificationsCount);
          }),
        )
        .subscribe((n) => setNotifications([...n])),
    );
  }, [services.settings, notificationsContext, addSubscription, visibleNotificationsCount]);

  return (
    <AlertGroup isToast isLiveRegion>
      {notifications.map(({ key, title, message, variant }) => (
        <Alert isLiveRegion variant={variant} key={key} title={title} timeout={5000}>
          {message?.toString()}
        </Alert>
      ))}
    </AlertGroup>
  );
};

export const CryostatPageShell: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const {
    service,
    serviceContext,
    chartContext,
    capabilities,
    instances,
    instancesLoaded,
    instancesErr,
    noSelection,
    enableRoute,
    searchNamespace,
    onSelectInstance,
    openCryostatRoute,
  } = React.useContext(CryostatServiceContext);

  return (
    <>
      <CryostatSelector
        instances={instances}
        renderNamespaceLabel={searchNamespace === '#ALL_NS#'}
        setSelectedCryostat={onSelectInstance}
        selection={service}
        isCryostatRouteDisabled={enableRoute}
        openCryostatRoute={openCryostatRoute}
      />
      {instancesErr ? (
        <ErrorState err={instancesErr} />
      ) : !instancesLoaded ? (
        <LoadingState />
      ) : noSelection ? (
        <EmptyState />
      ) : (
        <Provider store={store} key={`${service.namespace}/${service.name}`}>
          <CapabilitiesContext.Provider value={capabilities}>
            <ServiceContext.Provider value={serviceContext}>
              <ChartContext.Provider value={chartContext}>
                <NotificationsContext.Provider value={NotificationsInstance}>
                  <div className="cryostat-app">
                    <NotificationGroup />
                    {children}
                  </div>
                </NotificationsContext.Provider>
              </ChartContext.Provider>
            </ServiceContext.Provider>
          </CapabilitiesContext.Provider>
        </Provider>
      )}
    </>
  );
};
