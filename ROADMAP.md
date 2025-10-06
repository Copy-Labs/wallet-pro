# ROADMAP.md

This file provides detailed project requirements and weekly deliverables for AI agents working on Smart Wallet Pro development.

## Project Vision

Smart Wallet Pro is a modern Web3 wallet browser extension designed to serve the unreached 6 billion web3 users. The MVP focuses on gas-sponsored transactions under $1, seamless DApp integration, and user-friendly onboarding.

## Technology Stack Requirements

### Core Framework
- **Plasmo 0.90.5**: Browser extension framework (already configured)
- **React 18.2.0 + TypeScript 5.3.3**: UI development
- **RadixUI + shadcn/ui**: Component library for consistent design
- **Viem**: Ethereum interaction library
- **Alchemy SDK**: Smart wallet and gas sponsorship integration

### Design System
- **Auto theming**: Light/dark mode support
- **Radix grass accent**: Primary color scheme
- **Minimalistic UI**: Clean, user-friendly interface
- **Responsive design**: Works across different screen sizes

### Architecture Patterns
- **Extension structure**: popup, background, content, injected scripts
- **State management**: Local storage for persistence
- **Provider injection**: window.ethereum compatibility
- **Middleware pattern**: Gas sponsorship checks and fallbacks

---

# ✅ Smart Wallet MVP Detailed Task Breakdown

## **Week 1 — Foundation Setup**

### Primary Deliverables
- [ ] **Scaffold project with Plasmo** (✅ Already complete)
- [ ] **Set up RadixUI + shadcn components**
  - Install @radix-ui/react-* packages
  - Configure shadcn/ui with Plasmo
  - Set up component exports and theming
- [ ] **Implement auto theming (light/dark, Radix grass accent)**
  - Create theme provider component
  - Configure CSS variables for light/dark modes
  - Implement grass accent color scheme
- [ ] **Define folder structure**
  - Create `/src` directory with subfolders: `/popup`, `/background`, `/content`, `/injected`
  - Set up shared `/components`, `/lib`, `/types` directories
  - Configure path aliases in tsconfig.json
- [ ] **Configure Viem + Alchemy SDK connection**
  - Install viem and @alchemy/aa-alchemy packages
  - Create connection utilities and types
  - Set up environment configuration for API keys
- [ ] **Build base UI shell with tabs: Accounts / Networks / Settings**
  - Create main popup layout component
  - Implement tab navigation system
  - Design placeholder screens for each tab

### Technical Requirements
- Use `~*` path aliases for internal imports
- Follow established Prettier import order
- Ensure TypeScript strict mode compliance
- Components should be modular and reusable

---

## **Week 2 — Core Wallet Features**

### Primary Deliverables
- [ ] **Implement account creation via Alchemy Smart Wallet**
  - Create account generation flow using Alchemy AA SDK
  - Implement secure private key generation and storage
  - Build user onboarding UI with clear instructions
- [ ] **Store and manage multiple accounts (local storage)**
  - Design account data structure and encryption
  - Implement CRUD operations for account management
  - Create account selection and switching interface
- [ ] **Display balances (ETH + tokens) per account**
  - Integrate Alchemy API for balance fetching
  - Create balance display components with loading states
  - Implement periodic balance updates
- [ ] **Build network switcher (all Alchemy-supported chains)**
  - Define network configuration constants
  - Create network selection dropdown/modal
  - Handle network switching logic and state updates
- [ ] **Persist selected network across sessions**
  - Implement network state persistence
  - Handle network-specific account states
  - Ensure consistent network display across components

### Technical Requirements
- Secure storage of sensitive data using extension storage APIs
- Error handling for network requests and account operations
- Loading states for all async operations
- Proper TypeScript interfaces for all data structures

---

## **Week 3 — Transactions**

### Primary Deliverables
- [ ] **Implement send ETH/token flow**
  - Create transaction composition UI
  - Implement recipient validation and amount input
  - Build transaction preview and confirmation screens
- [ ] **Implement receive screen (QR + address copy)**
  - Generate QR codes for addresses using qr-code library
  - Create copy-to-clipboard functionality with user feedback
  - Design clean receive interface with share options
- [ ] **Build middleware check for gas sponsorship (<$1)**
  - Calculate transaction costs using current gas prices
  - Implement sponsorship eligibility logic
  - Create clear UI indicators for sponsored vs. regular transactions
- [ ] **Integrate fallback for normal gas payment**
  - Handle cases where sponsorship is unavailable
  - Allow user choice between sponsored and self-paid transactions
  - Implement gas estimation and fee display
- [ ] **Display transaction history (fetched from Alchemy API)**
  - Create transaction list component with pagination
  - Implement transaction status tracking and updates
  - Design transaction detail views with relevant information

### Technical Requirements
- Robust error handling for transaction failures
- Real-time transaction status updates
- Proper gas estimation and fee calculations
- Transaction data caching for better UX

---

## **Week 4 — DApp Connect**

### Primary Deliverables
- [ ] **Inject window.ethereum provider for DApps**
  - Create EIP-1193 compliant provider implementation
  - Inject provider script into web pages via content script
  - Handle provider method calls and event emissions
- [ ] **Handle connect account request (popup prompt)**
  - Create connection approval UI
  - Implement account selection for connection
  - Store and manage connected sites permissions
