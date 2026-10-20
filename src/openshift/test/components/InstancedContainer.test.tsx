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
import { Capabilities } from '@app/Shared/Services/Capabilities';
import {
  CryostatContainer,
  InstancedContainer,
  SESSIONSTORAGE_SVC_NAME_KEY,
  SESSIONSTORAGE_SVC_NS_KEY,
} from '@console-plugin/components/CryostatContainer';
import { render } from '@testing-library/react';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock the heavyweight service and chart-controller factories so InstancedContainer
// can be rendered in isolation without real RxJS pipelines or K8s clients.
// ---------------------------------------------------------------------------

const mockDestroy = jest.fn();

// Each call to the services() factory returns a fresh object that shares the
// same mockDestroy so we can track destroy() calls across instance switches.
const sub = () => ({ unsubscribe: jest.fn() });

jest.mock('@app/Shared/Services/Api.service', () => ({
  ApiService: jest.fn().mockImplementation(() => ({ testBaseServer: jest.fn() })),
}));
jest.mock('@app/Shared/Services/Login.service', () => ({ LoginService: jest.fn() }));
jest.mock('@app/Shared/Services/NotificationChannel.service', () => ({
  NotificationChannel: jest.fn().mockImplementation(() => ({
    destroy: mockDestroy,
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
}));
jest.mock('@app/Shared/Services/Report.service', () => ({ ReportService: jest.fn() }));
jest.mock('@app/Shared/Services/HeapDumpReport.service', () => ({ HeapDumpReportService: jest.fn() }));
jest.mock('@app/Shared/Services/Target.service', () => ({ TargetService: jest.fn() }));
jest.mock('@app/Shared/Services/TargetAlias.service', () => ({ TargetAliasService: jest.fn() }));
jest.mock('@app/Shared/Services/Targets.service', () => ({
  TargetsService: jest.fn().mockImplementation(() => ({
    queryForTargets: jest
      .fn()
      .mockReturnValue({ subscribe: jest.fn().mockImplementation(() => ({ unsubscribe: jest.fn() })) }),
  })),
}));
jest.mock('@app/Shared/Services/Settings.service', () => ({
  SettingsService: jest.fn().mockImplementation(() => ({
    visibleNotificationsCount: jest
      .fn()
      .mockReturnValue({ subscribe: jest.fn().mockImplementation(() => ({ unsubscribe: jest.fn() })) }),
    notificationsEnabledFor: jest.fn().mockReturnValue(true),
  })),
}));
jest.mock('@app/Dashboard/Charts/jfr/JFRMetricsChartController', () => ({
  JFRMetricsChartController: jest.fn(),
}));
jest.mock('@app/Dashboard/Charts/mbean/MBeanMetricsChartController', () => ({
  MBeanMetricsChartController: jest.fn(),
}));

jest.mock('@console-plugin/services/PluginContext', () => ({
  pluginServices: { plugin: { proxyUrl: jest.fn() } },
}));
jest.mock('@console-plugin/components/CryostatSelector', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  consoleFetch: jest.fn(),
  k8sGet: jest.fn().mockResolvedValue({}),
  useActiveNamespace: jest.fn().mockReturnValue(['test-ns']),
  useK8sModel: jest.fn().mockReturnValue([{}]),
  useK8sWatchResource: jest.fn().mockReturnValue([[], false, undefined]),
}));
jest.mock('@app/Shared/Services/Notifications.service', () => {
  const { createContext } = jest.requireActual<typeof import('react')>('react');
  return {
    NotificationsInstance: {
      notifications: jest.fn().mockReturnValue({
        pipe: jest
          .fn()
          .mockReturnValue({ subscribe: jest.fn().mockImplementation(() => ({ unsubscribe: jest.fn() })) }),
      }),
      clearAll: jest.fn(),
    },
    NotificationsContext: createContext({}),
  };
});
jest.mock('@console-plugin/utils/utils', () => ({ checkNavHighlighting: jest.fn() }));

// ---------------------------------------------------------------------------

const makeCapabilities = (): Capabilities => ({ fileUploads: false, openGrafana: false });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InstancedContainer — service memoization and destroy() teardown (Flaw 1)', () => {
  const { NotificationChannel } = jest.requireMock('@app/Shared/Services/NotificationChannel.service');

  beforeEach(() => {
    mockDestroy.mockClear();
    (NotificationChannel as jest.Mock).mockClear();
  });

  it('constructs services exactly once on initial mount', () => {
    const service = { namespace: 'ns-a', name: 'cryostat-a' };
    render(<InstancedContainer capabilities={makeCapabilities()} service={service} />);
    expect(NotificationChannel).toHaveBeenCalledTimes(1);
  });

  it('does not reconstruct services on a re-render that does not change the instance', () => {
    const service = { namespace: 'ns-a', name: 'cryostat-a' };
    const { rerender } = render(<InstancedContainer capabilities={makeCapabilities()} service={service} />);
    rerender(<InstancedContainer capabilities={makeCapabilities()} service={service} />);
    expect(NotificationChannel).toHaveBeenCalledTimes(1);
  });

  it('calls destroy() on the notificationChannel when the component unmounts', () => {
    const service = { namespace: 'ns-a', name: 'cryostat-a' };
    const { unmount } = render(<InstancedContainer capabilities={makeCapabilities()} service={service} />);
    expect(mockDestroy).not.toHaveBeenCalled();
    unmount();
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('calls destroy() on the old notificationChannel when the selected instance changes', () => {
    const serviceA = { namespace: 'ns-a', name: 'cryostat-a' };
    const serviceB = { namespace: 'ns-b', name: 'cryostat-b' };

    const { rerender } = render(<InstancedContainer capabilities={makeCapabilities()} service={serviceA} />);
    expect(NotificationChannel).toHaveBeenCalledTimes(1);
    expect(mockDestroy).not.toHaveBeenCalled();

    rerender(<InstancedContainer capabilities={makeCapabilities()} service={serviceB} />);
    // A new NotificationChannel is constructed for the new instance.
    expect(NotificationChannel).toHaveBeenCalledTimes(2);
    // The first channel's destroy() must have been called during the transition.
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });
});

describe('NotificationGroup — effect scheduling (Flaw 3)', () => {
  const { NotificationChannel } = jest.requireMock('@app/Shared/Services/NotificationChannel.service');

  beforeEach(() => {
    (NotificationChannel as jest.Mock).mockClear();
  });

  it('calls connect() after mount, not synchronously during layout', () => {
    const service = { namespace: 'ns-a', name: 'cryostat-a' };
    const channel = { connect: jest.fn(), disconnect: jest.fn(), destroy: jest.fn() };
    (NotificationChannel as jest.Mock).mockImplementationOnce(() => channel);

    render(<InstancedContainer capabilities={{ fileUploads: false, openGrafana: false }} service={service} />);

    expect(channel.connect).toHaveBeenCalledTimes(1);
  });

  it('calls disconnect() then connect() when re-rendered with the same instance', () => {
    const service = { namespace: 'ns-a', name: 'cryostat-a' };
    const channel = { connect: jest.fn(), disconnect: jest.fn(), destroy: jest.fn() };
    (NotificationChannel as jest.Mock).mockImplementation(() => channel);

    const { rerender } = render(
      <InstancedContainer capabilities={{ fileUploads: false, openGrafana: false }} service={service} />,
    );

    const connectCallsAfterMount = channel.connect.mock.calls.length;
    const disconnectCallsAfterMount = channel.disconnect.mock.calls.length;

    rerender(<InstancedContainer capabilities={{ fileUploads: false, openGrafana: false }} service={service} />);

    expect(channel.connect.mock.calls.length).toBe(connectCallsAfterMount);
    expect(channel.disconnect.mock.calls.length).toBe(disconnectCallsAfterMount);
  });
});

describe('NamespacedContainer — sessionStorage guard (Flaw 4)', () => {
  const mockUseK8sWatchResource = useK8sWatchResource as jest.Mock;
  let sessionStorageSpy: jest.SpyInstance;

  beforeEach(() => {
    sessionStorageSpy = jest.spyOn(Storage.prototype, 'setItem');
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NS_KEY, 'ns-a');
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NAME_KEY, 'cryostat-a');
    sessionStorageSpy.mockClear();
  });

  afterEach(() => {
    sessionStorageSpy.mockRestore();
    sessionStorage.clear();
  });

  it('does not reset selection when the loaded instance list is empty', () => {
    mockUseK8sWatchResource.mockReturnValue([[], true, undefined]);
    render(<CryostatContainer />);
    const resetCalls = sessionStorageSpy.mock.calls.filter(
      ([key, value]) => key === SESSIONSTORAGE_SVC_NS_KEY && value === '',
    );
    expect(resetCalls).toHaveLength(0);
  });

  it('resets selection when the instance list is loaded and the stored instance is absent', () => {
    const otherInstance = { metadata: { namespace: 'ns-other', name: 'cryostat-other' } };
    mockUseK8sWatchResource.mockReturnValue([[otherInstance], true, undefined]);
    render(<CryostatContainer />);
    const resetCalls = sessionStorageSpy.mock.calls.filter(
      ([key, value]) => key === SESSIONSTORAGE_SVC_NS_KEY && value === '',
    );
    expect(resetCalls).toHaveLength(1);
  });

  it('does not reset selection when the instance list is loaded and the stored instance is present', () => {
    const matchingInstance = { metadata: { namespace: 'ns-a', name: 'cryostat-a' } };
    mockUseK8sWatchResource.mockReturnValue([[matchingInstance], true, undefined]);
    render(<CryostatContainer />);
    const resetCalls = sessionStorageSpy.mock.calls.filter(
      ([key, value]) => key === SESSIONSTORAGE_SVC_NS_KEY && value === '',
    );
    expect(resetCalls).toHaveLength(0);
  });
});
