# SNI Whitelist Feature

## Overview

The SNI (Server Name Indication) Whitelist feature analyzes collected domains and IP addresses to generate optimized whitelists for SNI filtering. This is essential for network security appliances and proxies that need to allow specific domains while blocking others.

## Key Features

### 1. Domain Classification

Domains are automatically classified into three categories based on their resource types:

- **Essential Domains**: Required for website functionality
  - `document` - HTML pages
  - `script` - JavaScript files
  - `fetch` - API calls
  - `xhr` - AJAX requests
  - `websocket` - WebSocket connections

- **Optional Domains**: Improve user experience but not required
  - `stylesheet` - CSS files
  - `font` - Web fonts
  - `image` - Images

- **Excluded Domains**: Can be safely excluded
  - `media` - Video/audio
  - `ping` - Analytics pings
  - `other` - Miscellaneous

### 2. Wildcard Pattern Generation

Automatically generates wildcard domain patterns for efficient whitelisting:

```
auth.my.example.com
api.my.example.com
cdn.my.example.com
↓
*.example.com
```

Wildcards are only generated when 2+ subdomains share the same base domain.

### 3. IP Address Filtering

Separates public and private IP addresses:

**Private IP Ranges (automatically excluded):**
- `10.0.0.0/8` - Class A private
- `172.16.0.0/12` - Class B private
- `192.168.0.0/16` - Class C private
- `127.0.0.0/8` - Loopback
- `169.254.0.0/16` - Link-local
- `fe80::/10` - IPv6 link-local
- `fc00::/7` - IPv6 unique local

### 4. Multiple Export Formats

Supports 6 different export formats:

1. **Plain Text (txt)** - Simple line-by-line list
2. **JSON** - Full structured data with metadata
3. **CSV** - Spreadsheet-compatible format
4. **Squid Proxy** - ACL format for Squid proxy server
5. **pfSense** - Firewall alias format
6. **FortiGate** - URL filter configuration

## Architecture

### Service Layer

**SNIWhitelistService** (`src/services/SNIWhitelistService.ts`)
- `analyzeDomains()` - Analyzes domains and generates whitelist
- `exportWhitelist()` - Exports in specified format
- `classifyDomain()` - Classifies domains by resource type
- `generateWildcardPatterns()` - Creates wildcard patterns
- `filterIPs()` - Separates public/private IPs

### Type Definitions

**New Types** (`src/types.ts`)
```typescript
DomainClassification = 'essential' | 'optional' | 'excluded'

interface WildcardPattern {
  pattern: string;           // *.example.com
  matchedDomains: string[];  // [auth.example.com, api.example.com]
  count: number;             // Total requests
}

interface ClassifiedDomain {
  domain: string;
  classification: DomainClassification;
  reason: string;            // Why it was classified this way
  info: DomainInfo;          // Original domain info
}

interface SNIWhitelistResult {
  timestamp: string;
  totalDomains: number;
  totalIPs: number;
  essentialDomains: ClassifiedDomain[];
  optionalDomains: ClassifiedDomain[];
  excludedDomains: ClassifiedDomain[];
  wildcardPatterns: WildcardPattern[];
  publicIPs: string[];
  privateIPs: string[];
  stats: { ... };
}

interface SNIExportOptions {
  format: 'txt' | 'json' | 'csv' | 'squid' | 'pfsense' | 'fortigate';
  includeWildcards?: boolean;
  includeIPs?: boolean;
  includeOptional?: boolean;
  includeComments?: boolean;
}
```

### IPC Communication

**Main Process** (`src/main.ts`)
```typescript
ipcMain.handle('analyze-sni-whitelist', async (_event, domains, ips) => {
  const result = sniWhitelistService.analyzeDomains(domains, ips);
  return { success: true, data: result };
});

ipcMain.handle('export-sni-whitelist', async (_event, result, options) => {
  const exported = sniWhitelistService.exportWhitelist(result, options);
  return { success: true, data: exported };
});
```

