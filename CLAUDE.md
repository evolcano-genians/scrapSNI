# Domain Tracker - Project Context for Claude

## Project Overview

Domain Tracker is a comprehensive network analysis tool for generating domain/IP whitelists. Built with Electron and Playwright for cross-platform desktop automation.

## Core Features

### 1. Manual Tracking Tab
- Real-time domain tracking through Playwright browser automation
- Session persistence for authenticated workflows
- Live domain list updates

### 2. Auto Analysis Tab
- Depth-based web crawling (0-3 levels)
- CDN detection (Cloudflare, AWS CloudFront, Akamai, Fastly, Azure CDN, etc.)
- Third-party service tracking (Google Analytics, Facebook, YouTube, etc.)
- SPA (Single Page Application) link detection and navigation
- DNS resolution with IPv4/IPv6 support
- Real-time crawling progress tracking
- Logout button prevention during automated exploration

### 3. Workflow Tab
- Multi-step workflow automation
- Step types: Navigate, Login, Crawl, Wait, Auto-Explore
- Visual workflow builder with drag-and-drop interface
- Workflow save/load functionality
- Progress tracking during execution

## Architecture

### Technology Stack
- **Frontend**: Electron (HTML/CSS/JavaScript)
- **Browser Automation**: Playwright
- **IPC**: Electron IPC for main-renderer communication
- **Storage**: JSON files for session/workflow persistence

### File Structure
```
scrapSNI/
├── src/
│   ├── main.js              # Electron main process
│   ├── preload.js           # IPC bridge
│   ├── renderer.js          # UI logic (all tabs)
│   ├── index.html           # Main UI
│   └── playwrightController.js  # Browser automation
├── build-windows.bat        # Windows build script
├── build-unix.sh            # Unix/macOS/Linux build script
├── BUILD.md                 # Build documentation
└── package.json             # Dependencies and build config
```

### Key Components

#### playwrightController.js
- `startBrowserSession()`: Start Playwright browser
- `analyzePage()`: Auto analysis with crawling
- `executeWorkflow()`: Workflow execution engine
- DNS resolution with IPv4/IPv6 support
- CDN and third-party service detection

#### renderer.js
Event listeners organized in `initializeEventListeners()`:
- Manual tracking tab handlers
- Auto analysis tab handlers
- Workflow tab handlers (lines 108-122)

## Important Implementation Details

### Event Listener Registration
ALL event listeners must be registered inside `initializeEventListeners()` which is called on `DOMContentLoaded`. This ensures proper initialization order.

**Correct pattern:**
```javascript
function initializeEventListeners() {
  // Manual tracking tab
  startBtn.addEventListener('click', startTracking);

  // Auto analysis tab
  analyzeBtn.addEventListener('click', analyzeUrl);

  // Workflow tab
  addStepBtn.addEventListener('click', openStepModal);
  // ... more workflow listeners
}

document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  checkTrackingStatus();
  checkSavedSession();
});
```

### Workflow Step Types
1. **Navigate** - Go to URL
2. **Login** - Wait for user login
3. **Crawl** - Analyze page with depth-based crawling
4. **Wait** - Wait for specified duration
5. **Auto-Explore** - Automated interaction (clicks, hovers, scrolling)

### Build System
- **Windows**: Uses electron-packager (electron-builder has permission issues)
- **macOS/Linux**: Uses electron-builder with platform-specific configs
- Output: `dist/` directory

### Session Persistence
- Session file: `~/.domain-tracker-session.json`
- Contains browser context (cookies, localStorage, etc.)
- Enables SSO/SAML authentication workflows

## Coding Conventions

### JavaScript
- Use async/await for asynchronous operations
- Event handlers organized by tab
- IPC calls through `window.electronAPI`

### UI Updates
- Use `innerHTML` for bulk DOM updates
- Filter functions for search boxes
- Progress bars for long-running operations

### Error Handling
- Try-catch blocks for all async operations
- User-friendly error messages via `alert()`
- Console logging for debugging

## Common Tasks

### Adding New Workflow Step Type
1. Add option to step type `<select>` in index.html
2. Add case in `updateStepConfigFields()` for config UI
3. Add case in `createStepHTML()` for display
4. Add case in `executeWorkflowStep()` in playwrightController.js

### Adding New Export Format
1. Create export function (e.g., `exportWorkflowJSON()`)
2. Add button to UI
3. Register event listener in `initializeEventListeners()`
4. Implement IPC handler in main.js if needed

## Build and Deployment

### Windows
```bash
build-windows.bat
# or
npx electron-packager . "Domain Tracker" --platform=win32 --arch=x64 --out=dist --overwrite
```

### macOS/Linux
```bash
chmod +x build-unix.sh
./build-unix.sh
```

### Output
- Windows: `dist/Domain Tracker-win32-x64/`
- macOS: `dist/Domain Tracker-darwin-x64/` (or arm64)
- Linux: `dist/Domain Tracker-linux-x64/`

## Known Issues

### electron-builder on Windows
- Symbolic link permission errors
- Workaround: Use electron-packager instead
- Cannot generate NSIS installers without admin privileges

### Browser Cache Errors
- GPU cache warnings are expected and can be ignored
- Related to Electron's rendering engine

## Future Enhancements

### Planned Features
1. ~~Workflow automation system~~ ✅ Completed
2. Advanced filtering options
3. Custom export templates
4. Regex-based domain filtering
5. Network performance metrics
6. Certificate information collection

### Performance Improvements
- Parallel DNS resolution
- Incremental UI updates for large domain lists
- Background worker for analysis

## Team Notes

### Claude Code Integration
- Project uses `.claude/settings.local.json` for permission management
- Permissions include build commands, git operations, npm scripts
- Auto-approved commands are tracked for team consistency

### Git Workflow
- Main branch: `master`
- Commit messages follow conventional format
- Build artifacts excluded via `.gitignore`

## Resources

### Dependencies
- electron: ^28.0.0
- playwright: ^1.40.0
- electron-builder: ^24.13.3
- electron-packager: ^17.1.2

### External Services
None - fully offline capable after initial build

## Contact & Support

For questions or issues, refer to:
- BUILD.md for build instructions
- Source code comments for implementation details
- Git history for change context
