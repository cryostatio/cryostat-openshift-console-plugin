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
import { ChartContext, Controllers } from '@app/Dashboard/Charts/context';
import { JFRMetricsChartController } from '@app/Dashboard/Charts/jfr/JFRMetricsChartController';
import { MBeanMetricsChartController } from '@app/Dashboard/Charts/mbean/MBeanMetricsChartController';
import { store } from '@app/Shared/Redux/ReduxStore';
import { ApiService } from '@app/Shared/Services/Api.service';
import { Notification, NotificationCategory } from '@app/Shared/Services/api.types';
import { Capabilities, CapabilitiesContext } from '@app/Shared/Services/Capabilities';
import { LoginService } from '@app/Shared/Services/Login.service';
import { NotificationChannel } from '@app/Shared/Services/NotificationChannel.service';
import { NotificationsContext, NotificationsInstance } from '@app/Shared/Services/Notifications.service';
import { ReportService } from '@app/Shared/Services/Report.service';
import { CryostatContext, ServiceContext, Services } from '@app/Shared/Services/Services';
import { SettingsService } from '@app/Shared/Services/Settings.service';
import { TargetService } from '@app/Shared/Services/Target.service';
import { TargetsService } from '@app/Shared/Services/Targets.service';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { pluginServices } from '@console-plugin/services/PluginContext';
import { checkNavHighlighting } from '@console-plugin/utils/utils';
import {
  k8sGet,
  K8sResourceCommon,
  useActiveNamespace,
  useK8sModel,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  getConsoleRequestHeaders,
  getCSRFToken,
} from '@openshift-console/dynamic-plugin-sdk/lib/utils/fetch/console-fetch-utils';
import {
  Alert,
  AlertGroup,
  Bullseye,
  Card,
  CardBody,
  CardTitle,
  Spinner,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import { DisconnectedIcon } from '@patternfly/react-icons';
import _ from 'lodash';
import * as React from 'react';
import { Provider } from 'react-redux';
import { map, Observable, of } from 'rxjs';
import { CryostatController } from './CryostatController';
import CryostatSelector from './CryostatSelector';

export const SESSIONSTORAGE_SVC_NS_KEY = 'cryostat-svc-ns';
export const SESSIONSTORAGE_SVC_NAME_KEY = 'cryostat-svc-name';

export type CryostatService = {
  name: string;
  namespace: string;
};

export const NO_INSTANCE: CryostatService = {
  name: '',
  namespace: '',
};

const pluginContext = (svc: CryostatService): CryostatContext => {
  return {
    url: (path?: string): Observable<string> => pluginServices.plugin.proxyUrl(`upstream/${path}`),
    headers: (init?: HeadersInit) => {
      const headers = new Headers({
        ...init,
        ...getConsoleRequestHeaders(),
        'X-CSRFToken': getCSRFToken(),
      });
      if (svc.namespace && svc.name) {
        headers.set('CRYOSTAT-SVC-NS', svc.namespace);
        headers.set('CRYOSTAT-SVC-NAME', svc.name);
      }
      return of(headers);
    },
  };
};

const services = (svc: CryostatService): Services => {
  const ctx = pluginContext(svc);
  const target = new TargetService();
  const settings = new SettingsService();
  const api = new ApiService(ctx, target, NotificationsInstance);
  const login = new LoginService(api, settings);
  const notificationChannel = new NotificationChannel(ctx, NotificationsInstance, login);
  const reports = new ReportService(ctx, NotificationsInstance, notificationChannel);
  const targets = new TargetsService(api, NotificationsInstance, notificationChannel);

  return {
    target,
    targets,
    reports,
    api,
    notificationChannel,
    settings,
    login,
  };
};

const chartControllers = (svcs: Services): Controllers => {
  const jfrChartController = new JFRMetricsChartController(
    svcs.api,
    svcs.target,
    svcs.notificationChannel,
    svcs.settings,
  );
  const mbeanChartController = new MBeanMetricsChartController(svcs.api, svcs.target, svcs.settings);
  return {
    jfrController: jfrChartController,
    mbeanController: mbeanChartController,
  };
};

const LoadingState: React.FC = () => {
  return (
    <Bullseye>
      <Spinner />
    </Bullseye>
  );
};

const ErrorState: React.FC<{ err: any }> = (err) => {
  return (
    <Card>
      <CardTitle>Error</CardTitle>
      <CardBody>
        <Text component={TextVariants.p}>{JSON.stringify(err, null, 2)}</Text>
      </CardBody>
    </Card>
  );
};

const EmptyState: React.FC = () => {
  return (
    <Card>
      <CardTitle>
        <DisconnectedIcon />
        &nbsp; No instance selected
      </CardTitle>
      <CardBody>
        <Text component={TextVariants.p}>To view this content, select a Cryostat instance.</Text>
      </CardBody>
    </Card>
  );
};

const NotificationGroup: React.FC = () => {
  const services = React.useContext(ServiceContext);
  const notificationsContext = React.useContext(NotificationsContext);
  const [notifications, setNotifications] = React.useState([] as Notification[]);
  const [visibleNotificationsCount, setVisibleNotificationsCount] = React.useState(5);

  const addSubscription = useSubscriptions();

  React.useLayoutEffect(() => {
    services.notificationChannel.disconnect();
    services.notificationChannel.connect();
    services.targets.queryForTargets().subscribe();
    services.api.testBaseServer();
    notificationsContext.clearAll();
  }, [services.notificationChannel, services.targets, services.api, notificationsContext]);

  React.useEffect(() => {
    addSubscription(services.settings.visibleNotificationsCount().subscribe(setVisibleNotificationsCount));
  }, [addSubscription, services.settings, setVisibleNotificationsCount]);

  React.useLayoutEffect(() => {
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

            // ensure we are only displaying unique notifications. Sometimes the plugin initialization
            // is buggy and we get more than one WebSocket connection, or more than one NotificationChannel
            // instance, so we get duplicated notifications in the stream. This shouldn't really happen, but
            // in case it does, try to filter them out here.
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

const ALL_NS = '#ALL_NS#';

const InstancedContainer: React.FC<{
  capabilities: Capabilities;
  service: CryostatService;
  children: React.ReactNode;
}> = ({ capabilities, service, children }) => {
  const serviceContext = services(service);
  const chartContext = chartControllers(serviceContext);
  return (
    <Provider store={store} key={service}>
      <CapabilitiesContext.Provider value={capabilities}>
        <ServiceContext.Provider value={serviceContext}>
          <ChartContext.Provider value={chartContext}>
            <NotificationsContext.Provider value={NotificationsInstance}>
              <NotificationGroup />
              <CryostatController key={`${service.namespace}-${service.name}`}>{children}</CryostatController>
            </NotificationsContext.Provider>
          </ChartContext.Provider>
        </ServiceContext.Provider>
      </CapabilitiesContext.Provider>
    </Provider>
  );
};

const NamespacedContainer: React.FC<{ searchNamespace: string; children: React.ReactNode }> = ({
  searchNamespace,
  children,
}) => {
  const [service, setService] = React.useState(() => {
    const namespace = sessionStorage.getItem(SESSIONSTORAGE_SVC_NS_KEY);
    const name = sessionStorage.getItem(SESSIONSTORAGE_SVC_NAME_KEY);
    let service = NO_INSTANCE;
    if (namespace && name) {
      service = { namespace, name };
    }
    return service;
  });

  const [instances, instancesLoaded, instancesErr] = useK8sWatchResource<K8sResourceCommon[]>({
    isList: true,
    namespaced: true,
    namespace: searchNamespace === ALL_NS ? undefined : searchNamespace,
    groupVersionKind: {
      group: '',
      kind: 'Service',
      version: 'v1',
    },
    selector: {
      matchLabels: {
        'app.kubernetes.io/part-of': 'cryostat',
        'app.kubernetes.io/component': 'cryostat',
      },
    },
  });

  const [routeModel] = useK8sModel({ group: 'route.openshift.io', version: 'v1', kind: 'Route' });
  const [enableRoute, setEnableRoute] = React.useState(true);
  const routeUrl = React.useRef('');
  const capabilities = React.useRef({
    fileUploads: false,
    openGrafana: routeUrl.current === '' ? false : `${routeUrl.current}/grafana`,
  });

  React.useMemo(() => {
    if (!service || !service.namespace || !service.name) {
      routeUrl.current = '';
      return;
    }
    const selectedNs = service.namespace;
    const selectedName = service.name;
    k8sGet({
      model: routeModel,
      name: selectedName,
      ns: selectedNs,
    })
      .catch(() => '')
      .then(
        (route: any) => {
          const ingresses = route?.status?.ingress;
          let res = '';
          if (ingresses && ingresses?.length > 0 && ingresses[0]?.host) {
            res = `http://${ingresses[0].host}`;
          }
          routeUrl.current = res;
          capabilities.current = {
            fileUploads: false,
            openGrafana: `${res}/grafana`,
          };
        },
        () => {
          routeUrl.current = '';
          capabilities.current = {
            fileUploads: false,
            openGrafana: false,
          };
        },
      );
  }, [service, routeUrl, routeModel]);

  const onSelectInstance = React.useCallback(
    (service: CryostatService) => {
      sessionStorage.setItem(SESSIONSTORAGE_SVC_NS_KEY, service.namespace);
      sessionStorage.setItem(SESSIONSTORAGE_SVC_NAME_KEY, service.name);
      setService(service);
    },
    [setService],
  );

  const openCryostatRoute = (): void => {
    window.open(routeUrl.current, '_blank', 'noreferrer');
  };

  React.useLayoutEffect(() => {
    if (!instancesLoaded) {
      return;
    }
    const selectedNs = service.namespace;
    const selectedName = service.name;
    let found = false;
    for (const instance of instances) {
      if (instance?.metadata?.namespace === selectedNs && instance?.metadata?.name === selectedName) {
        found = true;
      }
    }
    if (!found) {
      onSelectInstance(NO_INSTANCE);
    }
    setEnableRoute(found);
  }, [service, instances, onSelectInstance, instancesLoaded]);

  const noSelection = React.useMemo(
    () => !service || (service.namespace == NO_INSTANCE.namespace && service.name == NO_INSTANCE.name),
    [service],
  );

  return (
    <>
      <CryostatSelector
        instances={instances}
        renderNamespaceLabel={searchNamespace === ALL_NS}
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
        <InstancedContainer capabilities={capabilities.current} service={service}>
          {children}
        </InstancedContainer>
      )}
    </>
  );
};

export const CryostatContainer: React.FC = ({ children }) => {
  const [namespace] = useActiveNamespace();
  React.useEffect(() => checkNavHighlighting(), []);
  return <NamespacedContainer searchNamespace={namespace}>{children}</NamespacedContainer>;
};