**Renderer Process** (`src/preload.ts`)
```typescript
window.electronAPI.analyzeSNIWhitelist(domains, ips);
window.electronAPI.exportSNIWhitelist(result, options);
```

## Usage Example

### Basic Analysis

```javascript
// After collecting domains via tracking or analysis
const domains = await window.electronAPI.getCurrentDomains();
const ips = ['54.180.59.158', '192.168.1.1', '10.0.0.1'];

// Analyze for SNI whitelist
const result = await window.electronAPI.analyzeSNIWhitelist(domains, ips);

if (result.success) {
  console.log('Analysis Results:');
  console.log('Essential domains:', result.data.essentialDomains.length);
  console.log('Optional domains:', result.data.optionalDomains.length);
  console.log('Wildcard patterns:', result.data.wildcardPatterns.length);
  console.log('Public IPs:', result.data.publicIPs.length);
  console.log('Private IPs:', result.data.privateIPs.length);
}
```

### Export to Text File

```javascript
// Export as plain text with wildcards and comments
const exportResult = await window.electronAPI.exportSNIWhitelist(result.data, {
  format: 'txt',
  includeWildcards: true,
  includeIPs: true,
  includeOptional: false,    // Only essential domains
  includeComments: true      // Include explanatory comments
});

if (exportResult.success) {
  // Save to file
  await window.electronAPI.saveFile('sni-whitelist.txt', exportResult.data);
}
```

### Export to Squid Proxy Format

```javascript
const exportResult = await window.electronAPI.exportSNIWhitelist(result.data, {
  format: 'squid',
  includeWildcards: true,
  includeOptional: true,
  includeComments: true
});

// Output:
// acl whitelist_domains dstdomain \
//   .example.com \
//   auth.example.com \
//   api.example.com
// http_access allow whitelist_domains
```

### Export to JSON

```javascript
const exportResult = await window.electronAPI.exportSNIWhitelist(result.data, {
  format: 'json',
  includeWildcards: true,
  includeIPs: true,
  includeOptional: true
});

// Full structured data with all metadata
```

## Output Examples

### Plain Text Format

```
# SNI Whitelist
# Generated: 2024-01-15T10:30:00.000Z
# Total Domains: 8
# Essential: 5, Optional: 3

# Wildcard Patterns
*.genians.co.kr
*.slack-edge.com

# Essential Domains
auth.my.genians.co.kr
api.genians.com
cdn.example.com

# Optional Domains
fonts.googleapis.com
images.example.com

# Public IP Addresses
54.180.59.158
13.227.180.4
```

### CSV Format

```csv
Domain,Classification,Request Count,Resource Types,Reason
auth.my.genians.co.kr,essential,75,"document, script, fetch","Essential resource types: document, script, fetch"
ssl.gstatic.com,optional,1,"font","Optional resource types: font"
```

### Squid Proxy Format

```
# Squid ACL Whitelist
# Generated: 2024-01-15T10:30:00.000Z

acl whitelist_domains dstdomain \
  .genians.co.kr \
  .slack-edge.com \
  auth.my.genians.co.kr \
  api.genians.com

http_access allow whitelist_domains
```

### FortiGate Format

```
# FortiGate URL Filter
# Generated: 2024-01-15T10:30:00.000Z

config webfilter urlfilter
  edit "SNI_Whitelist"
    config entries
      edit 1
        set url "auth.my.genians.co.kr"
        set type simple
        set action allow
      next
      edit 2
        set url "api.genians.com"
        set type simple
        set action allow
      next
    end
  next
end
```

## Integration with Existing Tabs

### Manual Tracking Tab

After stopping tracking, the collected domains can be analyzed:

```javascript
// Stop tracking
const trackResult = await window.electronAPI.stopTracking();

// Analyze for SNI whitelist
const sniResult = await window.electronAPI.analyzeSNIWhitelist(
  trackResult.domains,
  trackResult.ips || []
);
```

