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
  AGENT_ENV_VARS,
  HARVESTER_TEMPLATES,
  LOG_LEVELS,
  findEnvVar,
  getAgentConfig,
  formatAgentConfig,
  getEnvVarIndex,
  hasEnvVar,
} from '@console-plugin/actions/DeploymentLabelAction/envVarUtils';

describe('envVarUtils', () => {
  const mockContainerWithConfig: Container = {
    name: 'app-container',
    image: 'quay.io/app:latest',
    env: [
      { name: AGENT_ENV_VARS.HARVESTER_TEMPLATE, value: 'Continuous' },
      { name: AGENT_ENV_VARS.LOG_LEVEL, value: 'info' },
      { name: 'OTHER_VAR', value: 'other-value' },
    ],
  };

  const mockContainerWithoutConfig: Container = {
    name: 'app-container',
    image: 'quay.io/app:latest',
    env: [{ name: 'OTHER_VAR', value: 'other-value' }],
  };

  const mockContainerNoEnv: Container = {
    name: 'app-container',
    image: 'quay.io/app:latest',
  };

  describe('findEnvVar', () => {
    it('should find an existing environment variable', () => {
      const result = findEnvVar(mockContainerWithConfig, AGENT_ENV_VARS.HARVESTER_TEMPLATE);
      expect(result).toEqual({ name: AGENT_ENV_VARS.HARVESTER_TEMPLATE, value: 'Continuous' });
    });

    it('should return undefined for non-existent environment variable', () => {
      const result = findEnvVar(mockContainerWithoutConfig, AGENT_ENV_VARS.HARVESTER_TEMPLATE);
      expect(result).toBeUndefined();
    });

    it('should return undefined for container without env array', () => {
      const result = findEnvVar(mockContainerNoEnv, AGENT_ENV_VARS.HARVESTER_TEMPLATE);
      expect(result).toBeUndefined();
    });
  });

  describe('getAgentConfig', () => {
    it('should return agent config when both env vars are present', () => {
      const result = getAgentConfig(mockContainerWithConfig);
      expect(result).toEqual({
        harvesterTemplate: 'Continuous',
        harvesterExitMaxAgeMs: 30000,
        harvesterExitMaxSizeB: 20971520,
        logLevel: 'info',
        javaOptsVar: 'JAVA_TOOL_OPTIONS',
      });
    });

    it('should return null when no agent env vars are present', () => {
      const result = getAgentConfig(mockContainerWithoutConfig);
      expect(result).toBeNull();
    });

    it('should return config with defaults when only one env var is present', () => {
      const containerWithPartialConfig: Container = {
        name: 'app-container',
        image: 'quay.io/app:latest',
        env: [{ name: AGENT_ENV_VARS.HARVESTER_TEMPLATE, value: 'Profiling' }],
      };
      const result = getAgentConfig(containerWithPartialConfig);
      expect(result).toEqual({
        harvesterTemplate: 'Profiling',
        harvesterExitMaxAgeMs: 30000,
        harvesterExitMaxSizeB: 20971520,
        logLevel: LOG_LEVELS.OFF,
        javaOptsVar: 'JAVA_TOOL_OPTIONS',
      });
    });

    it('should parse custom harvester exit max age when specified', () => {
      const containerWithCustomAge: Container = {
        name: 'app-container',
        image: 'quay.io/app:latest',
        env: [
          { name: AGENT_ENV_VARS.HARVESTER_TEMPLATE, value: 'Continuous' },
          { name: AGENT_ENV_VARS.HARVESTER_EXIT_MAX_AGE_MS, value: '60000' },
        ],
      };
      const result = getAgentConfig(containerWithCustomAge);
      expect(result).toEqual({
        harvesterTemplate: 'Continuous',
        harvesterExitMaxAgeMs: 60000,
        harvesterExitMaxSizeB: 20971520,
        logLevel: LOG_LEVELS.OFF,
        javaOptsVar: 'JAVA_TOOL_OPTIONS',
      });
    });

    it('should parse custom harvester exit max size when specified', () => {
      const containerWithCustomSize: Container = {
        name: 'app-container',
        image: 'quay.io/app:latest',
        env: [
          { name: AGENT_ENV_VARS.HARVESTER_TEMPLATE, value: 'Continuous' },
          { name: AGENT_ENV_VARS.HARVESTER_EXIT_MAX_SIZE_B, value: '52428800' },
        ],
      };
      const result = getAgentConfig(containerWithCustomSize);
      expect(result).toEqual({
        harvesterTemplate: 'Continuous',
        harvesterExitMaxAgeMs: 30000,
        harvesterExitMaxSizeB: 52428800,
        logLevel: LOG_LEVELS.OFF,
        javaOptsVar: 'JAVA_TOOL_OPTIONS',
      });
    });

    it('should parse custom Java opts variable when specified', () => {
      const containerWithCustomJavaOpts: Container = {
        name: 'app-container',
        image: 'quay.io/app:latest',
        env: [
          { name: AGENT_ENV_VARS.HARVESTER_TEMPLATE, value: 'Continuous' },
          { name: AGENT_ENV_VARS.JAVA_OPTS_VAR, value: 'CUSTOM_JAVA_OPTIONS' },
        ],
      };
      const result = getAgentConfig(containerWithCustomJavaOpts);
      expect(result).toEqual({
        harvesterTemplate: 'Continuous',
        harvesterExitMaxAgeMs: 30000,
        harvesterExitMaxSizeB: 20971520,
        logLevel: LOG_LEVELS.OFF,
        javaOptsVar: 'CUSTOM_JAVA_OPTIONS',
      });
    });

    it('should parse all custom values when specified', () => {
      const containerWithAllCustom: Container = {
        name: 'app-container',
        image: 'quay.io/app:latest',
        env: [
          { name: AGENT_ENV_VARS.HARVESTER_TEMPLATE, value: 'Profiling' },
          { name: AGENT_ENV_VARS.HARVESTER_EXIT_MAX_AGE_MS, value: '45000' },
          { name: AGENT_ENV_VARS.HARVESTER_EXIT_MAX_SIZE_B, value: '31457280' },
          { name: AGENT_ENV_VARS.LOG_LEVEL, value: 'debug' },
          { name: AGENT_ENV_VARS.JAVA_OPTS_VAR, value: 'MY_JAVA_OPTS' },
        ],
      };
      const result = getAgentConfig(containerWithAllCustom);
      expect(result).toEqual({
        harvesterTemplate: 'Profiling',
        harvesterExitMaxAgeMs: 45000,
        harvesterExitMaxSizeB: 31457280,
        logLevel: 'debug',
        javaOptsVar: 'MY_JAVA_OPTS',
      });
    });

    it('should return null for container without env array', () => {
      const result = getAgentConfig(mockContainerNoEnv);
      expect(result).toBeNull();
    });
  });

  describe('formatAgentConfig', () => {
    it('should format config with both harvester and log level', () => {
      const config = {
        harvesterTemplate: HARVESTER_TEMPLATES.CONTINUOUS,
        harvesterExitMaxAgeMs: 30000,
        harvesterExitMaxSizeB: 20971520,
        logLevel: LOG_LEVELS.INFO,
        javaOptsVar: 'JAVA_TOOL_OPTIONS',
      };
      const result = formatAgentConfig(config);
      expect(result).toBe('Harvester=Continuous, LogLevel=INFO');
    });

    it('should format config with only harvester template', () => {
      const config = {
        harvesterTemplate: HARVESTER_TEMPLATES.PROFILING,
        harvesterExitMaxAgeMs: 30000,
        harvesterExitMaxSizeB: 20971520,
        logLevel: '' as any,
        javaOptsVar: 'JAVA_TOOL_OPTIONS',
      };
      const result = formatAgentConfig(config);
      expect(result).toBe('Harvester=Profiling');
    });

    it('should format config with only log level', () => {
      const config = {
        harvesterTemplate: '' as any,
        harvesterExitMaxAgeMs: 30000,
        harvesterExitMaxSizeB: 20971520,
        logLevel: LOG_LEVELS.DEBUG,
        javaOptsVar: 'JAVA_TOOL_OPTIONS',
      };
      const result = formatAgentConfig(config);
      expect(result).toBe('LogLevel=DEBUG');
    });

    it('should format config with custom Java opts var', () => {
      const config = {
        harvesterTemplate: HARVESTER_TEMPLATES.CONTINUOUS,
        harvesterExitMaxAgeMs: 30000,
        harvesterExitMaxSizeB: 20971520,
        logLevel: LOG_LEVELS.INFO,
        javaOptsVar: 'CUSTOM_JAVA_OPTS',
      };
      const result = formatAgentConfig(config);
      expect(result).toBe('Harvester=Continuous, LogLevel=INFO, JavaOpts=CUSTOM_JAVA_OPTS');
    });

    it('should return "None" for null config', () => {
      const result = formatAgentConfig(null);
      expect(result).toBe('None');
    });

    it('should return "None" for empty config', () => {
      const config = {
        harvesterTemplate: '' as any,
        harvesterExitMaxAgeMs: 30000,
        harvesterExitMaxSizeB: 20971520,
        logLevel: '' as any,
        javaOptsVar: 'JAVA_TOOL_OPTIONS',
      };
      const result = formatAgentConfig(config);
      expect(result).toBe('None');
    });
  });

  describe('getEnvVarIndex', () => {
    it('should return correct index for existing env var', () => {
      const result = getEnvVarIndex(mockContainerWithConfig, AGENT_ENV_VARS.HARVESTER_TEMPLATE);
      expect(result).toBe(0);
    });

    it('should return -1 for non-existent env var', () => {
      const result = getEnvVarIndex(mockContainerWithoutConfig, AGENT_ENV_VARS.HARVESTER_TEMPLATE);
      expect(result).toBe(-1);
    });

    it('should return -1 for container without env array', () => {
      const result = getEnvVarIndex(mockContainerNoEnv, AGENT_ENV_VARS.HARVESTER_TEMPLATE);
      expect(result).toBe(-1);
    });
  });

  describe('hasEnvVar', () => {
    it('should return true for existing env var', () => {
      const result = hasEnvVar(mockContainerWithConfig, AGENT_ENV_VARS.HARVESTER_TEMPLATE);
      expect(result).toBe(true);
    });

    it('should return false for non-existent env var', () => {
      const result = hasEnvVar(mockContainerWithoutConfig, AGENT_ENV_VARS.HARVESTER_TEMPLATE);
      expect(result).toBe(false);
    });

    it('should return false for container without env array', () => {
      const result = hasEnvVar(mockContainerNoEnv, AGENT_ENV_VARS.HARVESTER_TEMPLATE);
      expect(result).toBe(false);
    });
  });
});
