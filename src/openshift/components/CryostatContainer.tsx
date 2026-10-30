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
import { Services } from '@app/Shared/Services/Services';
import { Bullseye, Spinner } from '@patternfly/react-core';
import * as React from 'react';
import { CryostatPageShell } from './CryostatPageShell';
import {
  CryostatContextProvider,
  CryostatService,
  CryostatServiceContext,
  NO_INSTANCE,
  SESSIONSTORAGE_SVC_NAME_KEY,
  SESSIONSTORAGE_SVC_NS_KEY,
  useCryostatServiceContextValue,
} from './CryostatServiceContext';

export { CryostatService, NO_INSTANCE, SESSIONSTORAGE_SVC_NAME_KEY, SESSIONSTORAGE_SVC_NS_KEY };

export const LoadingState: React.FC = () => {
  return (
    <Bullseye>
      <Spinner />
    </Bullseye>
  );
};

/**
 * Provides a local CryostatServiceContext and renders CryostatPageShell.
 *
 * When the plugin runs inside the OpenShift Console with the console.context-provider
 * extension registered, the Console mounts CryostatContextProvider at the application
 * root and CryostatPageShell reads from that persistent context - this wrapper is
 * bypassed. When running standalone or in tests, this wrapper supplies a local context
 * instead so that CryostatPageShell still functions correctly.
 */
const LocalCryostatProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const value = useCryostatServiceContextValue();
  return (
    <CryostatContextProvider value={value}>
      <CryostatPageShell>{children}</CryostatPageShell>
    </CryostatContextProvider>
  );
};

export const CryostatContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const ctxValue = React.useContext(CryostatServiceContext);
  const hasProvider = ctxValue !== null && ctxValue.serviceContext !== (undefined as unknown as Services);

  if (hasProvider && ctxValue.searchNamespace !== '') {
    return <CryostatPageShell>{children}</CryostatPageShell>;
  }
  return <LocalCryostatProvider>{children}</LocalCryostatProvider>;
};