### Auto Analysis Tab

After URL analysis completes:

```javascript
// Analyze URL
const analysisResult = await window.electronAPI.analyzeUrl(url, options);

// Convert to SNI whitelist
const sniResult = await window.electronAPI.analyzeSNIWhitelist(
  analysisResult.domains,
  analysisResult.allIPs || []
);
```

### Workflow Tab

After workflow execution:

```javascript
// Run workflow
const workflowResult = await window.electronAPI.runWorkflow(steps);

// Analyze results
const sniResult = await window.electronAPI.analyzeSNIWhitelist(
  workflowResult.domains,
  workflowResult.allIPs || []
);
```

## Benefits for SNI Filtering

1. **Automated Domain Classification**: No need to manually determine which domains are essential
2. **Wildcard Optimization**: Reduces whitelist size while maintaining coverage
3. **Private IP Exclusion**: Prevents internal IPs from appearing in external whitelists
4. **Multiple Format Support**: Works with various network security appliances
5. **Resource Type Intelligence**: Understands website architecture to make smart decisions

## Implementation Details

### Subdomain Analysis Algorithm

```typescript
// Group domains by base domain
auth.my.example.com → example.com
api.my.example.com → example.com
www.example.com → example.com

// Generate wildcard if 2+ subdomains
example.com: [auth.my.example.com, api.my.example.com, www.example.com]
↓
Pattern: *.example.com
Matched: [auth.my.example.com, api.my.example.com, www.example.com]
```

### Special TLD Handling

Correctly handles multi-part TLDs:

```
example.co.kr → Base domain: example.co.kr
auth.example.co.kr → Base domain: example.co.kr
www.example.com → Base domain: example.com
```

### IP Address Detection

```typescript
// IPv4
192.168.1.1 → Private (Class C)
54.180.59.158 → Public (AWS)

// IPv6
fe80::1 → Private (Link-local)
2001:db8::1 → Public
```

## Future Enhancements

Potential improvements for future versions:

1. **Machine Learning Classification**: Learn from user feedback to improve classification
2. **Geo-IP Analysis**: Include geographical information for IPs
3. **CDN Optimization**: Special handling for CDN domains
4. **Regex Pattern Generation**: Generate regex patterns for advanced filtering
5. **Blacklist Generation**: Inverse operation for blocked domains
6. **Performance Metrics**: Include latency and reliability data
7. **Certificate Analysis**: Extract and validate SSL/TLS certificates

## Testing

To test the SNI whitelist feature:

1. **Start the app**: `npm run dev`
2. **Collect domains**: Use any of the three tabs (Manual/Auto/Workflow)
3. **Open DevTools**: Right-click → Inspect
4. **Run in console**:

```javascript
// Get current domains (during tracking)
const domains = await window.electronAPI.getCurrentDomains();

// Simulate some IPs
const ips = ['54.180.59.158', '192.168.1.1', '10.0.0.1'];

// Analyze
const result = await window.electronAPI.analyzeSNIWhitelist(domains, ips);
console.log('SNI Analysis:', result);

// Export as text
const exported = await window.electronAPI.exportSNIWhitelist(result.data, {
  format: 'txt',
  includeWildcards: true,
  includeIPs: true,
  includeOptional: false,
  includeComments: true
});
console.log('Exported:\n', exported.data);
```

## Technical Notes

- **Zero External Dependencies**: All classification logic is built-in
- **Performance**: Optimized for large domain lists (1000+ domains)
- **Memory Efficient**: Uses Sets for deduplication
- **Type Safety**: Full TypeScript type definitions
- **NestJS Architecture**: Follows dependency injection patterns
- **Service Layer**: Completely decoupled from UI

## References

- RFC 6066 - TLS Extensions (SNI)
- RFC 1918 - Private IPv4 Address Space
- RFC 4193 - IPv6 Unique Local Addresses
- Squid Proxy Documentation
- pfSense Documentation
- FortiGate URL Filtering Guide
