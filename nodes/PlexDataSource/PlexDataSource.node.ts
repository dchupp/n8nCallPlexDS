import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export class PlexDataSource implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Plex ERP Data Source',
		name: 'plexDataSource',
		icon: 'file:plex.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'Execute Plex Data Source: {{$parameter["dataSourceId"]}}',
		description: 'Execute Plex ERP Data Source queries via REST API',
		defaults: {
			name: 'Plex Data Source',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'plexBasicAuthApi',
				required: true,
			},
		],
		properties: [
			// Basic Configuration Section
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				placeholder: 'Describe what this data source call does...',
				description: 'Free text area to describe the node\'s purpose and functionality',
			},
			{
				displayName: 'Environment',
				name: 'environment',
				type: 'options',
				options: [
					{
						name: 'Production',
						value: 'production',
					},
					{
						name: 'Test',
						value: 'test',
					},
				],
				default: 'production',
				required: true,
				description: 'Select between production and test environments',
			},
			{
				displayName: 'Colo Name',
				name: 'coloName',
				type: 'string',
				default: '',
				placeholder: 'Enter colo name (leave blank for cloud)',
				description: 'Enter the colo name for on-premise installations. Leave blank for cloud-based instances.',
			},
			{
				displayName: 'Data Source ID',
				name: 'dataSourceId',
				type: 'string',
				default: '',
				required: true,
				placeholder: '12345',
				description: 'The unique identifier for the Plex data source to execute',
			},
			// URL Preview
			{
				displayName: 'Generated URL Preview',
				name: 'urlPreview',
				type: 'options',
				default: '',
				required: false,
				typeOptions: {
					loadOptionsMethod: 'getUrlPreview',
				},
				description: 'This shows the URL that will be called based on your current settings',
			},
			// Body Configuration Section
			{
				displayName: 'Body Input Method',
				name: 'bodyInputMethod',
				type: 'options',
				options: [
					{
						name: 'Key-Value Form',
						value: 'form',
					},
					{
						name: 'Raw JSON',
						value: 'json',
					},
				],
				default: 'form',
				required: true,
				description: 'How to configure the request body',
			},
			// Key-Value Form Parameters
			{
				displayName: 'Body Parameters',
				name: 'bodyParameters',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				default: {},
				options: [
					{
						name: 'parameter',
						displayName: 'Parameter',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								required: true,
								description: 'Parameter name',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Parameter value',
							},
							{
								displayName: 'Data Type',
								name: 'dataType',
								type: 'options',
								options: [
									{
										name: 'String',
										value: 'string',
									},
									{
										name: 'Number',
										value: 'number',
									},
									{
										name: 'Boolean',
										value: 'boolean',
									},
									{
										name: 'Date',
										value: 'date',
									},
								],
								default: 'string',
								description: 'The data type for this parameter',
							},
							{
								displayName: 'Skip if Null',
								name: 'skipIfNull',
								type: 'boolean',
								default: false,
								description: 'Skip this parameter if incoming data is null',
							},
							{
								displayName: 'Data Format',
								name: 'format',
								type: 'string',
								default: '',
								placeholder: 'e.g., YYYY-MM-DD for dates',
								description: 'Format specification for data conversion',
								displayOptions: {
									show: {
										dataType: ['date'],
									},
								},
							},
						],
					},
				],
				displayOptions: {
					show: {
						bodyInputMethod: ['form'],
					},
				},
				description: 'Configure key-value pairs for the request body',
			},
			// Raw JSON Input
			{
				displayName: 'JSON Body',
				name: 'jsonBody',
				type: 'json',
				default: '{}',
				description: 'Raw JSON body for the request',
				displayOptions: {
					show: {
						bodyInputMethod: ['json'],
					},
				},
			},
			// Advanced Settings Section
			{
				displayName: 'Advanced Settings',
				name: 'advancedSettings',
				type: 'collection',
				placeholder: 'Add Setting',
				default: {},
				options: [
					{
						displayName: 'Retry on Failure',
						name: 'retryOnFailure',
						type: 'boolean',
						default: false,
						description: 'Enable automatic retry on failed requests',
					},
					{
						displayName: 'Max Retry Attempts',
						name: 'maxRetryAttempts',
						type: 'number',
						default: 3,
						typeOptions: {
							minValue: 1,
							maxValue: 10,
						},
						displayOptions: {
							show: {
								retryOnFailure: [true],
							},
						},
						description: 'Maximum number of retry attempts',
					},
					{
						displayName: 'Retry Wait Time (ms)',
						name: 'retryWaitTime',
						type: 'number',
						default: 1000,
						typeOptions: {
							minValue: 100,
							maxValue: 30000,
						},
						displayOptions: {
							show: {
								retryOnFailure: [true],
							},
						},
						description: 'Time to wait between retry attempts in milliseconds',
					},
					{
						displayName: 'Request Timeout (ms)',
						name: 'timeout',
						type: 'number',
						default: 30000,
						typeOptions: {
							minValue: 1000,
							maxValue: 300000,
						},
						description: 'Request timeout in milliseconds',
					},
					{
						displayName: 'Follow Redirects',
						name: 'followRedirects',
						type: 'boolean',
						default: true,
						description: 'Automatically follow HTTP redirects',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getUrlPreview(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const environment = this.getCurrentNodeParameter('environment') as string;
					const coloName = this.getCurrentNodeParameter('coloName') as string;
					const dataSourceId = this.getCurrentNodeParameter('dataSourceId') as string;
					
					if (!dataSourceId) {
						return [{ name: 'Enter Data Source ID to see URL preview', value: '' }];
					}
					
					const url = generateUrl(environment || 'production', coloName || '', dataSourceId);
					return [{ name: url, value: url }];
				} catch (error) {
					return [{ name: 'Error generating URL preview', value: '' }];
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				// Get parameters
				const environment = this.getNodeParameter('environment', itemIndex) as string;
				const coloName = this.getNodeParameter('coloName', itemIndex) as string;
				const dataSourceId = this.getNodeParameter('dataSourceId', itemIndex) as string;
				const bodyInputMethod = this.getNodeParameter('bodyInputMethod', itemIndex) as string;
				const advancedSettings = this.getNodeParameter('advancedSettings', itemIndex, {}) as any;

				// Validate required parameters
				if (!environment) {
					throw new NodeOperationError(this.getNode(), 'Environment is required');
				}
				if (!dataSourceId || dataSourceId.trim() === '') {
					throw new NodeOperationError(this.getNode(), 'Data Source ID is required');
				}
				if (!bodyInputMethod) {
					throw new NodeOperationError(this.getNode(), 'Body Input Method is required');
				}

				// Get credentials
				const credentials = await this.getCredentials('plexBasicAuthApi');

				if (!credentials) {
					throw new NodeOperationError(this.getNode(), 'No credentials configured. Please add Plex Basic Auth credentials.');
				}
				if (!credentials.username || !credentials.password) {
					throw new NodeOperationError(this.getNode(), 'Invalid credentials. Username and password are required.');
				}

				// Generate URL
				const url = generateUrl(environment, coloName, dataSourceId);

				// Prepare request body
				const requestBody = await prepareRequestBody(this, bodyInputMethod, itemIndex);

				// Build request config (keep current logic, but add maxBodyLength)
				const basicAuth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
				const requestConfig: AxiosRequestConfig = {
					method: 'POST',
					url,
					data: requestBody,
					headers: {
						'Content-Type': 'application/json',
						'Accept': 'application/json',
						'Authorization': `Basic ${basicAuth}`,
					},
					timeout: advancedSettings.timeout || 30000,
					maxRedirects: advancedSettings.followRedirects !== false ? 5 : 0,
					maxBodyLength: Infinity,
				};

				// Deep logging for n8n output: full request/response
				const redactedRequestConfig = {
					...requestConfig,
					headers: {
						...requestConfig.headers,
						Authorization: '[REDACTED]'
					}
				};

				let response: AxiosResponse | undefined;
				let responseData: INodeExecutionData;
				try {
					response = await executeRequest(requestConfig, advancedSettings);
					responseData = processResponse(response, url);
					// Always attach request/response log
					responseData.json.__plexFullLog = {
						requestConfig: redactedRequestConfig,
						response: response ? {
							status: response.status,
							statusText: response.statusText,
							headers: response.headers,
							data: response.data
						} : undefined
					};
					returnData.push(responseData);
				} catch (err) {
					// Type guard for error object
					const e: any = err;
					const errorLog = {
						error: true,
						errorMessage: e.message,
						errorStack: e.stack,
						errorCode: e.code,
						errorResponse: e.response ? {
							status: e.response.status,
							statusText: e.response.statusText,
							headers: e.response.headers,
							data: e.response.data
						} : undefined,
						requestConfig: redactedRequestConfig
					};
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								...errorLog,
								__plexFullLog: errorLog
							},
							pairedItem: itemIndex
						});
					} else {
						// Attach log to error object for n8n error display
						(e as any).__plexFullLog = errorLog;
						throw err;
					}
				}
				// Skip the old returnData.push(responseData); now handled above

			} catch (error: any) {
				console.error('PlexDataSource Error Details:', {
					message: error.message,
					status: error.response?.status,
					statusText: error.response?.statusText,
					data: error.response?.data,
					code: error.code,
					stack: error.stack
				});

				let errorMessage = error.message || 'Unknown error occurred';
				let errorDetails = '';

				// Get the current parameters for better error reporting
				let dataSourceId = '';
				let url = '';
				try {
					dataSourceId = this.getNodeParameter('dataSourceId', itemIndex) as string;
					const environment = this.getNodeParameter('environment', itemIndex) as string;
					const coloName = this.getNodeParameter('coloName', itemIndex) as string;
					url = generateUrl(environment, coloName, dataSourceId);
				} catch (paramError) {
					console.error('Error getting parameters for error reporting:', paramError);
					// Ignore parameter access errors during error handling
				}

				// Provide more specific error messages based on error type
				if (error.response) {
					// HTTP error response from server
					const status = error.response.status;
					const statusText = error.response.statusText;
					const responseData = error.response.data;
					
					// Check if the response contains a specific error message
					if (responseData) {
						if (typeof responseData === 'string') {
							errorDetails = responseData;
						} else if (responseData.message) {
							errorDetails = responseData.message;
						} else if (responseData.error) {
							errorDetails = responseData.error;
						} else if (responseData.errors && Array.isArray(responseData.errors)) {
							errorDetails = responseData.errors.join(', ');
						} else {
							errorDetails = JSON.stringify(responseData);
						}
					}
					
					switch (status) {
						case 400:
							errorMessage = 'Bad Request: The request parameters are invalid';
							if (!errorDetails) {
								errorDetails = `Check your Data Source ID (${dataSourceId}) and request body parameters`;
							}
							break;
						case 401:
							errorMessage = 'Authentication Failed: Invalid credentials';
							if (!errorDetails) {
								errorDetails = 'Please verify your username and password in the credential settings';
							}
							break;
						case 403:
							errorMessage = 'Access Forbidden: Insufficient permissions';
							if (!errorDetails) {
								errorDetails = 'Your account may not have access to this data source';
							}
							break;
						case 404:
							errorMessage = 'Not Found: Data source or endpoint does not exist';
							if (!errorDetails) {
								errorDetails = `Data Source ID "${dataSourceId}" may not exist or the URL "${url}" is incorrect`;
							}
							break;
						case 419:
							errorMessage = 'Authentication Timeout: Session expired or timed out';
							if (!errorDetails) {
								errorDetails = 'Your session has expired or timed out. Please re-authenticate or check your credentials/server session settings.';
							}
							break;
						case 500:
							errorMessage = 'Server Error: Plex API internal error';
							if (!errorDetails) {
								errorDetails = 'The Plex server encountered an internal error. Try again later.';
							}
							break;
						default:
							errorMessage = `HTTP ${status}: ${statusText}`;
							if (!errorDetails) {
								errorDetails = 'No additional details available';
							}
					}
				} else if (error.code === 'ECONNREFUSED') {
					errorMessage = 'Connection Refused: Unable to connect to Plex server';
					errorDetails = url ? `Check if the URL "${url}" is correct and the server is accessible` : 'Check your URL configuration';
				} else if (error.code === 'ENOTFOUND') {
					errorMessage = 'DNS Error: Hostname not found';
					errorDetails = url ? `Check if the hostname in "${url}" is correct` : 'Check your hostname configuration';
				} else if (error.code === 'ETIMEDOUT') {
					errorMessage = 'Timeout: Request took too long to complete';
					errorDetails = 'Consider increasing the timeout setting or check server availability';
				}

				const fullErrorMessage = errorDetails ? `${errorMessage}. ${errorDetails}` : errorMessage;

// Always attach __plexFullLog to error output for n8n visibility
				const errorLog = {
					error: true,
					errorMessage,
					details: errorDetails,
					url,
					dataSourceId,
					statusCode: error.response?.status,
					originalError: error.message,
					__plexFullLog: {
						error: true,
						errorMessage: error.message,
						errorStack: error.stack,
						errorCode: error.code,
						errorResponse: error.response ? {
							status: error.response.status,
							statusText: error.response.statusText,
							headers: error.response.headers,
							data: error.response.data
						} : undefined,
						requestConfig: undefined // Not available in this catch, but could be passed in future
					}
				};
				if (this.continueOnFail()) {
					returnData.push({
						json: errorLog,
						pairedItem: itemIndex
					});
				} else {
					// Attach __plexFullLog to error object for n8n error display
					(error as any).__plexFullLog = errorLog.__plexFullLog;
					const nodeError = new NodeApiError(this.getNode(), error, {
						message: fullErrorMessage,
						description: errorDetails,
						httpCode: error.response?.status?.toString(),
					});
					// Attach __plexFullLog to the thrown error for n8n UI
					(nodeError as any).__plexFullLog = errorLog.__plexFullLog;
					throw nodeError;
				}
			}
		}

		return [returnData];
	}
}

