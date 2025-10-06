# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Smart Wallet Pro is a modern Web3 wallet browser extension built with the Plasmo framework. It's designed to serve the unreached 6 billion web3 users and is currently in early development (v0.0.1).

## Common Development Commands

### Development
```bash
pnpm dev
# Starts the development server, builds development version
# Load build/chrome-mv3-dev in Chrome for testing
```

### Building
```bash
pnpm build
# Creates production build in build/ directory
# Outputs browser-specific builds (e.g., chrome-mv3-prod)
```

### Packaging
```bash
pnpm package
# Creates a zipped extension ready for store submission
# Requires successful build first
```

### Code Formatting
```bash
npx prettier --write .
# Formats code according to .prettierrc.mjs configuration
# Uses custom import sorting for Plasmo projects
```

## Architecture & Structure

### Plasmo Framework
- **Framework**: Uses Plasmo 0.90.5 for browser extension development
- **Build System**: Plasmo handles the build process, creating manifest v3 extensions
- **Hot Reload**: Development server provides automatic reload during development
- **Multi-browser**: Supports Chrome, Firefox, Safari, and other browsers

### Extension Structure
- **popup.tsx**: Main popup interface component (React-based)
- **No content scripts yet**: Extension is currently popup-focused
- **No options page**: Not implemented yet
- **No background scripts**: None defined currently

### Technology Stack
- **React 18.2.0**: UI framework with hooks (useState already in use)
- **TypeScript 5.3.3**: Full TypeScript support with Plasmo base config
- **PNPM**: Package manager (10.15.0)
- **Prettier**: Code formatting with import order plugin

### Import Order Convention
The project uses a specific import order enforced by Prettier:
1. Node.js built-in modules
2. Third-party modules  
3. @plasmo/* imports
4. @plasmohq/* imports  
5. ~* (local path alias imports)
6. Relative imports (./,../)

### Build Output
- **Development**: `build/chrome-mv3-dev` (and other browser variants)
- **Production**: `build/chrome-mv3-prod` (and other browser variants) 
- **Packaged**: Zip files ready for store submission

### Extension Permissions
- Configured for broad web permissions: `https://*/*`
- Uses Manifest V3 format

## Development Workflow

### Adding New Pages
- **Options page**: Add `options.tsx` with default exported React component
- **Content script**: Add `content.ts` with module imports and logic
- **Background script**: Add `background.ts` for background processes

### File Structure Conventions
- Root-level `.tsx` files become extension pages automatically
- Use `~*` path alias for internal imports (configured in tsconfig.json)
- Assets go in `/assets` directory

### Deployment
- GitHub Actions workflow configured for automated store submission
- Uses PlasmoHQ/bpp@v3 for Browser Platform Publish
- Requires SUBMIT_KEYS secret configuration
- Workflow: build → package → submit to web stores

## Key Configuration Files
- **tsconfig.json**: Extends Plasmo's base TypeScript configuration
- **.prettierrc.mjs**: Custom formatting rules with import ordering
- **package.json**: Plasmo-specific manifest configuration embedded