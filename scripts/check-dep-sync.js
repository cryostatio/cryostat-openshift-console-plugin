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
const fs = require('fs');
const path = require('path');

const rootPkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const webPkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'cryostat-web', 'package.json'), 'utf8'));

const rootDeps = Object.assign({}, rootPkg.dependencies, rootPkg.devDependencies);
const webDeps = Object.assign({}, webPkg.dependencies, webPkg.devDependencies);

const errors = [];

for (const [name, rootVersion] of Object.entries(rootDeps)) {
  if (name in webDeps && rootVersion !== webDeps[name]) {
    errors.push(`  ${name}: console-plugin has "${rootVersion}", cryostat-web has "${webDeps[name]}"`);
  }
}

const rootRes = rootPkg.resolutions || {};
const webRes = webPkg.resolutions || {};

for (const [name, rootVersion] of Object.entries(rootRes)) {
  if (name in webRes && rootVersion !== webRes[name]) {
    errors.push(`  ${name} (resolution): console-plugin has "${rootVersion}", cryostat-web has "${webRes[name]}"`);
  }
}

if (errors.length > 0) {
  console.error('Dependency version mismatches between console-plugin and cryostat-web:');
  errors.forEach((e) => console.error(e));
  console.error(
    '\nShared dependencies should be declared in cryostat-web and inherited via workspace hoisting.',
  );
  console.error('Either remove the dependency from the console-plugin or update cryostat-web to match.');
  process.exit(1);
} else {
  console.log('All shared dependency versions are in sync.');
}