/**
 * Generate the API URL based on environment and colo settings
 */
function generateUrl(environment: string, coloName: string, dataSourceId: string): string {
	let baseUrl: string;

	if (coloName && coloName.trim() !== '') {
		// On-premise deployment
		if (environment === 'test') {
			baseUrl = `https://${coloName}.test.on.plex.com`;
		} else {
			baseUrl = `https://${coloName}.on.plex.com`;
		}
	} else {
		// Cloud deployment
		if (environment === 'test') {
			baseUrl = 'https://test.cloud.plex.com';
		} else {
			baseUrl = 'https://cloud.plex.com';
		}
	}

	return `${baseUrl}/api/datasources/${dataSourceId}/execute?format=2`;
}

/**
 * Prepare the request body based on input method
 */
async function prepareRequestBody(context: IExecuteFunctions, bodyInputMethod: string, itemIndex: number): Promise<any> {
	if (bodyInputMethod === 'json') {
		const jsonBody = context.getNodeParameter('jsonBody', itemIndex) as string;
		try {
			return JSON.parse(jsonBody);
		} catch (error: any) {
			throw new NodeOperationError(context.getNode(), `Invalid JSON in body: ${error.message}`);
		}
	} else {
		// Form-based key-value pairs
		const bodyParameters = context.getNodeParameter('bodyParameters.parameter', itemIndex, []) as any[];
		const body: any = {};

		for (const param of bodyParameters) {
			let value = param.value;

			// Skip if null and skipIfNull is enabled
			if (param.skipIfNull && (value === null || value === undefined || value === '')) {
				continue;
			}

			// Apply data type conversion
			value = convertDataType(context, value, param.dataType, param.format);

			body[param.key] = value;
		}

		return body;
	}
}

