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
import DiagnosticsPage from '@console-plugin/pages/DiagnosticsPage';
import HeapDumpAnalysisPage from '@console-plugin/pages/HeapDumpAnalysisPage';
import HeapDumpsPage from '@console-plugin/pages/HeapDumpsPage';
import RecordingAnalyticsPage from '@console-plugin/pages/RecordingAnalyticsPage';
import ThreadDumpAnalysisPage from '@console-plugin/pages/ThreadDumpAnalysisPage';
import ThreadDumpsPage from '@console-plugin/pages/ThreadDumpsPage';
import TriggersPage from '@console-plugin/pages/TriggersPage';
import { render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('@console-plugin/components/CryostatContainer', () => ({
  CryostatContainer: ({ children }) => <div data-testid="cryostat-container-mock">{children}</div>,
}));

jest.mock('@console-plugin/components/VersionGate', () => ({
  VersionGate: ({ requiredVersion, children }) => (
    <div data-testid="version-gate-mock" data-required-version={requiredVersion}>
      {children}
    </div>
  ),
}));

jest.mock('@app/Diagnostics/CaptureDiagnostics', () => ({
  CaptureDiagnostics: () => <div data-testid="capture-diagnostics-mock" />,
}));
jest.mock('@app/Diagnostics/AnalyzeThreadDumps', () => ({
  __esModule: true,
  default: () => <div data-testid="analyze-thread-dumps-mock" />,
}));
jest.mock('@app/Diagnostics/Analysis/ThreadDumpAnalysis', () => ({
  __esModule: true,
  default: () => <div data-testid="thread-dump-analysis-mock" />,
}));
jest.mock('@app/Diagnostics/AnalyzeHeapDumps', () => ({
  __esModule: true,
  default: () => <div data-testid="analyze-heap-dumps-mock" />,
}));
jest.mock('@app/Diagnostics/Analysis/HeapDumps/HeapDumpAnalysis', () => ({
  HeapDumpAnalysis: () => <div data-testid="heap-dump-analysis-mock" />,
}));
jest.mock('@app/RecordingAnalytics/RecordingAnalytics', () => ({
  RecordingAnalytics: () => <div data-testid="recording-analytics-mock" />,
}));
jest.mock('@app/Triggers/CaptureSmartTriggers', () => ({
  __esModule: true,
  default: () => <div data-testid="capture-smart-triggers-mock" />,
}));

describe('version gated pages', () => {
  it.each([
    [DiagnosticsPage, 'capture-diagnostics-mock', '4.1.0'],
    [ThreadDumpsPage, 'analyze-thread-dumps-mock', '4.1.0'],
    [ThreadDumpAnalysisPage, 'thread-dump-analysis-mock', '4.1.0'],
    [HeapDumpsPage, 'analyze-heap-dumps-mock', '4.1.0'],
    [HeapDumpAnalysisPage, 'heap-dump-analysis-mock', '4.3.0'],
    [RecordingAnalyticsPage, 'recording-analytics-mock', '4.2.0'],
    [TriggersPage, 'capture-smart-triggers-mock', '4.2.0'],
  ])('should gate %p on Cryostat %s', (Page, testId, requiredVersion) => {
    render(<Page />);

    const container = screen.getByTestId('cryostat-container-mock');
    const gate = screen.getByTestId('version-gate-mock');

    expect(container).toContainElement(gate);
    expect(gate).toHaveAttribute('data-required-version', requiredVersion);
    expect(gate).toContainElement(screen.getByTestId(testId));
  });
});
