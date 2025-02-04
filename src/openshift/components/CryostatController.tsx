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
import * as React from 'react';
import { connect } from 'react-redux';

type CryostatControllerProps = {
  children: React.ReactNode;
};

class CryostatControllerComponent extends React.Component<CryostatControllerProps> {
  state = {
    loaded: false,
  };

  componentDidMount(): void {
    this.loadCryostat();
  }

  componentWillUnmount(): void {
    // do nothing for now.
  }

  render(): React.ReactNode {
    return this.state.loaded ? <>{this.props.children}</> : <h1>loading!</h1>;
  }

  private loadCryostat = async (): Promise<void> => {
    await this.getCryostatConfig();
    this.applyUIDefaults();
    this.setDocLayout();
    this.setState({ loaded: true });
  };

  private getCryostatConfig = async (): Promise<void> => {
    // In Kiali, their Controller has a set of props like setNamespaces, setStatus, etc.,
    // and in this block they go through each and populate them with Kiali data.
    // This information will be dispatched later and set into Kiali action code.
    // https://github.com/kiali/openshift-servicemesh-plugin/blob/main/plugin/src/openshift/components/KialiController.tsx#L111
  };

  private applyUIDefaults = (): void => {
    // Kiali uses this to set the default state for the frontend
    // https://github.com/kiali/openshift-servicemesh-plugin/blob/main/plugin/src/openshift/components/KialiController.tsx#L166
  };

  private setDocLayout = (): void => {
    // Kiali uses this to check the OpenShift theme, and then set the according theme to their frontend
    // https://github.com/kiali/openshift-servicemesh-plugin/blob/main/plugin/src/openshift/components/KialiController.tsx#L257
  };
}

export const CryostatController = connect(null)(CryostatControllerComponent);
