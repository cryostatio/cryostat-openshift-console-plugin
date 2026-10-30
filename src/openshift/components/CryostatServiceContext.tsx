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
import { ChartContext, Controllers } from '@app/Dashboard/Charts/context';
import { JFRMetricsChartController } from '@app/Dashboard/Charts/jfr/JFRMetricsChartController';
import { MBeanMetricsChartController } from '@app/Dashboard/Charts/mbean/MBeanMetricsChartController';
import { ApiService } from '@app/Shared/Services/Api.service';
import { Capabilities } from '@app/Shared/Services/Capabilities';
import { HeapDumpReportService } from '@app/Shared/Services/HeapDumpReport.service';
import { LoginService } from '@app/Shared/Services/Login.service';
import { NotificationChannel } from '@app/Shared/Services/NotificationChannel.service';
import { NotificationsInstance } from '@app/Shared/Services/Notifications.service';
import { ReportService } from '@app/Shared/Services/Report.service';
import { CryostatContext, ServiceContext, Services } from '@app/Shared/Services/Services';
import { SettingsService } from '@app/Shared/Services/Settings.service';
import { TargetService } from '@app/Shared/Services/Target.service';
import { TargetAliasService } from '@app/Shared/Services/TargetAlias.service';
import { TargetsService } from '@app/Shared/Services/Targets.service';
import { pluginServices } from '@console-plugin/services/PluginContext';
import {
  consoleFetch,
  k8sGet,
  K8sResourceCommon,
  useActiveNamespace,
  useK8sModel,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as React from 'react';
import { Observable, of } from 'rxjs';

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

export interface CryostatServiceContextValue {
  service: CryostatService;
  serviceContext: Services;
  chartContext: Controllers;
  capabilities: Capabilities;
  routeUrl: string;
  instances: K8sResourceCommon[];
  instancesLoaded: boolean;
  instancesErr: unknown;
  noSelection: boolean;
  enableRoute: boolean;
  searchNamespace: string;
  onSelectInstance: (svc: CryostatService) => void;
  openCryostatRoute: () => void;
}

const defaultValue: CryostatServiceContextValue = {
  service: NO_INSTANCE,
  serviceContext: {} as Services,
  chartContext: {} as Controllers,
  capabilities: { fileUploads: false, openGrafana: false },
  routeUrl: '',
  instances: [],
  instancesLoaded: false,
  instancesErr: undefined,
  noSelection: true,
  enableRoute: false,
  searchNamespace: '',
  onSelectInstance: () => undefined,
  openCryostatRoute: () => undefined,
};

export const CryostatServiceContext = React.createContext<CryostatServiceContextValue>(defaultValue);

const ALL_NS = '#ALL_NS#';

const pluginContext = (svc: CryostatService): CryostatContext => ({
  url: (path?: string): Observable<string> => pluginServices.plugin.proxyUrl(`upstream/${path}`),
  headers: (init?: HeadersInit) => {
    const headers = new Headers(init);
    if (svc.namespace && svc.name) {
      headers.set('CRYOSTAT-SVC-NS', svc.namespace);
      headers.set('CRYOSTAT-SVC-NAME', svc.name);
    }
    return of(headers);
  },
});

const wrappedConsoleFetch: typeof consoleFetch = (url, options, timeout) => {
  if (options?.headers instanceof Headers) {
    const plain: Record<string, string> = {};
    options.headers.forEach((v, k) => {
      plain[k] = v;
    });
    options = { ...options, headers: plain };
  }
  return consoleFetch(url, options, timeout);
};

const buildServices = (svc: CryostatService): Services => {
  const ctx = pluginContext(svc);
  const target = new TargetService();
  const settings = new SettingsService();
  const api = new ApiService(ctx, target, NotificationsInstance, wrappedConsoleFetch, false);
  const login = new LoginService(api, settings);
  const notificationChannel = new NotificationChannel(ctx, NotificationsInstance, login);
  const reports = new ReportService(ctx, NotificationsInstance, notificationChannel);
  const targets = new TargetsService(api, NotificationsInstance, notificationChannel);
  const targetAlias = new TargetAliasService(api);
  const heapDumpReports = new HeapDumpReportService(ctx, notificationChannel);
  return { target, targets, reports, api, notificationChannel, settings, login, targetAlias, heapDumpReports };
};

const buildChartControllers = (svcs: Services): Controllers => ({
  jfrController: new JFRMetricsChartController(svcs.api, svcs.target, svcs.notificationChannel, svcs.settings),
  mbeanController: new MBeanMetricsChartController(svcs.api, svcs.target, svcs.settings),
});

export function useCryostatServiceContextValue(): CryostatServiceContextValue {
  const [namespace] = useActiveNamespace();
  const searchNamespace = namespace;

  const [service, setService] = React.useState<CryostatService>(() => {
    const ns = sessionStorage.getItem(SESSIONSTORAGE_SVC_NS_KEY);
    const name = sessionStorage.getItem(SESSIONSTORAGE_SVC_NAME_KEY);
    return ns && name ? { namespace: ns, name } : NO_INSTANCE;
  });

  const [instances, instancesLoaded, instancesErr] = useK8sWatchResource<K8sResourceCommon[]>({
    isList: true,
    namespaced: true,
    namespace: searchNamespace === ALL_NS ? undefined : searchNamespace,
    groupVersionKind: { group: '', kind: 'Service', version: 'v1' },
    selector: {
      matchLabels: {
        'app.kubernetes.io/part-of': 'cryostat',
        'app.kubernetes.io/component': 'cryostat',
      },
    },
  });

  const [routeModel] = useK8sModel({ group: 'route.openshift.io', version: 'v1', kind: 'Route' });
  const [enableRoute, setEnableRoute] = React.useState(false);
  const [capabilities, setCapabilities] = React.useState<Capabilities>({ fileUploads: false, openGrafana: false });
  const [routeUrl, setRouteUrl] = React.useState('');

  React.useEffect(() => {
    if (!service || !service.namespace || !service.name) {
      setCapabilities({ fileUploads: false, openGrafana: false });
      setRouteUrl('');
      return;
    }
    let cancelled = false;
    k8sGet({ model: routeModel, name: service.name, ns: service.namespace })
      .catch(() => '')
      .then(
        (route: any) => {
          if (cancelled) return;
          const ingresses = route?.status?.ingress;
          let res = '';
          if (ingresses && ingresses?.length > 0 && ingresses[0]?.host) {
            res = `http://${ingresses[0].host}`;
          }
          setRouteUrl(res);
          setCapabilities({ fileUploads: false, openGrafana: res ? `${res}/grafana` : false });
        },
        () => {
          if (cancelled) return;
          setRouteUrl('');
          setCapabilities({ fileUploads: false, openGrafana: false });
        },
      );
    return () => {
      cancelled = true;
    };
  }, [service, routeModel]);

  const onSelectInstance = React.useCallback((svc: CryostatService) => {
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NS_KEY, svc.namespace);
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NAME_KEY, svc.name);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: SESSIONSTORAGE_SVC_NS_KEY,
        newValue: svc.namespace,
        storageArea: sessionStorage,
      }),
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: SESSIONSTORAGE_SVC_NAME_KEY,
        newValue: svc.name,
        storageArea: sessionStorage,
      }),
    );
    setService(svc);
  }, []);

  const openCryostatRoute = React.useCallback(() => {
    window.open(routeUrl, '_blank', 'noreferrer');
  }, [routeUrl]);

  React.useLayoutEffect(() => {
    if (!instancesLoaded) {
      return;
    }
    if (instances.length === 0) {
      const { namespace: selectedNs, name: selectedName } = service;
      if (selectedNs || selectedName) {
        onSelectInstance(NO_INSTANCE);
      }
      setEnableRoute(false);
      return;
    }
    const { namespace: selectedNs, name: selectedName } = service;
    let found = false;
    for (const instance of instances) {
      if (instance?.metadata?.namespace === selectedNs && instance?.metadata?.name === selectedName) {
        found = true;
      }
    }
    if (!found && (selectedNs || selectedName)) {
      onSelectInstance(NO_INSTANCE);
    }
    setEnableRoute(found);
  }, [service, instances, onSelectInstance, instancesLoaded]);

  const noSelection = React.useMemo(
    () => !service || (service.namespace === NO_INSTANCE.namespace && service.name === NO_INSTANCE.name),
    [service],
  );

  const serviceContext = React.useMemo(
    () => buildServices(service),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [service.namespace, service.name],
  );

  const chartContext = React.useMemo(() => buildChartControllers(serviceContext), [serviceContext]);

  React.useEffect(() => {
    serviceContext.notificationChannel.connect();
    return () => {
      serviceContext.notificationChannel.destroy();
    };
  }, [serviceContext]);

  return React.useMemo(
    () => ({
      service,
      serviceContext,
      chartContext,
      capabilities,
      routeUrl,
      instances,
      instancesLoaded,
      instancesErr,
      noSelection,
      enableRoute,
      searchNamespace,
      onSelectInstance,
      openCryostatRoute,
    }),
    [
      service,
      serviceContext,
      chartContext,
      capabilities,
      routeUrl,
      instances,
      instancesLoaded,
      instancesErr,
      noSelection,
      enableRoute,
      searchNamespace,
      onSelectInstance,
      openCryostatRoute,
    ],
  );
}

export const CryostatContextProvider = CryostatServiceContext.Provider;

export { ChartContext, ServiceContext };
