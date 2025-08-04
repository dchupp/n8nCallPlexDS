// Jest setup file for n8n Plex DataSource node tests

// Global test configuration
beforeEach(() => {
	jest.clearAllMocks();
});

// Add any global test utilities here
(global as any).testUtils = {
	createMockExecuteFunction: () => ({
		getNodeParameter: jest.fn(),
		getCredentials: jest.fn(),
		getInputData: jest.fn(),
		helpers: {
			request: jest.fn(),
		},
	}),
};