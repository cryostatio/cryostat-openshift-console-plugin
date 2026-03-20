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
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Form,
  FormGroup,
  Radio,
  NumberInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
  FormSelect,
  FormSelectOption,
  InputGroup,
  InputGroupItem,
} from '@patternfly/react-core';
import * as React from 'react';
import { HARVESTER_TEMPLATES, HarvesterTemplate } from './envVarUtils';

type TimeUnit = 'ms' | 's';
type SizeUnit = 'B' | 'KiB' | 'MiB';

interface HarvesterConfigStepProps {
  harvesterTemplate: HarvesterTemplate;
  harvesterExitMaxAgeMs: number;
  harvesterExitMaxSizeB: number;
  onChange: (template: HarvesterTemplate, maxAge: number, maxSize: number) => void;
}

export const HarvesterConfigStep: React.FC<HarvesterConfigStepProps> = ({
  harvesterTemplate,
  harvesterExitMaxAgeMs,
  harvesterExitMaxSizeB,
  onChange,
}) => {
  const { t } = useCryostatTranslation();

  // Convert milliseconds to display value and unit
  const getTimeDisplayValue = (ms: number): { value: number; unit: TimeUnit } => {
    if (ms >= 1000 && ms % 1000 === 0) {
      return { value: ms / 1000, unit: 's' };
    }
    return { value: ms, unit: 'ms' };
  };

  // Convert bytes to display value and unit
  const getSizeDisplayValue = (bytes: number): { value: number; unit: SizeUnit } => {
    const mib = 1024 * 1024;
    const kib = 1024;
    if (bytes >= mib && bytes % mib === 0) {
      return { value: bytes / mib, unit: 'MiB' };
    } else if (bytes >= kib && bytes % kib === 0) {
      return { value: bytes / kib, unit: 'KiB' };
    }
    return { value: bytes, unit: 'B' };
  };

  const [timeDisplay, setTimeDisplay] = React.useState(() => getTimeDisplayValue(harvesterExitMaxAgeMs));
  const [sizeDisplay, setSizeDisplay] = React.useState(() => getSizeDisplayValue(harvesterExitMaxSizeB));

  // Update display when props change
  React.useEffect(() => {
    setTimeDisplay(getTimeDisplayValue(harvesterExitMaxAgeMs));
  }, [harvesterExitMaxAgeMs]);

  React.useEffect(() => {
    setSizeDisplay(getSizeDisplayValue(harvesterExitMaxSizeB));
  }, [harvesterExitMaxSizeB]);

  const handleTemplateChange = (template: HarvesterTemplate) => {
    onChange(template, harvesterExitMaxAgeMs, harvesterExitMaxSizeB);
  };

  const convertTimeToMs = (value: number, unit: TimeUnit): number => {
    return unit === 's' ? value * 1000 : value;
  };

  const convertSizeToBytes = (value: number, unit: SizeUnit): number => {
    switch (unit) {
      case 'MiB':
        return value * 1024 * 1024;
      case 'KiB':
        return value * 1024;
      default:
        return value;
    }
  };

  const handleTimeValueChange = (value: number) => {
    setTimeDisplay((prev) => ({ ...prev, value }));
    const ms = convertTimeToMs(value, timeDisplay.unit);
    onChange(harvesterTemplate, ms, harvesterExitMaxSizeB);
  };

  const handleTimeUnitChange = (_event: React.FormEvent<HTMLSelectElement>, unit: string) => {
    const newUnit = unit as TimeUnit;
    setTimeDisplay((prev) => ({ ...prev, unit: newUnit }));
    const ms = convertTimeToMs(timeDisplay.value, newUnit);
    onChange(harvesterTemplate, ms, harvesterExitMaxSizeB);
  };

  const handleSizeValueChange = (value: number) => {
    setSizeDisplay((prev) => ({ ...prev, value }));
    const bytes = convertSizeToBytes(value, sizeDisplay.unit);
    onChange(harvesterTemplate, harvesterExitMaxAgeMs, bytes);
  };

  const handleSizeUnitChange = (_event: React.FormEvent<HTMLSelectElement>, unit: string) => {
    const newUnit = unit as SizeUnit;
    setSizeDisplay((prev) => ({ ...prev, unit: newUnit }));
    const bytes = convertSizeToBytes(sizeDisplay.value, newUnit);
    onChange(harvesterTemplate, harvesterExitMaxAgeMs, bytes);
  };

  const getTimeStep = (unit: TimeUnit): number => {
    return unit === 's' ? 1 : 1000;
  };

  const getSizeStep = (unit: SizeUnit): number => {
    switch (unit) {
      case 'MiB':
        return 1;
      case 'KiB':
        return 1;
      default:
        return 1024;
    }
  };

  return (
    <Form>
      <FormGroup label={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_LABEL')} fieldId="harvester-template">
        <Radio
          id="harvester-none"
          name="harvester-template"
          label={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_NONE')}
          description={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_NONE_DESC')}
          isChecked={harvesterTemplate === HARVESTER_TEMPLATES.NONE}
          onChange={() => handleTemplateChange(HARVESTER_TEMPLATES.NONE)}
        />
        <Radio
          id="harvester-continuous"
          name="harvester-template"
          label={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_CONTINUOUS')}
          description={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_CONTINUOUS_DESC')}
          isChecked={harvesterTemplate === HARVESTER_TEMPLATES.CONTINUOUS}
          onChange={() => handleTemplateChange(HARVESTER_TEMPLATES.CONTINUOUS)}
        />
        <Radio
          id="harvester-profiling"
          name="harvester-template"
          label={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_PROFILING')}
          description={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_PROFILING_DESC')}
          isChecked={harvesterTemplate === HARVESTER_TEMPLATES.PROFILING}
          onChange={() => handleTemplateChange(HARVESTER_TEMPLATES.PROFILING)}
        />
      </FormGroup>
      <FormGroup label={t('DEPLOYMENT_ACTION_HARVESTER_EXIT_MAX_AGE_LABEL')} fieldId="harvester-exit-max-age">
        <InputGroup>
          <InputGroupItem isFill>
            <NumberInput
              id="harvester-exit-max-age"
              value={timeDisplay.value}
              onMinus={() => handleTimeValueChange(Math.max(0, timeDisplay.value - 1))}
              onPlus={() => handleTimeValueChange(timeDisplay.value + 1)}
              onChange={(event) => {
                const value = Number((event.target as HTMLInputElement).value);
                if (!isNaN(value) && value >= 0) {
                  handleTimeValueChange(value);
                }
              }}
              min={0}
              widthChars={10}
            />
          </InputGroupItem>
          <InputGroupItem>
            <FormSelect
              id="time-unit-select"
              value={timeDisplay.unit}
              onChange={handleTimeUnitChange}
              aria-label="Time unit"
            >
              <FormSelectOption value="ms" label="ms" />
              <FormSelectOption value="s" label="s" />
            </FormSelect>
          </InputGroupItem>
        </InputGroup>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('DEPLOYMENT_ACTION_HARVESTER_EXIT_MAX_AGE_HELPER')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup label={t('DEPLOYMENT_ACTION_HARVESTER_EXIT_MAX_SIZE_LABEL')} fieldId="harvester-exit-max-size">
        <InputGroup>
          <InputGroupItem isFill>
            <NumberInput
              id="harvester-exit-max-size"
              value={sizeDisplay.value}
              onMinus={() => handleSizeValueChange(Math.max(0, sizeDisplay.value - 1))}
              onPlus={() => handleSizeValueChange(sizeDisplay.value + 1)}
              onChange={(event) => {
                const value = Number((event.target as HTMLInputElement).value);
                if (!isNaN(value) && value >= 0) {
                  handleSizeValueChange(value);
                }
              }}
              min={0}
              widthChars={10}
            />
          </InputGroupItem>
          <InputGroupItem>
            <FormSelect
              id="size-unit-select"
              value={sizeDisplay.unit}
              onChange={handleSizeUnitChange}
              aria-label="Size unit"
            >
              <FormSelectOption value="B" label="B" />
              <FormSelectOption value="KiB" label="KiB" />
              <FormSelectOption value="MiB" label="MiB" />
            </FormSelect>
          </InputGroupItem>
        </InputGroup>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('DEPLOYMENT_ACTION_HARVESTER_EXIT_MAX_SIZE_HELPER')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    </Form>
  );
};
