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

  componentWillUntmount(): void {
    // do nothing for now.
  }

  render(): React.ReactNode {
    return this.state.loaded ? <>{this.props.children}</> : <h1>loading!</h1>;
  }

  private loadCryostat = async (): Promise<void> => {
    await this.getCryostatConfig();
    this.checkNavHighlighting();
    this.applyUIDefaults();
    this.setDocLayout();
    this.setState({ loaded: true });
  };

  /**
   * At the moment, nested routes will cause multiple nav items to be highlighted in the Console main navigation.
   *
   * This means by default the Dashboard nav item (route /cryostat/) will be highlighted when visiting any of the
   * Cryostat plugin pages (routes /cryostat/whatever/) in addition to highlighting the currently selected page.
   *
   * This function checks the current href, and if it is not a Dashboard page then it will remove the pf-m-current class
   * from the <a> classList to remove the highlighting. Due to this manual intervention, we also need to ensure that the
   * pf-m-current returns when routing back to a Dashboard page, as it is not added back automatically.
   */
  private checkNavHighlighting = (): void => {
    const currentHref = window.location.href;
    if (!this.isDashboardRoute(currentHref)) {
      this.removeDashboardNavHighlighting();
    } else {
      this.addDashboardNavHighlighting();
    }
  };

  private isDashboardRoute = (href: string): Boolean => {
    return href.endsWith('/cryostat') || href.endsWith('/cryostat/') || href.includes('d-solo');
  };

  // Fetches the currently highlighted nav items, and removes pf-m-current from the Dashboard link if found
  private removeDashboardNavHighlighting = (): void => {
    const currentlySelected = document.getElementsByClassName('pf-m-current');
    for (let i = 0; i < currentlySelected.length; i++) {
      const href = currentlySelected[i].getAttribute('href');
      if (!href) {
        continue;
      }
      if (this.isDashboardRoute(href)) {
        currentlySelected[i].classList.remove('pf-m-current');
      }
    }
  };

  // Fetches the nav link elements, and adds pf-m-current back to the Dashboard link
  private addDashboardNavHighlighting = (): void => {
    const navLinks = document.getElementsByClassName('pf-v5-c-nav__link');
    for (let i = 0; i < navLinks.length; i++) {
      const href = navLinks[i].getAttribute('href');
      if (!href) {
        continue;
      }
      if (this.isDashboardRoute(href)) {
        navLinks[i].classList.add('pf-m-current');
      }
    }
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
