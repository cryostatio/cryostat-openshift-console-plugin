# Cypress Tests (e2e)

### Prerequisites

There are some limitations with the current setup of the Cypress tests.

- Tests run against the Cryostat plugin in development mode (e.g., localhost:9000)
- At least 1 Cryostat instance must be configured and available
- The Cryostat instance must have a Target

### Instructions

1. Start a local running instance of OKD and the Cryostat plugin

`yarn run start-console`

`yarn run start`

2. Run one of the Cypress test commands:

The following will open a Cypress application window:

`yarn cypress`

The following will simply execute the tests from the command line:

`yarn cypress:headed`

`yarn cypress:headless`
