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
  Split,
  SplitItem,
  Tooltip,
} from '@patternfly/react-core';
import {
  k8sGet,
  K8sResourceCommon,
  NamespaceBar,
  useActiveNamespace,
  useK8sModel,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  CryostatService,
  NO_INSTANCE,
  SESSIONSTORAGE_SVC_NAME_KEY,
  SESSIONSTORAGE_SVC_NS_KEY,
} from './CryostatContainer';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';

const ALL_NS = '#ALL_NS#';

export default function CryostatSelector({
  setSelectedCryostat,
}: {
  setSelectedCryostat: React.Dispatch<React.SetStateAction<CryostatService>>;
}) {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [searchNamespace] = useActiveNamespace();
  const [selector, setSelector] = React.useState('');
  const [routeModel] = useK8sModel({ group: 'route.openshift.io', version: 'v1', kind: 'Route' });
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
  const [routeUrl, setRouteUrl] = React.useState('');

  React.useEffect(() => {
    let selectedNs = sessionStorage.getItem(SESSIONSTORAGE_SVC_NS_KEY) ?? '';
    let selectedName = sessionStorage.getItem(SESSIONSTORAGE_SVC_NAME_KEY) ?? '';
    let found = false;
    for (const instance of instances) {
      if (instance?.metadata?.namespace === selectedNs && instance?.metadata?.name === selectedName) {
        found = true;
      }
    }
    if (!found) {
      selectedNs = NO_INSTANCE.namespace;
      selectedName = NO_INSTANCE.name;
    }
    setSelector(`${selectedNs},${selectedName}`);
  }, [sessionStorage, setSelectedCryostat, instances, searchNamespace]);

  React.useEffect(() => {
    const selectedNs = selector.split(',')[0];
    const selectedName = selector.split(',')[1];
    if (!selectedNs || !selectedName) {
      setRouteUrl('');
      return;
    }
    k8sGet({
      model: routeModel,
      name: selectedName,
      ns: selectedNs,
    })
      .catch((_) => '')
      .then(
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        (route: any) => {
          const ingresses = route?.status?.ingress;
          let res = '';
          if (ingresses && ingresses?.length > 0 && ingresses[0]?.host) {
            res = `http://${ingresses[0].host}`;
          }
          setRouteUrl(res);
        },
        (_) => {
          setRouteUrl('');
        },
      );
  }, [selector, setRouteUrl]);

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
        <Split hasGutter>
          <SplitItem>
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
          </SplitItem>
          <SplitItem>
            <Tooltip content="Open the standalone Cryostat Web UI for this instance in a new tab. This is only available if the selected Cryostat instance has an associated Route.">
              <Button
                isAriaDisabled={!routeUrl}
                component="a"
                href={routeUrl}
                target="_blank"
                icon={<ExternalLinkAltIcon />}
              />
            </Tooltip>
          </SplitItem>
        </Split>
      </NamespaceBar>
    </>
  );
}
