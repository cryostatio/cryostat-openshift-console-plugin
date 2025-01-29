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
import { Observable } from 'rxjs';
import CryostatSelector from './CryostatSelector';

const SESSIONSTORAGE_SVC_NS_KEY = 'cryostat-svc-ns';
const SESSIONSTORAGE_SVC_NAME_KEY = 'cryostat-svc-name';

export type CryostatService = {
  name: string;
  namespace: string;
};

export const pluginContext: CryostatContext = {
  url: (path?: string): Observable<string> => pluginServices.plugin.proxyUrl(`upstream/${path}`),
  headers: () => {
    const headers = new Headers({
      'CRYOSTAT-SVC-NS': sessionStorage.getItem(SESSIONSTORAGE_SVC_NS_KEY) || '',
      'CRYOSTAT-SVC-NAME': sessionStorage.getItem(SESSIONSTORAGE_SVC_NAME_KEY) || '',
    });
    return headers;
  },
};

const target = new TargetService();
const settings = new SettingsService();
const login = new LoginService(pluginContext.url, settings);
const api = new ApiService(pluginContext, target, NotificationsInstance);
const notificationChannel = new NotificationChannel(NotificationsInstance, login);
const reports = new ReportService(NotificationsInstance, notificationChannel);
const targets = new TargetsService(api, NotificationsInstance, notificationChannel);

const services: Services = {
  target,
  targets,
  reports,
  api,
  notificationChannel,
  settings,
  login,
};

export const CryostatContainer: React.FC = ({ children }) => {
  const [service, setService] = React.useState({ namespace: '', name: '' } as CryostatService);

  React.useLayoutEffect(() => {
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NS_KEY, service.namespace);
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NAME_KEY, service.name);
  }, [sessionStorage, service]);

  return (
    <ServiceContext.Provider value={services}>
      <CryostatSelector setSelectedCryostat={setService} />
      <Provider store={store}>
        <CryostatController key={`${service.namespace}-${service.name}`}>{children}</CryostatController>
      </Provider>
    </ServiceContext.Provider>
  );
};
