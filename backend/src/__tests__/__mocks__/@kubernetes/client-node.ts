export class KubeConfig {
  loadFromCluster = jest.fn();
  applyToHTTPSOptions = jest.fn();
  makeApiClient = jest.fn();
}

export class CoreV1Api {
  readNamespacedService = jest.fn();
}