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
import './example.css';
import Helmet from 'react-helmet';
import { useTranslation } from 'react-i18next';
import {
  Button,
  MenuToggle,
  MenuToggleElement,
  Page,
  PageSection,
  Select,
  SelectList,
  SelectOption,
  Text,
  TextContent,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { ServiceContext } from '@console-plugin/services/Services';
import { Subscription } from 'rxjs';
import {
  K8sResourceCommon,
  NamespaceBar,
  useActiveNamespace,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';

const ALL_NS = '#ALL_NS#';

const LOCALSTORAGE_KEY = 'cryostat-plugin';

export default function ExamplePage() {
  const { t } = useTranslation('plugin__cryostat-plugin');
  const services = React.useContext(ServiceContext);
  const [subs] = React.useState([] as Subscription[]);

  const [backendHealth, setBackendHealth] = React.useState('');
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [response, setResponse] = React.useState('');
  const [searchNamespace] = useActiveNamespace();
  const [selector, setSelector] = React.useState('');
  // FIXME querying for this type means that the plugin only works with Operator-managed Cryostat
  // instances, not ones installed via Helm chart
  const [instances, instancesLoaded, instancesError] = useK8sWatchResource<K8sResourceCommon[]>({
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
  const [method, setMethod] = React.useState('GET');
  const [path, setPath] = React.useState('');

  React.useEffect(() => {
    return () => {
      subs.forEach((s) => s.unsubscribe());
    };
  }, [subs]);

  React.useEffect(() => {
    const selector = localStorage.getItem(LOCALSTORAGE_KEY);
    if (selector) {
      setSelector(selector);
    }
  }, [localStorage, setSelector]);

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

  const getBackendHealth = React.useCallback(() => {
    subs.push(services.api.status().subscribe(setBackendHealth));
  }, [services.api, setBackendHealth]);

  const instanceSelect = React.useCallback(
    (_, svc: K8sResourceCommon) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const selector = `${svc.metadata.namespace},${svc.metadata.name}`;
      localStorage.setItem(LOCALSTORAGE_KEY, selector);
      setSelector(selector);
      setDropdownOpen(false);
    },
    [setSelector, setDropdownOpen],
  );

  const dropdownToggle = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const doCryostatRequest = React.useCallback(() => {
    subs.push(
      services.api
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .cryostat(instance.metadata.namespace, instance.metadata.name, method, path)
        .subscribe(setResponse),
    );
  }, [subs, services.api, instance, method, path, setResponse]);

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

  return (
    <>
      <Helmet>
        <title data-test="example-page-title">{t('Hello, Plugin!')}</title>
      </Helmet>
      <Page>
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
            </SelectList>
          </Select>
        </NamespaceBar>
        <PageSection variant="light">
          <Title headingLevel="h1">{t(backendHealth)}</Title>
        </PageSection>
        <PageSection variant="light">
          {instance && instance.metadata ? (
            <Text>
              Selected Cryostat `&quot;`{instance.metadata.name}`&quot;` in project `&quot;`
              {instance.metadata.namespace}`&quot;`
            </Text>
          ) : undefined}
          <Text>API Request Method</Text>
          <TextInput value={method} type="text" placeholder="GET" onChange={(_evt, value) => setMethod(value)} />
          <Text>API Request Path</Text>
          <TextInput
            value={path}
            type="text"
            placeholder="/api/v4/targets"
            onChange={(_evt, value) => setPath(value)}
          />
          <Button onClick={getBackendHealth}>Test Backend</Button>
          <Button onClick={doCryostatRequest} isDisabled={instances.length === 0 || !selector || !method || !path}>
            Fire Request
          </Button>
          <TextContent>
            <Text>Response:</Text>
            <code>{instancesLoaded ? response : instancesError}</code>
          </TextContent>
        </PageSection>
      </Page>
    </>
  );
}
