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

function isDashboardRoute(href: string) {
  return href.endsWith('/cryostat') || href.endsWith('/cryostat/') || href.includes('d-solo');
}

// Fetches the nav link elements, and adds pf-m-current back to the Dashboard link
function addDashboardNavHighlighting() {
  const navLinks = document.getElementsByClassName('pf-v5-c-nav__link');
  for (let i = 0; i < navLinks.length; i++) {
    const href = navLinks[i].getAttribute('href');
    if (!href) {
      continue;
    }
    if (isDashboardRoute(href)) {
      navLinks[i].classList.add('pf-m-current');
    }
  }
}

// Fetches the currently highlighted nav items, and removes pf-m-current from the Dashboard link if found
function removeDashboardNavHighlighting() {
  const currentlySelected = document.getElementsByClassName('pf-m-current');
  for (let i = 0; i < currentlySelected.length; i++) {
    const href = currentlySelected[i].getAttribute('href');
    if (!href) {
      continue;
    }
    if (isDashboardRoute(href)) {
      currentlySelected[i].classList.remove('pf-m-current');
    }
  }
}

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
export function checkNavHighlighting() {
  const currentHref = window.location.href;
  if (!isDashboardRoute(currentHref)) {
    removeDashboardNavHighlighting();
  } else {
    addDashboardNavHighlighting();
  }
}
