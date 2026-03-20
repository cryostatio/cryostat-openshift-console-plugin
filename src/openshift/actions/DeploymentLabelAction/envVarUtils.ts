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

export interface EnvVar {
  name: string;
  value?: string;
  valueFrom?: unknown;
}

export interface Container {
  name: string;
  image: string;
  env?: EnvVar[];
}

export const AGENT_ENV_VARS = {
  HARVESTER_TEMPLATE: 'CRYOSTAT_AGENT_HARVESTER_TEMPLATE',
  HARVESTER_PERIOD_MS: 'CRYOSTAT_AGENT_HARVESTER_PERIOD_MS',
  HARVESTER_MAX_FILES: 'CRYOSTAT_AGENT_HARVESTER_MAX_FILES',
  HARVESTER_EXIT_MAX_AGE_MS: 'CRYOSTAT_AGENT_HARVESTER_EXIT_MAX_AGE_MS',
  HARVESTER_EXIT_MAX_SIZE_B: 'CRYOSTAT_AGENT_HARVESTER_EXIT_MAX_SIZE_B',
  LOG_LEVEL: 'IO_CRYOSTAT_AGENT_SHADED_ORG_SLF4J_SIMPLELOGGER_DEFAULTLOGLEVEL',
  JAVA_OPTS_VAR: 'JAVA_TOOL_OPTIONS',
} as const;

export const HARVESTER_TEMPLATES = {
  NONE: '',
  CONTINUOUS: 'Continuous',
  PROFILING: 'Profiling',
} as const;

export const LOG_LEVELS = {
  OFF: 'off',
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace',
} as const;

export type HarvesterTemplate = (typeof HARVESTER_TEMPLATES)[keyof typeof HARVESTER_TEMPLATES];
export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

export interface AgentConfig {
  harvesterTemplate: HarvesterTemplate;
  harvesterExitMaxAgeMs: number;
  harvesterExitMaxSizeB: number;
  logLevel: LogLevel;
  javaOptsVar: string;
}

export function findEnvVar(container: Container, envVarName: string): EnvVar | undefined {
  return container.env?.find((env) => env.name === envVarName);
}

export function getAgentConfig(container: Container): AgentConfig | null {
  const harvesterTemplateVar = findEnvVar(container, AGENT_ENV_VARS.HARVESTER_TEMPLATE);
  const harvesterExitMaxAgeVar = findEnvVar(container, AGENT_ENV_VARS.HARVESTER_EXIT_MAX_AGE_MS);
  const harvesterExitMaxSizeVar = findEnvVar(container, AGENT_ENV_VARS.HARVESTER_EXIT_MAX_SIZE_B);
  const logLevelVar = findEnvVar(container, AGENT_ENV_VARS.LOG_LEVEL);
  const javaOptsVar = findEnvVar(container, AGENT_ENV_VARS.JAVA_OPTS_VAR);

  if (!harvesterTemplateVar && !logLevelVar && !javaOptsVar && !harvesterExitMaxAgeVar && !harvesterExitMaxSizeVar) {
    return null;
  }

  return {
    harvesterTemplate: (harvesterTemplateVar?.value as HarvesterTemplate) || HARVESTER_TEMPLATES.NONE,
    harvesterExitMaxAgeMs: harvesterExitMaxAgeVar?.value ? parseInt(harvesterExitMaxAgeVar.value, 10) : 30000,
    harvesterExitMaxSizeB: harvesterExitMaxSizeVar?.value ? parseInt(harvesterExitMaxSizeVar.value, 10) : 20971520,
    logLevel: (logLevelVar?.value as LogLevel) || LOG_LEVELS.OFF,
    javaOptsVar: javaOptsVar?.value || 'JAVA_TOOL_OPTIONS',
  };
}

export function formatAgentConfig(config: AgentConfig | null): string {
  if (!config) {
    return 'None';
  }

  const parts: string[] = [];
  if (config.harvesterTemplate) {
    parts.push(`Harvester=${config.harvesterTemplate}`);
  }
  if (config.logLevel) {
    parts.push(`LogLevel=${config.logLevel.toUpperCase()}`);
  }
  if (config.javaOptsVar && config.javaOptsVar !== 'JAVA_TOOL_OPTIONS') {
    parts.push(`JavaOpts=${config.javaOptsVar}`);
  }

  return parts.length > 0 ? parts.join(', ') : 'None';
}

export function getEnvVarIndex(container: Container, envVarName: string): number {
  return container.env?.findIndex((env) => env.name === envVarName) ?? -1;
}

export function hasEnvVar(container: Container, envVarName: string): boolean {
  return getEnvVarIndex(container, envVarName) !== -1;
}
