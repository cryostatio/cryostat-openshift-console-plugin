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

export interface Container {
  name: string;
  image: string;
  labels?: Record<string, string>;
}

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
  harvesterPeriodMs: number;
  harvesterMaxFiles: number;
  harvesterExitMaxAgeMs: number;
  harvesterExitMaxSizeB: number;
}

export function parseDuration(duration: string | undefined, defaultValue: number): number {
  if (!duration) return defaultValue;
  const match = duration.match(/^(\d+)(ms|s|m|h)?$/);
  if (!match) return defaultValue;
  const value = parseInt(match[1], 10);
  const unit = match[2] || 'ms';
  switch (unit) {
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      return value;
  }
}

export function getAgentConfig(container: Container): AgentConfig | null {
  const labels = container.labels;
  if (!labels) {
    return null;
  }

  const harvesterTemplate = labels['cryostat.io/harvester-template'];
  const harvesterPeriod = labels['cryostat.io/harvester-period'];
  const harvesterMaxFiles = labels['cryostat.io/harvester-max-files'];
  const harvesterExitMaxAge = labels['cryostat.io/harvester-exit-max-age'];
  const harvesterExitMaxSize = labels['cryostat.io/harvester-exit-max-size'];

  if (!harvesterTemplate && !harvesterPeriod && !harvesterMaxFiles && !harvesterExitMaxAge && !harvesterExitMaxSize) {
    return null;
  }

  return {
    harvesterTemplate: (harvesterTemplate as HarvesterTemplate) || HARVESTER_TEMPLATES.NONE,
    harvesterPeriodMs: parseDuration(harvesterPeriod, 900000),
    harvesterMaxFiles: harvesterMaxFiles ? parseInt(harvesterMaxFiles, 10) : 4,
    harvesterExitMaxAgeMs: parseDuration(harvesterExitMaxAge, 300000),
    harvesterExitMaxSizeB: harvesterExitMaxSize ? parseInt(harvesterExitMaxSize, 10) : 20971520,
  };
}

export function formatAgentConfig(config: AgentConfig | null, logLevel?: LogLevel, javaOptsVar?: string): string {
  if (!config && !logLevel && !javaOptsVar) {
    return 'None';
  }

  const parts: string[] = [];
  if (config?.harvesterTemplate) {
    parts.push(`Harvester=${config.harvesterTemplate}`);
  }
  if (logLevel) {
    parts.push(`LogLevel=${logLevel.toUpperCase()}`);
  }
  if (javaOptsVar && javaOptsVar !== 'JAVA_TOOL_OPTIONS') {
    parts.push(`JavaOpts=${javaOptsVar}`);
  }

  return parts.length > 0 ? parts.join(', ') : 'None';
}
