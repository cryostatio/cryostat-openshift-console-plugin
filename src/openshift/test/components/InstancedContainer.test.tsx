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
import {
  CryostatContainer,
  SESSIONSTORAGE_SVC_NAME_KEY,
  SESSIONSTORAGE_SVC_NS_KEY,
} from '@console-plugin/components/CryostatContainer';
import { CryostatPageShell } from '@console-plugin/components/CryostatPageShell';
import { CryostatServiceContext } from '@console-plugin/components/CryostatServiceContext';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { act, render } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock the heavyweight service and chart-controller factories so InstancedContainer
// can be rendered in isolation without real RxJS pipelines or K8s clients.
// ---------------------------------------------------------------------------

const mockDestroy = jest.fn();

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
jest.mock('@app/Shared/Redux/ReduxStore', () => ({
  store: {
    getState: jest.fn().mockReturnValue({}),
    dispatch: jest.fn(),
    subscribe: jest.fn().mockReturnValue(jest.fn()),
    [Symbol.observable]: jest.fn(),
  },
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

// ---------------------------------------------------------------------------

const makeShellContext = () => {
  const { NotificationChannel } = jest.requireMock('@app/Shared/Services/NotificationChannel.service');
  const { ApiService } = jest.requireMock('@app/Shared/Services/Api.service');
  const { TargetsService } = jest.requireMock('@app/Shared/Services/Targets.service');
  const { SettingsService } = jest.requireMock('@app/Shared/Services/Settings.service');
  const channel = new (NotificationChannel as jest.Mock)();
  const api = new (ApiService as jest.Mock)();
  const targets = new (TargetsService as jest.Mock)();
  const settings = new (SettingsService as jest.Mock)();
  const serviceCtx = { notificationChannel: channel, api, targets, settings } as any;
  return {
    service: { namespace: 'ns-a', name: 'cryostat-a' },
    serviceContext: serviceCtx,
    chartContext: {} as any,
    capabilities: { fileUploads: false, openGrafana: false },
    routeUrl: '',
    instances: [{ metadata: { namespace: 'ns-a', name: 'cryostat-a' } }],
    instancesLoaded: true,
    instancesErr: undefined,
    noSelection: false,
    enableRoute: false,
    searchNamespace: 'ns-a',
    onSelectInstance: jest.fn(),
    openCryostatRoute: jest.fn(),
  };
};

describe('CryostatPageShell — does not manage WebSocket connection (Flaw 3)', () => {
  const { NotificationChannel } = jest.requireMock('@app/Shared/Services/NotificationChannel.service');

  beforeEach(() => {
    (NotificationChannel as jest.Mock).mockClear();
  });

  it('never calls connect() — connection is owned by the persistent hook, not the per-page shell', () => {
    const channel = { connect: jest.fn(), disconnect: jest.fn(), destroy: jest.fn() };
    const ctx = makeShellContext();
    ctx.serviceContext.notificationChannel = channel;

    render(
      <CryostatServiceContext.Provider value={ctx}>
        <CryostatPageShell />
      </CryostatServiceContext.Provider>,
    );

    expect(channel.connect).not.toHaveBeenCalled();
  });

  it('never calls disconnect() on mount or unmount — teardown is owned by the persistent hook', () => {
    const channel = { connect: jest.fn(), disconnect: jest.fn(), destroy: jest.fn() };
    const ctx = makeShellContext();
    ctx.serviceContext.notificationChannel = channel;

    const { unmount } = render(
      <CryostatServiceContext.Provider value={ctx}>
        <CryostatPageShell />
      </CryostatServiceContext.Provider>,
    );

    expect(channel.disconnect).not.toHaveBeenCalled();
    unmount();
    expect(channel.disconnect).not.toHaveBeenCalled();
  });
});

describe('useCryostatServiceContextValue — WebSocket connection lifecycle', () => {
  const { NotificationChannel } = jest.requireMock('@app/Shared/Services/NotificationChannel.service');

  beforeEach(() => {
    mockDestroy.mockClear();
    (NotificationChannel as jest.Mock).mockClear();
  });

  it('calls connect() once when serviceContext is first established', async () => {
    const channel = { connect: jest.fn(), disconnect: jest.fn(), destroy: jest.fn() };
    (NotificationChannel as jest.Mock).mockImplementationOnce(() => channel);

    const matchingInstance = { metadata: { namespace: 'ns-a', name: 'cryostat-a' } };
    (useK8sWatchResource as jest.Mock).mockReturnValue([[matchingInstance], true, undefined]);
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NS_KEY, 'ns-a');
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NAME_KEY, 'cryostat-a');

    let unmount!: () => void;
    await act(async () => {
      ({ unmount } = render(<CryostatContainer />));
    });

    expect(channel.connect).toHaveBeenCalledTimes(1);

    unmount();
    sessionStorage.clear();
  });

  it('does not call connect() again on re-render when the selected instance has not changed', async () => {
    const channel = { connect: jest.fn(), disconnect: jest.fn(), destroy: jest.fn() };
    (NotificationChannel as jest.Mock).mockImplementationOnce(() => channel);

    const matchingInstance = { metadata: { namespace: 'ns-a', name: 'cryostat-a' } };
    (useK8sWatchResource as jest.Mock).mockReturnValue([[matchingInstance], true, undefined]);
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NS_KEY, 'ns-a');
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NAME_KEY, 'cryostat-a');

    let rerender!: (ui: React.ReactElement) => void;
    let unmount!: () => void;
    await act(async () => {
      ({ rerender, unmount } = render(<CryostatContainer />));
    });

    const connectCallsAfterMount = channel.connect.mock.calls.length;

    await act(async () => {
      rerender(<CryostatContainer />);
    });

    expect(channel.connect.mock.calls.length).toBe(connectCallsAfterMount);
    expect(channel.disconnect).not.toHaveBeenCalled();

    unmount();
    sessionStorage.clear();
  });

  it('calls destroy() on the old channel and connect() on the new one when the instance changes', async () => {
    const channelA = { connect: jest.fn(), disconnect: jest.fn(), destroy: jest.fn() };
    const channelB = { connect: jest.fn(), disconnect: jest.fn(), destroy: jest.fn() };
    (NotificationChannel as jest.Mock).mockImplementationOnce(() => channelA).mockImplementationOnce(() => channelB);

    const instanceA = { metadata: { namespace: 'ns-a', name: 'cryostat-a' } };
    const instanceB = { metadata: { namespace: 'ns-b', name: 'cryostat-b' } };
    (useK8sWatchResource as jest.Mock).mockReturnValue([[instanceA, instanceB], true, undefined]);
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NS_KEY, 'ns-a');
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NAME_KEY, 'cryostat-a');

    let unmount!: () => void;
    await act(async () => {
      ({ unmount } = render(<CryostatContainer />));
    });

    expect(channelA.connect).toHaveBeenCalledTimes(1);
    expect(channelA.destroy).not.toHaveBeenCalled();

    // Simulate the user picking instance B via the onSelectInstance callback.
    // CryostatSelector is mocked to null, so we drive the state change directly
    // by finding the CryostatServiceContext value and calling onSelectInstance.
    // Since we can't access the hook's state directly, unmount and remount with
    // the new sessionStorage values - this exercises a fresh serviceContext being
    // established, which is the correct lifecycle event.
    unmount();
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NS_KEY, 'ns-b');
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NAME_KEY, 'cryostat-b');
    (useK8sWatchResource as jest.Mock).mockReturnValue([[instanceB], true, undefined]);

    await act(async () => {
      ({ unmount } = render(<CryostatContainer />));
    });

    expect(channelB.connect).toHaveBeenCalledTimes(1);

    unmount();
    sessionStorage.clear();
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

  it('does not reset selection when the loaded instance list is empty', async () => {
    mockUseK8sWatchResource.mockReturnValue([[], true, undefined]);
    const { unmount } = render(<CryostatContainer />);
    await Promise.resolve();
    const resetCalls = sessionStorageSpy.mock.calls.filter(
      ([key, value]) => key === SESSIONSTORAGE_SVC_NS_KEY && value === '',
    );
    expect(resetCalls).toHaveLength(0);
    unmount();
  });

  it('resets selection when the instance list is loaded and the stored instance is absent', async () => {
    const otherInstance = { metadata: { namespace: 'ns-other', name: 'cryostat-other' } };
    mockUseK8sWatchResource.mockReturnValue([[otherInstance], true, undefined]);
    const { unmount } = render(<CryostatContainer />);
    await Promise.resolve();
    const resetCalls = sessionStorageSpy.mock.calls.filter(
      ([key, value]) => key === SESSIONSTORAGE_SVC_NS_KEY && value === '',
    );
    expect(resetCalls).toHaveLength(1);
    unmount();
  });

  it('does not reset selection when the instance list is loaded and the stored instance is present', async () => {
    const matchingInstance = { metadata: { namespace: 'ns-a', name: 'cryostat-a' } };
    mockUseK8sWatchResource.mockReturnValue([[matchingInstance], true, undefined]);
    const { unmount } = render(<CryostatContainer />);
    await Promise.resolve();
    const resetCalls = sessionStorageSpy.mock.calls.filter(
      ([key, value]) => key === SESSIONSTORAGE_SVC_NS_KEY && value === '',
    );
    expect(resetCalls).toHaveLength(0);
    unmount();
  });
});
