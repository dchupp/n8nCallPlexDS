# Create an n8n Node to call Plex ERP Data Sources

## Overview
This n8n custom node enables seamless integration with Plex ERP Data Sources by performing HTTP requests to execute data source queries. The node supports both production and test environments with configurable authentication and retry mechanisms.

## Node Metadata
- **Node Name**: Plex Data Source
- **Display Name**: Plex ERP Data Source
- **Icon**: `plex.svg` (custom icon)
- **Group**: ["transform"]
- **Version**: 1.0.0
- **Subtitle**: "Execute Plex Data Source: {{$parameter.dataSourceId}}"

## Node Parameters

### Basic Configuration
#### Description
- **Type**: `multiOptions` (textarea)
- **Display Name**: "Description"
- **Placeholder**: "Describe what this data source call does..."
- **Required**: false
- **Default**: ""
- **Description**: Free text area to describe the node's purpose and functionality

#### Environment Selector
- **Type**: `options`
- **Display Name**: "Environment"
- **Required**: true
- **Default**: "production"
- **Options**:
  - `production`: "Production"
  - `test`: "Test"
- **Description**: Select between production and test environments

#### Colo Input
- **Type**: `string`
- **Display Name**: "Colo Name"
- **Required**: false
- **Default**: ""
- **Placeholder**: "Enter colo name (leave blank for cloud)"
- **Description**: Enter the colo name for on-premise installations. Leave blank for cloud-based instances.

#### Data Source ID
- **Type**: `string`
- **Display Name**: "Data Source ID"
- **Required**: true
- **Placeholder**: "12345"
- **Description**: The unique identifier for the Plex data source to execute

### URL Generation & Preview
#### DataSource URL Generation
- **Type**: `notice`
- **Display Name**: "Generated URL Preview"
- **Dynamic Content**: Shows real-time URL preview based on current parameters

**URL Logic**:
- If Colo name is not null or blank:
  - **Production**: `https://{colo_name}.on.plex.com/api/datasources/{DataSource_ID}/execute?format=2`
  - **Test**: `https://{colo_name}.test.on.plex.com/api/datasources/{DataSource_ID}/execute?format=2`
- If Colo name is blank:
  - **Production**: `https://cloud.plex.com/api/datasources/{DataSource_ID}/execute?format=2`
  - **Test**: `https://test.cloud.plex.com/api/datasources/{DataSource_ID}/execute?format=2`

### Authentication
#### Auth Selector
- **Type**: `options`
- **Display Name**: "Authentication Type"
- **Required**: true
- **Default**: "basicAuth"
- **Options**:
  - `basicAuth`: "Basic Authentication"
- **Description**: Authentication method (currently only Basic Auth supported)

#### Credential Selector
- **Type**: `credentialsSelect`
- **Display Name**: "Credentials"
- **Required**: true
- **CredentialTypes**: ["httpBasicAuth"]
- **Description**: Select Basic Auth credentials for Plex API access

### Request Body Configuration
#### Body Input Method
- **Type**: `options`
- **Display Name**: "Body Input Method"
- **Required**: true
- **Default**: "form"
- **Options**:
  - `form`: "Key-Value Form"
  - `json`: "Raw JSON"

#### Key-Value Form (when method = "form")
- **Type**: `fixedCollection`
- **Display Name**: "Body Parameters"
- **TypeOptions**: 
  - `multipleValues`: true
  - `sortable`: true
- **Options**:
  - **Key**: 
    - Type: `string`
    - Display Name: "Key"
    - Required: true
  - **Value**: 
    - Type: `string`
    - Display Name: "Value"
    - Required: false
  - **Data Type**:
    - Type: `options`
    - Display Name: "Data Type"
    - Default: "string"
    - Options: ["string", "number", "boolean", "date"]
  - **Nullable**:
    - Type: `boolean`
    - Display Name: "Skip if Null"
    - Default: false
    - Description: "Skip this parameter if incoming data is null"
  - **Format**:
    - Type: `string`
    - Display Name: "Data Format"
    - Placeholder: "e.g., YYYY-MM-DD for dates"
    - Required: false

#### Raw JSON (when method = "json")
- **Type**: `json`
- **Display Name**: "JSON Body"
- **Required**: false
- **Default**: "{}"

## Advanced Settings

### Retry Configuration
#### Enable Retry on Failure
- **Type**: `boolean`
- **Display Name**: "Retry on Failure"
- **Default**: false
- **Description**: Enable automatic retry on failed requests

#### Max Retry Attempts
- **Type**: `number`
- **Display Name**: "Max Retry Attempts"
- **Default**: 3
- **Min**: 1
- **Max**: 10
- **DisplayOptions**: 
  - `show`: { "retryOnFailure": [true] }
- **Description**: Maximum number of retry attempts

#### Retry Wait Time
- **Type**: `number`
- **Display Name**: "Wait Time Between Retries (ms)"
- **Default**: 1000
- **Min**: 100
- **Max**: 30000
- **DisplayOptions**: 
  - `show`: { "retryOnFailure": [true] }
- **Description**: Time to wait between retry attempts in milliseconds

### Request Options
#### Timeout
- **Type**: `number`
- **Display Name**: "Request Timeout (ms)"
- **Default**: 30000
- **Min**: 1000
- **Max**: 300000
- **Description**: Request timeout in milliseconds

#### Follow Redirects
- **Type**: `boolean`
- **Display Name**: "Follow Redirects"
- **Default**: true
- **Description**: Automatically follow HTTP redirects

## Node Functionality

### Core Function
The node performs HTTP POST requests to Plex ERP Data Sources with the following workflow:

1. **URL Construction**: Dynamically builds the API endpoint URL based on environment and colo settings
2. **Authentication**: Applies Basic Auth credentials to the request
3. **Body Processing**: Constructs JSON body from key-value pairs or raw JSON input
4. **Request Execution**: Sends HTTP POST request to Plex API
5. **Response Handling**: Processes and returns the API response
6. **Error Management**: Implements retry logic and comprehensive error handling

### Input Processing
- Accepts incoming JSON data from previous nodes
- Applies data type conversion and formatting
- Handles null value filtering based on "Skip if Null" settings
- Validates required parameters before execution

### Output Format
Returns structured response containing:
- **statusCode**: HTTP response status code
- **headers**: Response headers object
- **body**: Parsed response body (JSON format)
- **requestUrl**: The actual URL that was called
- **executionTime**: Request execution time in milliseconds

### Error Handling
- **Connection Errors**: Network connectivity issues
- **Authentication Errors**: Invalid credentials or permissions
- **API Errors**: Plex-specific error responses
- **Timeout Errors**: Request timeout exceeded
- **Validation Errors**: Missing or invalid parameters

## Implementation Notes

### Dependencies
- **axios**: For HTTP requests
- **lodash**: For data manipulation utilities

### Validation Rules
1. Data Source ID must be numeric
2. Colo name must contain only alphanumeric characters and hyphens
3. Timeout must be positive integer
4. Max retry attempts must be between 1-10

### Performance Considerations
- Connection pooling for multiple requests
- Response caching for identical requests (optional)
- Memory-efficient JSON parsing for large responses

### Security
- Credentials stored securely in n8n credential system
- HTTPS-only communication
- Input sanitization to prevent injection attacks

## Testing Strategy

### Unit Tests
- URL generation logic
- Body parameter processing
- Error handling scenarios
- Retry mechanism functionality

### Integration Tests
- End-to-end API calls with test data sources
- Authentication flow validation
- Environment switching verification

### User Acceptance Tests
- UI parameter validation
- Error message clarity
- Performance under load 
