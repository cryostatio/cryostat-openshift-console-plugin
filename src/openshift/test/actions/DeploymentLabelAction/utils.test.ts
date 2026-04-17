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
  Container,
  HARVESTER_TEMPLATES,
  LOG_LEVELS,
  getAgentConfig,
  formatAgentConfig,
  formatDurationForLabel,
  formatByteSizeForLabel,
  parseDuration,
} from '@console-plugin/actions/DeploymentLabelAction/utils';

describe('envVarUtils', () => {
  const mockContainerWithConfig: Container = {
    name: 'app-container',
    image: 'quay.io/app:latest',
    labels: {
      'cryostat.io/harvester-template': 'Continuous',
    },
  };

  const mockContainerWithoutConfig: Container = {
    name: 'app-container',
    image: 'quay.io/app:latest',
    labels: {},
  };

  const mockContainerNoLabels: Container = {
    name: 'app-container',
    image: 'quay.io/app:latest',
  };

  describe('getAgentConfig', () => {
    it('should return agent config when labels are present', () => {
      const result = getAgentConfig(mockContainerWithConfig);
      expect(result).toEqual({
        harvesterTemplate: 'Continuous',
        harvesterPeriodMs: 900000,
        harvesterMaxFiles: 4,
        harvesterExitMaxAgeMs: 300000,
        harvesterExitMaxSizeB: 20971520,
      });
    });

    it('should return null when no agent labels are present', () => {
      const result = getAgentConfig(mockContainerWithoutConfig);
      expect(result).toBeNull();
    });

    it('should return config with defaults when only one label is present', () => {
      const containerWithPartialConfig: Container = {
        name: 'app-container',
        image: 'quay.io/app:latest',
        labels: {
          'cryostat.io/harvester-template': 'Profiling',
        },
      };
      const result = getAgentConfig(containerWithPartialConfig);
      expect(result).toEqual({
        harvesterTemplate: 'Profiling',
        harvesterPeriodMs: 900000,
        harvesterMaxFiles: 4,
        harvesterExitMaxAgeMs: 300000,
        harvesterExitMaxSizeB: 20971520,
      });
    });

    it('should parse custom harvester period when specified', () => {
      const containerWithCustomPeriod: Container = {
        name: 'app-container',
        image: 'quay.io/app:latest',
        labels: {
          'cryostat.io/harvester-template': 'Continuous',
          'cryostat.io/harvester-period': '600000ms',
        },
      };
      const result = getAgentConfig(containerWithCustomPeriod);
      expect(result).toEqual({
        harvesterTemplate: 'Continuous',
        harvesterPeriodMs: 600000,
        harvesterMaxFiles: 4,
        harvesterExitMaxAgeMs: 300000,
        harvesterExitMaxSizeB: 20971520,
      });
    });

    it('should parse custom harvester max files when specified', () => {
      const containerWithCustomMaxFiles: Container = {
        name: 'app-container',
        image: 'quay.io/app:latest',
        labels: {
          'cryostat.io/harvester-template': 'Continuous',
          'cryostat.io/harvester-max-files': '8',
        },
      };
      const result = getAgentConfig(containerWithCustomMaxFiles);
      expect(result).toEqual({
        harvesterTemplate: 'Continuous',
        harvesterPeriodMs: 900000,
        harvesterMaxFiles: 8,
        harvesterExitMaxAgeMs: 300000,
        harvesterExitMaxSizeB: 20971520,
      });
    });

    it('should parse custom harvester exit max age when specified', () => {
      const containerWithCustomAge: Container = {
        name: 'app-container',
        image: 'quay.io/app:latest',
        labels: {
          'cryostat.io/harvester-template': 'Continuous',
          'cryostat.io/harvester-exit-max-age': '60000ms',
        },
      };
      const result = getAgentConfig(containerWithCustomAge);
      expect(result).toEqual({
        harvesterTemplate: 'Continuous',
        harvesterPeriodMs: 900000,
        harvesterMaxFiles: 4,
        harvesterExitMaxAgeMs: 60000,
        harvesterExitMaxSizeB: 20971520,
      });
    });

    it('should parse custom harvester exit max size when specified', () => {
      const containerWithCustomSize: Container = {
        name: 'app-container',
        image: 'quay.io/app:latest',
        labels: {
          'cryostat.io/harvester-template': 'Continuous',
          'cryostat.io/harvester-exit-max-size': '52428800',
        },
      };
      const result = getAgentConfig(containerWithCustomSize);
      expect(result).toEqual({
        harvesterTemplate: 'Continuous',
        harvesterPeriodMs: 900000,
        harvesterMaxFiles: 4,
        harvesterExitMaxAgeMs: 300000,
        harvesterExitMaxSizeB: 52428800,
      });
    });

    it('should parse all custom values when specified', () => {
      const containerWithAllCustom: Container = {
        name: 'app-container',
        image: 'quay.io/app:latest',
        labels: {
          'cryostat.io/harvester-template': 'Profiling',
          'cryostat.io/harvester-period': '1200000ms',
          'cryostat.io/harvester-max-files': '6',
          'cryostat.io/harvester-exit-max-age': '45000ms',
          'cryostat.io/harvester-exit-max-size': '31457280',
        },
      };
      const result = getAgentConfig(containerWithAllCustom);
      expect(result).toEqual({
        harvesterTemplate: 'Profiling',
        harvesterPeriodMs: 1200000,
        harvesterMaxFiles: 6,
        harvesterExitMaxAgeMs: 45000,
        harvesterExitMaxSizeB: 31457280,
      });
    });

    it('should return null for container without labels', () => {
      const result = getAgentConfig(mockContainerNoLabels);
      expect(result).toBeNull();
    });
  });

  describe('formatAgentConfig', () => {
    it('should format config with harvester and log level', () => {
      const config = {
        harvesterTemplate: HARVESTER_TEMPLATES.CONTINUOUS,
        harvesterPeriodMs: 900000,
        harvesterMaxFiles: 4,
        harvesterExitMaxAgeMs: 300000,
        harvesterExitMaxSizeB: 20971520,
      };
      const result = formatAgentConfig(config, LOG_LEVELS.INFO);
      expect(result).toBe('Harvester=Continuous, LogLevel=INFO');
    });

    it('should format config with only harvester template', () => {
      const config = {
        harvesterTemplate: HARVESTER_TEMPLATES.PROFILING,
        harvesterPeriodMs: 900000,
        harvesterMaxFiles: 4,
        harvesterExitMaxAgeMs: 300000,
        harvesterExitMaxSizeB: 20971520,
      };
      const result = formatAgentConfig(config);
      expect(result).toBe('Harvester=Profiling');
    });

    it('should format config with only log level', () => {
      const result = formatAgentConfig(null, LOG_LEVELS.DEBUG);
      expect(result).toBe('LogLevel=DEBUG');
    });

    it('should format config with custom Java opts var', () => {
      const config = {
        harvesterTemplate: HARVESTER_TEMPLATES.CONTINUOUS,
        harvesterPeriodMs: 900000,
        harvesterMaxFiles: 4,
        harvesterExitMaxAgeMs: 300000,
        harvesterExitMaxSizeB: 20971520,
      };
      const result = formatAgentConfig(config, LOG_LEVELS.INFO, 'CUSTOM_JAVA_OPTS');
      expect(result).toBe('Harvester=Continuous, LogLevel=INFO, JavaOpts=CUSTOM_JAVA_OPTS');
    });

    it('should return "None" for null config and no log level', () => {
      const result = formatAgentConfig(null);
      expect(result).toBe('None');
    });

    it('should return "None" for empty config', () => {
      const config = {
        harvesterTemplate: '' as any,
        harvesterPeriodMs: 900000,
        harvesterMaxFiles: 4,
        harvesterExitMaxAgeMs: 300000,
        harvesterExitMaxSizeB: 20971520,
      };
      const result = formatAgentConfig(config);
      expect(result).toBe('None');
    });
  });

  describe('parseDuration', () => {
    it('should parse duration with hours unit', () => {
      expect(parseDuration('2h', 0)).toBe(2 * 60 * 60 * 1000);
    });

    it('should parse duration with minutes unit', () => {
      expect(parseDuration('15m', 0)).toBe(15 * 60 * 1000);
    });

    it('should parse duration with seconds unit', () => {
      expect(parseDuration('30s', 0)).toBe(30 * 1000);
    });

    it('should parse duration with milliseconds unit', () => {
      expect(parseDuration('500ms', 0)).toBe(500);
    });

    it('should parse duration without unit as milliseconds', () => {
      expect(parseDuration('1000', 0)).toBe(1000);
    });

    it('should return default value for undefined duration', () => {
      expect(parseDuration(undefined, 12345)).toBe(12345);
    });

    it('should return default value for invalid duration format', () => {
      expect(parseDuration('invalid', 12345)).toBe(12345);
    });

    it('should return default value for empty string', () => {
      expect(parseDuration('', 12345)).toBe(12345);
    });
  });

  describe('formatDurationForLabel', () => {
    it('should format duration in hours when value divides evenly', () => {
      expect(formatDurationForLabel(3600000)).toBe('1h');
      expect(formatDurationForLabel(7200000)).toBe('2h');
      expect(formatDurationForLabel(10800000)).toBe('3h');
    });

    it('should format duration in minutes when value divides evenly', () => {
      expect(formatDurationForLabel(60000)).toBe('1m');
      expect(formatDurationForLabel(900000)).toBe('15m');
      expect(formatDurationForLabel(1800000)).toBe('30m');
    });

    it('should format duration in seconds when value divides evenly', () => {
      expect(formatDurationForLabel(1000)).toBe('1s');
      expect(formatDurationForLabel(5000)).toBe('5s');
      expect(formatDurationForLabel(30000)).toBe('30s');
    });

    it('should format duration in milliseconds when value does not divide evenly', () => {
      expect(formatDurationForLabel(1500)).toBe('1500ms');
      expect(formatDurationForLabel(999)).toBe('999ms');
      expect(formatDurationForLabel(12345)).toBe('12345ms');
    });

    it('should prefer larger units over smaller units', () => {
      // 1 hour should be formatted as 1h, not 60m
      expect(formatDurationForLabel(3600000)).toBe('1h');
      // 1 minute should be formatted as 1m, not 60s
      expect(formatDurationForLabel(60000)).toBe('1m');
    });

    it('should handle zero duration', () => {
      expect(formatDurationForLabel(0)).toBe('0ms');
    });

    it('should handle very large durations', () => {
      expect(formatDurationForLabel(86400000)).toBe('24h'); // 24 hours
    });

    it('should format default harvester period correctly', () => {
      expect(formatDurationForLabel(900000)).toBe('15m');
    });

    it('should format default harvester exit max age correctly', () => {
      expect(formatDurationForLabel(300000)).toBe('5m');
    });
  });

  describe('formatByteSizeForLabel', () => {
    it('should format size in Gi when value divides evenly', () => {
      expect(formatByteSizeForLabel(1073741824)).toBe('1Gi');
      expect(formatByteSizeForLabel(2147483648)).toBe('2Gi');
      expect(formatByteSizeForLabel(5368709120)).toBe('5Gi');
    });

    it('should format size in Mi when value divides evenly', () => {
      expect(formatByteSizeForLabel(1048576)).toBe('1Mi');
      expect(formatByteSizeForLabel(20971520)).toBe('20Mi');
      expect(formatByteSizeForLabel(52428800)).toBe('50Mi');
    });

    it('should format size in Ki when value divides evenly', () => {
      expect(formatByteSizeForLabel(1024)).toBe('1Ki');
      expect(formatByteSizeForLabel(2048)).toBe('2Ki');
      expect(formatByteSizeForLabel(10240)).toBe('10Ki');
    });

    it('should format size in bytes when value does not divide evenly', () => {
      expect(formatByteSizeForLabel(500)).toBe('500');
      expect(formatByteSizeForLabel(1023)).toBe('1023');
      expect(formatByteSizeForLabel(1025)).toBe('1025');
    });

    it('should prefer larger units over smaller units', () => {
      // 1 GiB should be formatted as 1Gi, not 1024Mi
      expect(formatByteSizeForLabel(1073741824)).toBe('1Gi');
      // 1 MiB should be formatted as 1Mi, not 1024Ki
      expect(formatByteSizeForLabel(1048576)).toBe('1Mi');
    });

    it('should handle zero size', () => {
      expect(formatByteSizeForLabel(0)).toBe('0');
    });

    it('should handle very large sizes', () => {
      expect(formatByteSizeForLabel(10737418240)).toBe('10Gi'); // 10 GiB
    });

    it('should format default harvester exit max size correctly', () => {
      expect(formatByteSizeForLabel(20971520)).toBe('20Mi');
    });

    it('should use Kubernetes resource format (no B suffix)', () => {
      // Verify the format matches k8s resource quantities
      expect(formatByteSizeForLabel(1073741824)).not.toContain('B');
      expect(formatByteSizeForLabel(1048576)).not.toContain('B');
      expect(formatByteSizeForLabel(1024)).not.toContain('B');
    });

    it('should handle fractional MiB that do not divide evenly', () => {
      // 1.5 MiB in bytes (1572864) should not format as Mi
      expect(formatByteSizeForLabel(1572864)).toBe('1536Ki');
    });

    it('should handle fractional GiB that do not divide evenly', () => {
      // 1.5 GiB in bytes (1610612736) should not format as Gi
      expect(formatByteSizeForLabel(1610612736)).toBe('1536Mi');
    });
  });
});
