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
});
