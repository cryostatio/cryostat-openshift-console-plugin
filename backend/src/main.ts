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
import * as k8s from '@kubernetes/client-node';
import { Server } from './server';

const skipTlsVerify = process.env.NODE_TLS_REJECT_UNAUTHORIZED == '0';

const kc = new k8s.KubeConfig();
kc.loadFromCluster();
kc.applyToHTTPSOptions({
  checkServerIdentity: skipTlsVerify ? () => true : undefined,
  rejectUnauthorized: !skipTlsVerify,
});

const server = new Server(kc, skipTlsVerify);
server.start();