/**
 * Convert value to specified data type
 */
function convertDataType(context: IExecuteFunctions, value: any, dataType: string, format?: string): any {
	if (value === null || value === undefined) {
		return value;
	}

	switch (dataType) {
		case 'number': {
			const num = Number(value);
			if (isNaN(num)) {
				throw new NodeOperationError(context.getNode(), `Cannot convert "${value}" to number`);
			}
			return num;
		}

		case 'boolean': {
			if (typeof value === 'boolean') {
				return value;
			}
			const str = String(value).toLowerCase();
			return str === 'true' || str === '1' || str === 'yes';
		}

		case 'date':
			if (format) {
				// Use custom format if provided
				return formatDate(context, value, format);
			}
			return new Date(value).toISOString();

		case 'string':
		default:
			return String(value);
	}
}

/**
 * Format date according to specified format
 */
function formatDate(context: IExecuteFunctions, value: any, format: string): string {
	const date = new Date(value);
	if (isNaN(date.getTime())) {
		throw new NodeOperationError(context.getNode(), `Invalid date value: ${value}`);
	}

	// Simple format replacement - could be enhanced with a proper date formatting library
	return format
		.replace('YYYY', date.getFullYear().toString())
		.replace('MM', (date.getMonth() + 1).toString().padStart(2, '0'))
		.replace('DD', date.getDate().toString().padStart(2, '0'))
		.replace('HH', date.getHours().toString().padStart(2, '0'))
		.replace('mm', date.getMinutes().toString().padStart(2, '0'))
		.replace('ss', date.getSeconds().toString().padStart(2, '0'));
}

/**
 * Execute HTTP request with retry logic
 */
async function executeRequest(config: AxiosRequestConfig, advancedSettings: any): Promise<AxiosResponse> {
	const maxAttempts = advancedSettings.retryOnFailure ? (advancedSettings.maxRetryAttempts || 3) : 1;
	const waitTime = advancedSettings.retryWaitTime || 1000;

	let lastError: any;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const startTime = Date.now();
			const response = await axios(config);
			const endTime = Date.now();

			// Add execution time to response
			(response as any).executionTime = endTime - startTime;

			return response;
		} catch (error) {
			lastError = error;

			// Don't retry on final attempt
			if (attempt === maxAttempts) {
				break;
			}

			// Wait before retry with exponential backoff
			const delay = waitTime * Math.pow(2, attempt - 1);
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}

	throw lastError;
}

/**
 * Process the HTTP response
 */
function processResponse(response: AxiosResponse, requestUrl: string): INodeExecutionData {
	return {
		json: {
			statusCode: response.status,
			headers: response.headers,
			body: response.data,
			requestUrl,
			executionTime: (response as any).executionTime || 0,
		},
	};
}