- [ ] **Handle transaction request from DApp**
  - Parse and validate incoming transaction requests
  - Create transaction approval UI with full details
  - Implement request queuing for multiple simultaneous requests
- [ ] **Show confirmation popup: details + sponsorship info**
  - Display comprehensive transaction information
  - Show gas sponsorship status and savings
  - Provide clear approve/reject actions with reasoning
- [ ] **Test against common DApps (Uniswap, OpenSea, Aave)**
  - Comprehensive testing on major DeFi platforms
  - Document compatibility issues and edge cases
  - Ensure proper event handling and state management

### Technical Requirements
- Secure isolation between content script and page context
- Proper event handling and cleanup
- Request/response message passing between contexts
- Comprehensive error handling and user feedback

---

## **Week 5 — Settings + Polish**

### Primary Deliverables
- [ ] **Add settings screen:**
  - **Manage accounts**: Rename accounts, remove accounts with confirmations
  - **Gas sponsorship settings**: Toggle sponsorship, set thresholds, configure preferences
- [ ] **Polish UI with consistent minimalistic style**
  - Implement consistent spacing, typography, and color usage
  - Add smooth transitions and micro-interactions
  - Ensure responsive design across different popup sizes
- [ ] **Implement error states + user-friendly messages**
  - Create comprehensive error handling with helpful messages
  - Implement retry mechanisms for failed operations
  - Add contextual help and tooltips where needed
- [ ] **Add basic notifications (success/fail tx)**
  - Implement toast notification system
  - Show transaction status updates with appropriate styling
  - Handle notification persistence and dismissal
- [ ] **Implement transaction logging (foundation for risk engine)**
  - Create transaction logging infrastructure
  - Store transaction patterns and user behavior data
  - Prepare data structure for future AI risk analysis

### Technical Requirements
- Consistent design system implementation
- Accessible UI components (ARIA labels, keyboard navigation)
- Performance optimization for smooth interactions
- Proper data validation and sanitization

---

## **Week 6 — Testing + Distribution**

### Primary Deliverables
- [ ] **Internal QA: balances, tx flows, DApp connections**
  - Comprehensive testing of all user flows
  - Cross-browser compatibility testing
  - Performance testing and optimization
- [ ] **Security pass: verify provider injection is isolated**
  - Security audit of content script isolation
  - Validate secure storage implementation
  - Test for potential XSS and injection vulnerabilities
- [ ] **Build production extension bundle**
  - Optimize build process for production
  - Ensure proper asset bundling and compression
  - Validate manifest.json configuration
- [ ] **Prepare assets (logo, screenshots, description)**
  - Create high-quality extension icons and logos
  - Capture demonstration screenshots
  - Write compelling store description and feature list
- [ ] **Submit to Chrome Web Store (under Smart Wallet brand)**
  - Complete store submission process
  - Handle review feedback and iterations
  - Set up analytics and monitoring
- [ ] **Prep for early testers**
  - Create testing guidelines and feedback collection
  - Set up user onboarding documentation
  - Prepare support channels and FAQ

### Technical Requirements
- Production-ready error handling and logging
- Performance monitoring and analytics integration
- Proper versioning and update mechanisms
- Comprehensive testing coverage

---

# 🔮 Post-MVP (Future Roadmap)

### Phase 2 Features
- [ ] **Mobile wallet (Expo + RN, shared Wallet Core)**
  - Cross-platform wallet core library
  - React Native mobile implementation
  - Unified account and transaction management
- [ ] **AI Risk Engine integration**
  - Transaction pattern analysis
  - Fraud detection and prevention
  - Smart transaction recommendations
- [ ] **Premium tier for higher gas sponsorship**
  - Tiered sponsorship limits
  - Subscription management
  - Enhanced features for premium users
- [ ] **NFT + cross-chain support**
  - NFT display and management
  - Cross-chain bridge integration
  - Multi-chain transaction support

---

## Development Guidelines for AI Agents

### Code Quality Standards
- Follow existing Prettier configuration with import ordering
- Use TypeScript strict mode with proper type definitions
- Implement comprehensive error handling with user-friendly messages
- Write modular, reusable components following React best practices

### Testing Requirements
- Test all user flows end-to-end
- Validate security measures and data encryption
- Ensure cross-browser compatibility
- Performance test with large transaction histories

### Documentation Standards
- Update WARP.md with new architectural decisions
- Document API integrations and data structures
- Maintain inline code comments for complex logic
- Keep README.md updated with setup instructions

### Security Considerations
- Never log or expose private keys or sensitive data
- Validate all user inputs and external API responses
- Implement proper CSP and security headers
- Use secure storage APIs for sensitive information

### Performance Requirements
- Optimize bundle size for fast extension loading
- Implement efficient caching strategies
- Use lazy loading for non-critical components
- Monitor and optimize memory usage

---

## Key Integration Points

### Alchemy SDK Integration
- Smart Account creation and management
- Gas sponsorship eligibility and execution
- Transaction history and status tracking
- Multi-chain support and network switching

### RadixUI + shadcn Integration
- Consistent component library usage
- Theme system integration
- Accessibility compliance
- Responsive design patterns

### Browser Extension APIs
- Storage API for persistent data
- Identity API for permissions
- Tabs API for DApp communication
- Runtime messaging for component communication