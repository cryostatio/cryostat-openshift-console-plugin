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

/**
 * Integration tests for server.ts Express routing functionality.
 *
 * These tests exercise real Express routing with path-to-regexp to validate
 * that parameterized path proxying works correctly.
 */

process.env.NODE_ENV = 'test';

import * as k8s from '@kubernetes/client-node';
import express from 'express';
import request from 'supertest';

const mockK8sApi = {
  readNamespacedService: jest.fn(),
};

const mockKubeConfig = {
  loadFromCluster: jest.fn(),
  applyToHTTPSOptions: jest.fn(),
  makeApiClient: jest.fn(() => mockK8sApi),
} as unknown as k8s.KubeConfig;

// Mock http-proxy to avoid actual network calls
jest.mock('http-proxy', () => ({
  createProxyServer: jest.fn(() => ({
    web: jest.fn((req, res, opts, _callback) => {
      // Simulate successful proxy by capturing the corrected URL
      // This allows us to verify the path was correctly processed
      res.status(200).json({
        proxied: true,
        method: req.method,
        url: req.url,
        target: opts.target,
      });
    }),
    ws: jest.fn(),
  })),
}));

describe('Server Express Routing Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    mockK8sApi.readNamespacedService.mockResolvedValue({
      metadata: {
        labels: {
          'app.kubernetes.io/part-of': 'cryostat',
          'app.kubernetes.io/component': 'cryostat',
        },
      },
      spec: {
        ports: [
          {
            name: 'cryostat-https',
            port: 8181,
            appProtocol: 'https',
          },
        ],
      },
    });

    const { Server } = require('../server');
    const server = new Server(mockKubeConfig);
    app = server.getApp();
  });

  beforeEach(() => {
    mockK8sApi.readNamespacedService.mockResolvedValue({
      metadata: {
        labels: {
          'app.kubernetes.io/part-of': 'cryostat',
          'app.kubernetes.io/component': 'cryostat',
        },
      },
      spec: {
        ports: [
          {
            name: 'cryostat-https',
            port: 8181,
            appProtocol: 'https',
          },
        ],
      },
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Health endpoint', () => {
    it('should respond to health check', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(204);
    });
  });

  describe('Upstream proxy routing with wildcard paths', () => {
    const testCases = [
      {
        description: 'simple API path',
        path: '/upstream/api',
        expectedUrl: '/api',
      },
      {
        description: 'API path with version',
        path: '/upstream/api/v3/targets',
        expectedUrl: '/api/v3/targets',
      },
      {
        description: 'nested API path with ID parameter',
        path: '/upstream/api/v3/targets/123/recordings',
        expectedUrl: '/api/v3/targets/123/recordings',
      },
      {
        description: 'deeply nested path',
        path: '/upstream/api/v3/targets/service:jvm:123/recordings/my-recording',
        expectedUrl: '/api/v3/targets/service:jvm:123/recordings/my-recording',
      },
      {
        description: 'path with special characters',
        path: '/upstream/api/v3/targets/my-app_v1.2.3/events',
        expectedUrl: '/api/v3/targets/my-app_v1.2.3/events',
      },
      {
        description: 'path with query parameters',
        path: '/upstream/api/v3/targets?filter=active',
        expectedUrl: '/api/v3/targets?filter=active',
      },
      {
        description: 'path with multiple query parameters',
        path: '/upstream/api/v3/recordings?state=RUNNING&limit=10',
        expectedUrl: '/api/v3/recordings?state=RUNNING&limit=10',
      },
      {
        description: 'path with encoded query parameters',
        path: '/upstream/api/v3/targets?name=my%20app',
        expectedUrl: '/api/v3/targets?name=my%20app',
      },
    ];

    testCases.forEach(({ description, path, expectedUrl }) => {
      it(`should correctly route ${description}`, async () => {
        const response = await request(app)
          .get(path)
          .set('cryostat-svc-ns', 'test-namespace')
          .set('cryostat-svc-name', 'test-service');

        expect(response.status).toBe(200);
        expect(response.body.proxied).toBe(true);
        expect(response.body.url).toBe(expectedUrl);
        expect(response.body.target).toBe('https://test-service.test-namespace:8181');
      });
    });

    it('should handle POST requests with path parameters', async () => {
      const response = await request(app)
        .post('/upstream/api/v3/targets/123/recordings')
        .set('cryostat-svc-ns', 'test-namespace')
        .set('cryostat-svc-name', 'test-service')
        .send({ name: 'test-recording' });

      expect(response.status).toBe(200);
      expect(response.body.method).toBe('POST');
      expect(response.body.url).toBe('/api/v3/targets/123/recordings');
    });

    it('should handle DELETE requests with nested paths', async () => {
      const response = await request(app)
        .delete('/upstream/api/v3/targets/123/recordings/my-recording')
        .set('cryostat-svc-ns', 'test-namespace')
        .set('cryostat-svc-name', 'test-service');

      expect(response.status).toBe(200);
      expect(response.body.method).toBe('DELETE');
      expect(response.body.url).toBe('/api/v3/targets/123/recordings/my-recording');
    });

    it('should handle PUT requests', async () => {
      const response = await request(app)
        .put('/upstream/api/v3/rules/my-rule')
        .set('cryostat-svc-ns', 'test-namespace')
        .set('cryostat-svc-name', 'test-service')
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body.method).toBe('PUT');
      expect(response.body.url).toBe('/api/v3/rules/my-rule');
    });

    it('should handle PATCH requests', async () => {
      const response = await request(app)
        .patch('/upstream/api/v3/targets/123')
        .set('cryostat-svc-ns', 'test-namespace')
        .set('cryostat-svc-name', 'test-service')
        .send({ alias: 'new-alias' });

      expect(response.status).toBe(200);
      expect(response.body.method).toBe('PATCH');
      expect(response.body.url).toBe('/api/v3/targets/123');
    });
  });

  describe('Error handling', () => {
    it('should return 400 when namespace is missing', async () => {
      const response = await request(app).get('/upstream/api/v3/targets').set('cryostat-svc-name', 'test-service');

      expect(response.status).toBe(400);
    });

    it('should return 400 when service name is missing', async () => {
      const response = await request(app).get('/upstream/api/v3/targets').set('cryostat-svc-ns', 'test-namespace');

      expect(response.status).toBe(400);
    });

    it('should return 400 when both namespace and service name are missing', async () => {
      const response = await request(app).get('/upstream/api/v3/targets');

      expect(response.status).toBe(400);
    });

    it('should return 502 when service lookup fails', async () => {
      mockK8sApi.readNamespacedService.mockRejectedValueOnce(new Error('Service not found'));

      const response = await request(app)
        .get('/upstream/api/v3/targets')
        .set('cryostat-svc-ns', 'test-namespace')
        .set('cryostat-svc-name', 'nonexistent-service');

      expect(response.status).toBe(502);
    });

    it('should return 502 when service has incorrect labels', async () => {
      mockK8sApi.readNamespacedService.mockResolvedValueOnce({
        metadata: {
          labels: {
            app: 'other-app',
          },
        },
        spec: {
          ports: [{ port: 8080 }],
        },
      });

      const response = await request(app)
        .get('/upstream/api/v3/targets')
        .set('cryostat-svc-ns', 'test-namespace')
        .set('cryostat-svc-name', 'wrong-service');

      expect(response.status).toBe(502);
    });
  });

  describe('Query parameter handling', () => {
    it('should accept namespace and service name from query parameters', async () => {
      const response = await request(app).get('/upstream/api/v3/targets?ns=query-namespace&name=query-service');

      expect(response.status).toBe(200);
      expect(response.body.proxied).toBe(true);
      expect(response.body.url).toBe('/api/v3/targets?ns=query-namespace&name=query-service');
    });

    it('should prefer headers over query parameters', async () => {
      const response = await request(app)
        .get('/upstream/api/v3/targets?ns=query-namespace&name=query-service')
        .set('cryostat-svc-ns', 'header-namespace')
        .set('cryostat-svc-name', 'header-service');

      expect(response.status).toBe(200);
      expect(response.body.target).toBe('https://header-service.header-namespace:8181');
    });
  });

  describe('Path-to-regexp wildcard syntax', () => {
    it('should correctly extract and reconstruct parameterized paths', async () => {
      const testPath = '/upstream/api/v3/targets/service:jvm:discovery/recordings/my-recording-123';

      const response = await request(app)
        .get(testPath)
        .set('cryostat-svc-ns', 'test-namespace')
        .set('cryostat-svc-name', 'test-service');

      expect(response.status).toBe(200);
      expect(response.body.proxied).toBe(true);

      // the URL should be correctly reconstructed without the /upstream prefix
      expect(response.body.url).toBe('/api/v3/targets/service:jvm:discovery/recordings/my-recording-123');
    });

    it('should handle edge case: root API path', async () => {
      const response = await request(app)
        .get('/upstream/api')
        .set('cryostat-svc-ns', 'test-namespace')
        .set('cryostat-svc-name', 'test-service');

      expect(response.status).toBe(200);
      expect(response.body.url).toBe('/api');
    });

    it('should handle edge case: path with trailing slash', async () => {
      const response = await request(app)
        .get('/upstream/api/v3/targets/')
        .set('cryostat-svc-ns', 'test-namespace')
        .set('cryostat-svc-name', 'test-service');

      expect(response.status).toBe(200);
      // Note: Express normalizes trailing slashes, so /api/v3/targets/ becomes /api/v3/targets
      expect(response.body.url).toBe('/api/v3/targets');
    });

    it('should handle edge case: very long nested path', async () => {
      const longPath = '/upstream/api/v3/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p';

      const response = await request(app)
        .get(longPath)
        .set('cryostat-svc-ns', 'test-namespace')
        .set('cryostat-svc-name', 'test-service');

      expect(response.status).toBe(200);
      expect(response.body.url).toBe('/api/v3/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p');
    });
  });

  describe('Service port selection', () => {
    it('should prefer https port by appProtocol', async () => {
      mockK8sApi.readNamespacedService.mockResolvedValueOnce({
        metadata: {
          labels: {
            'app.kubernetes.io/part-of': 'cryostat',
            'app.kubernetes.io/component': 'cryostat',
          },
        },
        spec: {
          ports: [
            { name: 'http', port: 8080, appProtocol: 'http' },
            { name: 'https', port: 8181, appProtocol: 'https' },
          ],
        },
      });

      const response = await request(app)
        .get('/upstream/api/v3/targets')
        .set('cryostat-svc-ns', 'test-namespace')
        .set('cryostat-svc-name', 'test-service');

      expect(response.status).toBe(200);
      expect(response.body.target).toBe('https://test-service.test-namespace:8181');
    });

    it('should use http port when https is not available', async () => {
      // This test needs to override the default mock set in beforeEach
      // We need to call it twice - once for getServicePort and once for the actual request
      const httpServiceResponse = {
        metadata: {
          labels: {
            'app.kubernetes.io/part-of': 'cryostat',
            'app.kubernetes.io/component': 'cryostat',
          },
        },
        spec: {
          ports: [{ name: 'http', port: 8080, appProtocol: 'http' }],
        },
      };

      mockK8sApi.readNamespacedService
        .mockResolvedValueOnce(httpServiceResponse)
        .mockResolvedValueOnce(httpServiceResponse);

      const response = await request(app)
        .get('/upstream/api/v3/targets')
        .set('cryostat-svc-ns', 'test-namespace')
        .set('cryostat-svc-name', 'test-service');

      expect(response.status).toBe(200);
      expect(response.body.target).toBe('http://test-service.test-namespace:8080');
    });

    it('should fall back to port name matching when appProtocol is not set', async () => {
      mockK8sApi.readNamespacedService.mockResolvedValueOnce({
        metadata: {
          labels: {
            'app.kubernetes.io/part-of': 'cryostat',
            'app.kubernetes.io/component': 'cryostat',
          },
        },
        spec: {
          ports: [{ name: 'cryostat-https', port: 8181 }],
        },
      });

      const response = await request(app)
        .get('/upstream/api/v3/targets')
        .set('cryostat-svc-ns', 'test-namespace')
        .set('cryostat-svc-name', 'test-service');

      expect(response.status).toBe(200);
      expect(response.body.target).toBe('https://test-service.test-namespace:8181');
    });
  });
});
