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
import * as React from 'react';
import { store } from '@app/Shared/Redux/ReduxStore';
import { Provider } from 'react-redux';
import { CryostatController } from './CryostatController';
import { CryostatContext, ServiceContext, Services } from '@app/Shared/Services/Services';
import { TargetService } from '@app/Shared/Services/Target.service';
import { SettingsService } from '@app/Shared/Services/Settings.service';
import { LoginService } from '@app/Shared/Services/Login.service';
import { ApiService } from '@app/Shared/Services/Api.service';
import { NotificationsInstance } from '@app/Shared/Services/Notifications.service';
import { NotificationChannel } from '@app/Shared/Services/NotificationChannel.service';
import { ReportService } from '@app/Shared/Services/Report.service';
import { TargetsService } from '@app/Shared/Services/Targets.service';
import { pluginServices } from '@console-plugin/services/PluginContext';
import { Observable, of } from 'rxjs';
import CryostatSelector from './CryostatSelector';
import { Card, CardBody, CardTitle, Text, TextVariants } from '@patternfly/react-core';
import { DisconnectedIcon } from '@patternfly/react-icons';
import {
  getConsoleRequestHeaders,
  getCSRFToken,
} from '@openshift-console/dynamic-plugin-sdk/lib/utils/fetch/console-fetch-utils';

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
  const login = new LoginService(ctx.url, settings);
  const api = new ApiService(ctx, target, NotificationsInstance);
  const notificationChannel = new NotificationChannel(ctx, NotificationsInstance, login);
  const reports = new ReportService(NotificationsInstance, notificationChannel);
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

const EmptyState: React.FC = () => {
  return (
    <>
      <Card>
        <CardTitle>
          <DisconnectedIcon />
          &nbsp; No instance selected
        </CardTitle>
        <CardBody>
          <Text component={TextVariants.p}>To view this content, select a Cryostat instance.</Text>
        </CardBody>
      </Card>
    </>
  );
};

interface NotificationChannelConnectorProps {
  instance: CryostatService;
}

const NotificationChannelConnector: React.FC<NotificationChannelConnectorProps> = (props) => {
  const services = React.useContext(ServiceContext);
  React.useEffect(() => {
    services.notificationChannel.disconnect();
    services.notificationChannel.connect();
  }, [props.instance, services.notificationChannel]);

  return <></>;
};

export const CryostatContainer: React.FC = ({ children }) => {
  const [service, setService] = React.useState(() => {
    const namespace = sessionStorage.getItem(SESSIONSTORAGE_SVC_NS_KEY);
    const name = sessionStorage.getItem(SESSIONSTORAGE_SVC_NAME_KEY);
    let service = NO_INSTANCE;
    if (namespace && name) {
      service = { namespace, name };
    }
    return service;
  });

  React.useEffect(() => {
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NS_KEY, service.namespace);
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NAME_KEY, service.name);
  }, [service, sessionStorage]);

  const noSelection = React.useMemo(() => {
    return service.namespace == NO_INSTANCE.namespace && service.name == NO_INSTANCE.name;
  }, [service]);

  return (
    <>
      <CryostatSelector setSelectedCryostat={setService} />
      <Provider store={store}>
        {noSelection ? (
          <EmptyState />
        ) : (
          <ServiceContext.Provider value={services(service)}>
            <NotificationChannelConnector instance={service} />
            <CryostatController key={`${service.namespace}-${service.name}`}>{children}</CryostatController>
          </ServiceContext.Provider>
        )}
      </Provider>
    </>
  );
};
