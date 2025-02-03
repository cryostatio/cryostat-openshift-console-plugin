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
import { k8sGet, K8sResourceCommon, NamespaceBar, useK8sModel } from '@openshift-console/dynamic-plugin-sdk';
import { CryostatService, NO_INSTANCE } from './CryostatContainer';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';

export default function CryostatSelector({
  instances,
  renderNamespaceLabel,
  setSelectedCryostat,
  selection,
}: {
  instances: K8sResourceCommon[];
  renderNamespaceLabel: boolean;
  setSelectedCryostat: React.Dispatch<React.SetStateAction<CryostatService>>;
  selection: CryostatService;
}) {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [routeModel] = useK8sModel({ group: 'route.openshift.io', version: 'v1', kind: 'Route' });
  const [routeUrl, setRouteUrl] = React.useState('');

  const selector = React.useMemo(() => {
    if (selection === NO_INSTANCE) {
      return '';
    }
    return `${selection.namespace},${selection.name}`;
  }, [selection]);

  React.useEffect(() => {
    const selectedNs = selection.namespace;
    const selectedName = selection.name;
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
  }, [selection, setRouteUrl, routeModel]);

  const instance = React.useMemo(() => {
    const selectedNs = selection.namespace;
    const selectedName = selection.name;
    for (const c of instances) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (c.metadata.namespace === selectedNs && c.metadata.name === selectedName) {
        return c;
      }
    }
    return undefined;
  }, [instances, selection]);

  const instanceSelect = React.useCallback(
    (_, svc?: K8sResourceCommon) => {
      console.log('instanceSelect', { svc });
      setDropdownOpen(false);
      const selectedNs = svc?.metadata?.namespace;
      const selectedName = svc?.metadata?.name;
      if (!selectedNs || !selectedName) {
        setSelectedCryostat(NO_INSTANCE);
      } else {
        setSelectedCryostat({ namespace: selectedNs, name: selectedName });
      }
    },
    [setDropdownOpen, setSelectedCryostat],
  );

  const dropdownToggle = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const renderLabel = React.useCallback(
    (svc: K8sResourceCommon): string =>
      renderNamespaceLabel
        ? `${svc?.metadata?.name} (${svc?.metadata?.namespace})`
        : (svc?.metadata?.name ?? 'unknown'),
    [renderNamespaceLabel],
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
    <NamespaceBar>
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
                <SelectOption value={svc} key={svc?.metadata?.name}>
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
  );
}
