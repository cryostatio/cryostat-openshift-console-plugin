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
import { store } from '@app/Shared/Redux/ReduxStore';
import { ApiService } from '@app/Shared/Services/Api.service';
import { Capabilities, CapabilitiesContext } from '@app/Shared/Services/Capabilities';
import { HeapDumpReportService } from '@app/Shared/Services/HeapDumpReport.service';
import { LoginService } from '@app/Shared/Services/Login.service';
import { NotificationChannel } from '@app/Shared/Services/NotificationChannel.service';
import { NotificationsContext, NotificationsInstance } from '@app/Shared/Services/Notifications.service';
import { ReportService } from '@app/Shared/Services/Report.service';
import { CryostatContext, ServiceContext, Services } from '@app/Shared/Services/Services';
import { SettingsService } from '@app/Shared/Services/Settings.service';
import { TargetService } from '@app/Shared/Services/Target.service';
import { TargetAliasService } from '@app/Shared/Services/TargetAlias.service';
import { TargetsService } from '@app/Shared/Services/Targets.service';
import { pluginServices } from '@console-plugin/services/PluginContext';
import { consoleFetch } from '@openshift-console/dynamic-plugin-sdk';
import { Bullseye, Spinner } from '@patternfly/react-core';
import * as React from 'react';
import { Provider } from 'react-redux';
import { Observable, of } from 'rxjs';
import { CryostatPageShell } from './CryostatPageShell';
import {
  CryostatContextProvider,
  CryostatService,
  CryostatServiceContext,
  NO_INSTANCE,
  SESSIONSTORAGE_SVC_NAME_KEY,
  SESSIONSTORAGE_SVC_NS_KEY,
  useCryostatServiceContextValue,
} from './CryostatServiceContext';

export { CryostatService, NO_INSTANCE, SESSIONSTORAGE_SVC_NAME_KEY, SESSIONSTORAGE_SVC_NS_KEY };

const pluginContext = (svc: CryostatService): CryostatContext => {
  return {
    url: (path?: string): Observable<string> => pluginServices.plugin.proxyUrl(`upstream/${path}`),
    headers: (init?: HeadersInit) => {
      const headers = new Headers(init);
      if (svc.namespace && svc.name) {
        headers.set('CRYOSTAT-SVC-NS', svc.namespace);
        headers.set('CRYOSTAT-SVC-NAME', svc.name);
      }
      return of(headers);
    },
  };
};

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

const services = (svc: CryostatService): Services => {
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

  return {
    target,
    targets,
    reports,
    api,
    notificationChannel,
    settings,
    login,
    targetAlias,
    heapDumpReports,
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

export const LoadingState: React.FC = () => {
  return (
    <Bullseye>
      <Spinner />
    </Bullseye>
  );
};

/**
 * Container that provides service contexts and wraps content with .cryostat-app
 * for CSS scoping to prevent conflicts with OpenShift Console styles.
 */
export const InstancedContainer: React.FC<{
  capabilities: Capabilities;
  service: CryostatService;
  children?: React.ReactNode;
}> = ({ capabilities, service, children }) => {
  const serviceContext = React.useMemo(
    () => services(service),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [service.namespace, service.name],
  );
  const chartContext = React.useMemo(() => chartControllers(serviceContext), [serviceContext]);

  React.useEffect(() => {
    return () => {
      serviceContext.notificationChannel.destroy();
    };
  }, [serviceContext]);

  return (
    <Provider store={store} key={`${service.namespace}/${service.name}`}>
      <CapabilitiesContext.Provider value={capabilities}>
        <ServiceContext.Provider value={serviceContext}>
          <ChartContext.Provider value={chartContext}>
            <NotificationsContext.Provider value={NotificationsInstance}>
              <div className="cryostat-app">{children}</div>
            </NotificationsContext.Provider>
          </ChartContext.Provider>
        </ServiceContext.Provider>
      </CapabilitiesContext.Provider>
    </Provider>
  );
};

/**
 * Provides a local CryostatServiceContext and renders CryostatPageShell.
 *
 * When the plugin runs inside the OpenShift Console with the console.context-provider
 * extension registered, the Console mounts CryostatContextProvider at the application
 * root and CryostatPageShell reads from that persistent context - this wrapper is
 * bypassed. When running standalone or in tests, this wrapper supplies a local context
 * instead so that CryostatPageShell still functions correctly.
 */
const LocalCryostatProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const value = useCryostatServiceContextValue();
  return (
    <CryostatContextProvider value={value}>
      <CryostatPageShell>{children}</CryostatPageShell>
    </CryostatContextProvider>
  );
};

export const CryostatContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const ctxValue = React.useContext(CryostatServiceContext);
  const hasProvider = ctxValue !== null && ctxValue.serviceContext !== (undefined as unknown as Services);

  if (hasProvider && ctxValue.searchNamespace !== '') {
    return <CryostatPageShell>{children}</CryostatPageShell>;
  }
  return <LocalCryostatProvider>{children}</LocalCryostatProvider>;
};
