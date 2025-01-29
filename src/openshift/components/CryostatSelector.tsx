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
import React from 'react';
import {
  Button,
  MenuFooter,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import {
  K8sResourceCommon,
  NamespaceBar,
  useActiveNamespace,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { CryostatService, NO_INSTANCE } from './CryostatContainer';
const ALL_NS = '#ALL_NS#';

const LOCALSTORAGE_KEY = 'cryostat-plugin';

export default function CryostatSelector({
  setSelectedCryostat,
}: {
  setSelectedCryostat: React.Dispatch<React.SetStateAction<CryostatService>>;
}) {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [searchNamespace] = useActiveNamespace();
  const [selector, setSelector] = React.useState('');
  const [instances] = useK8sWatchResource<K8sResourceCommon[]>({
    isList: true,
    namespaced: true,
    namespace: searchNamespace === ALL_NS ? undefined : searchNamespace,
    groupVersionKind: {
      group: '',
      kind: 'Service',
      version: 'v1',
    },
    selector: {
      matchLabels: {
        'app.kubernetes.io/part-of': 'cryostat',
        'app.kubernetes.io/component': 'cryostat',
      },
    },
  });

  React.useEffect(() => {
    let selector = localStorage.getItem(LOCALSTORAGE_KEY);
    let selectedNs = selector?.split(',')[0] || '';
    let selectedName = selector?.split(',')[1] || '';
    let found = false;
    for (const instance of instances) {
      if (instance?.metadata?.namespace === selectedNs && instance?.metadata?.name === selectedName) {
        found = true;
      }
    }
    if (!found) {
      selector = '';
      selectedNs = NO_INSTANCE.namespace;
      selectedName = NO_INSTANCE.name;
    }
    setSelectedCryostat({ namespace: selectedNs, name: selectedName });
    if (selector) {
      setSelector(selector);
    }
  }, [localStorage, setSelector, setSelectedCryostat]);

  const instance = React.useMemo(() => {
    const selectedNs = selector.split(',')[0];
    const selectedName = selector.split(',')[1];
    for (const c of instances) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (c.metadata.namespace === selectedNs && c.metadata.name === selectedName) {
        return c;
      }
    }
    return undefined;
  }, [instances, selector]);

  const instanceSelect = React.useCallback(
    (_, svc?: K8sResourceCommon) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const selector =
        svc?.metadata?.namespace && svc?.metadata?.name ? `${svc.metadata.namespace},${svc.metadata.name}` : '';
      const selectedNs = selector?.split(',')[0] || '';
      const selectedName = selector?.split(',')[1] || '';
      localStorage.setItem(LOCALSTORAGE_KEY, selector);
      setSelector(selector);
      setDropdownOpen(false);
      setSelectedCryostat({ namespace: selectedNs, name: selectedName });
    },
    [setSelector, setDropdownOpen, setSelectedCryostat],
  );

  const dropdownToggle = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const renderLabel = React.useCallback(
    (svc: K8sResourceCommon): string => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (svc.metadata === undefined) {
        svc.metadata = {};
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return searchNamespace === ALL_NS ? `${svc.metadata.name} (${svc.metadata.namespace})` : svc.metadata.name;
    },
    [searchNamespace],
  );

  const selectToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle ref={toggleRef} onClick={dropdownToggle} isExpanded={dropdownOpen} isDisabled={instances.length === 0}>
      {instance ? renderLabel(instance) : 'Cryostats'}
    </MenuToggle>
  );

  const clearSelection = React.useCallback(() => {
    instanceSelect(undefined);
  }, [instanceSelect]);

  return (
    <>
      <NamespaceBar onNamespaceChange={() => setSelector('')}>
        <Select
          isOpen={dropdownOpen}
          selected={selector}
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          onSelect={instanceSelect}
          onOpenChange={setDropdownOpen}
          toggle={selectToggle}
          shouldFocusToggleOnSelect
        >
          <SelectList>
            {instances.map((svc) => (
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              <SelectOption value={svc} key={svc.metadata.name}>
                {renderLabel(svc)}
              </SelectOption>
            ))}
            <MenuFooter>
              <Button variant="link" isInline onClick={clearSelection}>
                Clear Selection
              </Button>
            </MenuFooter>
          </SelectList>
        </Select>
      </NamespaceBar>
    </>
  );
}
