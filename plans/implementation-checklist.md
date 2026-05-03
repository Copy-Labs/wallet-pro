# Implementation Checklist - Code Mode

## Overview

This checklist provides a step-by-step guide for implementing all 4 website variants for Smart Wallet Pro. Follow each section in order to ensure a systematic and complete implementation.

---

## Phase 1: Foundation Setup

### 1.1 Create Directory Structure
- [ ] Create `website-shared/` directory
- [ ] Create `website-immersive/` directory
- [ ] Create `website-narrative/` directory
- [ ] Create `website-showcase/` directory
- [ ] Create `website-minimalist/` directory

### 1.2 Initialize Next.js Projects
For each variant directory:

```bash
# Run in each variant directory
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

- [ ] Initialize `website-immersive/` with Next.js
- [ ] Initialize `website-narrative/` with Next.js
- [ ] Initialize `website-showcase/` with Next.js
- [ ] Initialize `website-minimalist/` with Next.js

### 1.3 Configure Shared Assets
- [ ] Create `website-shared/assets/` directory structure
- [ ] Create `website-shared/content/` directory structure
- [ ] Create `website-shared/data/` directory structure
- [ ] Copy existing wallet icons from `assets/` to `website-shared/assets/icons/`
- [ ] Create logo SVG files in `website-shared/assets/logos/`

### 1.4 Create Shared Data Files
- [ ] Create `website-shared/data/features.json` with all wallet features
- [ ] Create `website-shared/data/networks.json` with supported networks
- [ ] Create `website-shared/data/statistics.json` with key metrics
- [ ] Create `website-shared/content/copy/hero.json` with hero copy
- [ ] Create `website-shared/content/testimonials/` with user testimonials

---

## Phase 2: Shared Components Implementation

### 2.1 Create Shared Utility Functions
- [ ] Create `website-shared/lib/utils.ts` with `cn()` function
- [ ] Add `formatCurrency()` utility
- [ ] Add `formatNumber()` utility
- [ ] Add `formatAddress()` utility

### 2.2 Create Shared Brand Components
- [ ] Create `website-shared/components/brand/Logo.tsx`
  - Implement `full`, `icon`, and `wordmark` variants
  - Add size variants (`sm`, `md`, `lg`, `xl`)
  - Add color variants (`light`, `dark`, `colored`)
- [ ] Create `website-shared/components/brand/CTAButton.tsx`
  - Implement `primary`, `secondary`, and `outline` variants
  - Add size variants
  - Add hover and active states

### 2.3 Create Shared Data Components
- [ ] Create `website-shared/components/data/FeatureCard.tsx`
  - Implement `default`, `compact`, and `expanded` variants
  - Add icon support
  - Add category badges
- [ ] Create `website-shared/components/data/NetworkBadge.tsx`
  - Add network icon support
  - Add chain ID display option
  - Add size variants
- [ ] Create `website-shared/components/data/StatCard.tsx`
  - Add value and label display
  - Add trend indicators
  - Add icon support

### 2.4 Create Shared Layout Components
- [ ] Create `website-shared/components/layout/Section.tsx`
  - Add background variants
  - Add padding variants
  - Add ID support for navigation
- [ ] Create `website-shared/components/layout/Container.tsx`
  - Add size variants
  - Add responsive behavior

---

## Phase 3: Variant 1 - Immersive Implementation

### 3.1 Install Dependencies
```bash
cd website-immersive
pnpm add @react-three/fiber @react-three/drei three gsap framer-motion recharts
```

- [ ] Install Three.js dependencies
- [ ] Install GSAP for animations
- [ ] Install Framer Motion
- [ ] Install Recharts for data visualization

### 3.2 Configure Tailwind Theme
- [ ] Update `tailwind.config.js` with immersive color palette
- [ ] Add custom animations (`float`, `pulse-slow`)
- [ ] Configure gradient colors
- [ ] Add custom spacing

### 3.3 Create 3D Components
- [ ] Create `components/3d/Wallet3D.tsx`
  - Set up React Three Fiber canvas
  - Implement wallet 3D model placeholder
  - Add rotation controls
  - Add particle emissions
- [ ] Create `components/3d/ParticleField.tsx`
  - Implement particle system
  - Add flow animation
  - Add mouse interaction
- [ ] Create `components/3d/Globe3D.tsx`
  - Create 3D globe
  - Add network markers
  - Implement click handlers

### 3.4 Create Animation Components
- [ ] Create `components/animations/ScrollReveal.tsx`
  - Implement GSAP ScrollTrigger
  - Add direction variants
  - Add delay support
- [ ] Create `components/animations/ParallaxSection.tsx`
  - Implement parallax scrolling
  - Add speed control

### 3.5 Create Demo Components
- [ ] Create `components/demo/WalletSimulator.tsx`
  - Build mock wallet interface
  - Implement account creation
  - Implement transaction sending
  - Add gas sponsorship indicator
- [ ] Create `components/demo/TransactionFlow.tsx`
  - Create transaction flow animation
  - Add step indicators
- [ ] Create `components/demo/NetworkSwitcher.tsx`
  - Build network selector
  - Add network icons

### 3.6 Create Page Sections
- [ ] Create `app/(sections)/hero/page.tsx`
  - Add 3D wallet hero
  - Add particle background
  - Add CTA button
- [ ] Create `app/(sections)/demo/page.tsx`
  - Add wallet simulator
  - Add interactive elements
- [ ] Create `app/(sections)/features/page.tsx`
  - Add feature cards with animations
  - Add scroll reveals
- [ ] Create `app/(sections)/gas-visualizer/page.tsx`
  - Add savings chart
  - Add comparison graph
- [ ] Create `app/(sections)/network-explorer/page.tsx`
  - Add 3D globe
  - Add network markers
- [ ] Create `app/(sections)/dapp-demo/page.tsx`
  - Add DApp connection demo
  - Add animation

### 3.7 Create Main Page
- [ ] Update `app/page.tsx` to include all sections
- [ ] Add smooth scrolling
- [ ] Add navigation

---

## Phase 4: Variant 2 - Narrative Implementation

### 4.1 Install Dependencies
```bash
cd website-narrative
pnpm add @mdx-js/loader @mdx-js/react framer-motion
```

- [ ] Install MDX dependencies
- [ ] Install Framer Motion
- [ ] Configure MDX in Next.js

### 4.2 Configure Tailwind Theme
- [ ] Update `tailwind.config.js` with narrative color palette
- [ ] Add custom fonts (Playfair Display, Inter, JetBrains Mono)
- [ ] Configure typography plugin
- [ ] Add custom spacing

### 4.3 Create Narrative Components
- [ ] Create `components/narrative/Chapter.tsx`
  - Add chapter number display
  - Add progress indicator
  - Add smooth scroll to next
- [ ] Create `components/narrative/StoryBlock.tsx`
  - Add user avatar
  - Add story quote
  - Add before/after comparison
- [ ] Create `components/narrative/Timeline.tsx`
  - Create vertical timeline
  - Add milestone markers
  - Add scroll animations
- [ ] Create `components/narrative/Quote.tsx`
  - Add large quote marks
  - Add author attribution

### 4.4 Create Typography Components
- [ ] Create `components/typography/HeroText.tsx`
  - Implement large typography
  - Add responsive sizing
- [ ] Create `components/typography/PullQuote.tsx`
  - Add italic styling
  - Add center alignment
- [ ] Create `components/typography/Caption.tsx`
  - Add caption styling

### 4.5 Create Visual Components
- [ ] Create `components/visual/Illustration.tsx`
  - Add illustration support
  - Add responsive sizing
- [ ] Create `components/visual/PhotoGrid.tsx`
  - Create photo grid layout
  - Add hover effects
- [ ] Create `components/visual/StatCard.tsx`
  - Add stat display
  - Add trend indicators

### 4.6 Create MDX Content
- [ ] Create `content/chapters/01-problem.mdx`
  - Write problem narrative
  - Add quotes and stats
- [ ] Create `content/chapters/02-journey.mdx`
  - Write user journey narrative
  - Add timeline
- [ ] Create `content/chapters/03-solution.mdx`
  - Write solution narrative
  - Add feature highlights
- [ ] Create `content/chapters/04-stories.mdx`
  - Write user stories
  - Add testimonials
- [ ] Create `content/chapters/05-impact.mdx`
  - Write impact narrative
  - Add statistics
- [ ] Create `content/chapters/06-future.mdx`
  - Write future vision
  - Add roadmap

### 4.7 Create Page Sections
- [ ] Create `app/(chapters)/problem/page.tsx`
  - Render MDX content
  - Add chapter navigation
- [ ] Create `app/(chapters)/journey/page.tsx`
  - Render MDX content
  - Add timeline
- [ ] Create `app/(chapters)/solution/page.tsx`
  - Render MDX content
  - Add feature highlights
- [ ] Create `app/(chapters)/stories/page.tsx`
  - Render MDX content
  - Add story blocks
- [ ] Create `app/(chapters)/impact/page.tsx`
  - Render MDX content
  - Add stat cards
- [ ] Create `app/(chapters)/future/page.tsx`
  - Render MDX content
  - Add roadmap

### 4.8 Create Main Page
- [ ] Update `app/page.tsx` to include all chapters
- [ ] Add chapter navigation
- [ ] Add smooth scrolling

---

## Phase 5: Variant 3 - Showcase Implementation

### 5.1 Install Dependencies
```bash
cd website-showcase
pnpm add @tanstack/react-query recharts prismjs framer-motion viem @radix-ui/react-tabs @radix-ui/react-accordion
```

- [ ] Install TanStack Query
- [ ] Install Recharts
- [ ] Install Prism.js
- [ ] Install Radix UI components
- [ ] Install Viem for blockchain data

### 5.2 Configure Tailwind Theme
- [ ] Update `tailwind.config.js` with showcase color palette
- [ ] Add custom colors
- [ ] Add custom spacing

### 5.3 Create Demo Components
- [ ] Create `components/demo/WalletDemo.tsx`
  - Set up iframe sandbox
  - Create demo HTML
  - Add reset functionality
- [ ] Create `components/demo/DemoSandbox.tsx`
  - Create sandbox wrapper
  - Add security measures
- [ ] Create `components/demo/FeatureTour.tsx`
  - Create tour steps
  - Add highlight functionality
  - Add progress indicator

### 5.4 Create Features Components
- [ ] Create `components/features/FeatureCard.tsx`
  - Add expandable details
  - Add hover effects
- [ ] Create `components/features/FeatureGrid.tsx`
  - Create grid layout
  - Add responsive behavior
- [ ] Create `components/features/FeatureDetail.tsx`
  - Add detailed view
  - Add specifications

### 5.5 Create Comparison Components
- [ ] Create `components/comparison/ComparisonTable.tsx`
  - Create table structure
  - Add sorting functionality
  - Add filtering
- [ ] Create `components/comparison/CompetitorRow.tsx`
  - Add row styling
  - Add feature checks
- [ ] Create `components/comparison/FeatureCheck.tsx`
  - Add check/cross icons
  - Add styling

### 5.6 Create Stats Components
- [ ] Create `components/stats/LiveGasPrice.tsx`
  - Set up WebSocket connection
  - Add network selector
  - Add price display
- [ ] Create `components/stats/NetworkStatus.tsx`
  - Fetch network status
  - Add health indicators
- [ ] Create `components/stats/TransactionCounter.tsx`
  - Count transactions
  - Add animation
- [ ] Create `components/stats/SavingsChart.tsx`
  - Create line chart
  - Add comparison data
  - Add tooltips

### 5.7 Create Developer Components
- [ ] Create `components/developer/CodeBlock.tsx`
  - Add syntax highlighting
  - Add copy button
- [ ] Create `components/developer/APIPreview.tsx`
  - Show API endpoints
  - Add examples
- [ ] Create `components/developer/EndpointCard.tsx`
  - Display endpoint details
  - Add method badges

### 5.8 Create API Routes
- [ ] Create `app/api/stats/route.ts`
  - Fetch gas prices
  - Fetch network status
  - Fetch transaction count
- [ ] Create `app/api/networks/route.ts`
  - Return network data
- [ ] Create `app/api/features/route.ts`
  - Return feature data

### 5.9 Create Demo Sandbox
- [ ] Create `demo/index.html`
  - Build demo interface
  - Add wallet simulation
- [ ] Create `demo/wallet-demo.js`
  - Implement wallet logic
  - Add mock data
- [ ] Create `demo/styles.css`
  - Style demo interface

### 5.10 Create Page Sections
- [ ] Create `app/(sections)/hero/page.tsx`
  - Add product screenshot
  - Add feature badges
- [ ] Create `app/(sections)/demo/page.tsx`
  - Add live demo
  - Add feature tour
- [ ] Create `app/(sections)/features/page.tsx`
  - Add feature grid
  - Add detailed cards
- [ ] Create `app/(sections)/comparison/page.tsx`
  - Add comparison table
  - Add filters
- [ ] Create `app/(sections)/stats/page.tsx`
  - Add live stats
  - Add charts
- [ ] Create `app/(sections)/developer/page.tsx`
  - Add API preview
  - Add code examples
- [ ] Create `app/(sections)/pricing/page.tsx`
  - Add pricing tiers
  - Add feature comparison

### 5.11 Create Main Page
- [ ] Update `app/page.tsx` to include all sections
- [ ] Add navigation
- [ ] Add smooth scrolling

---

## Phase 6: Variant 4 - Minimalist Implementation

### 6.1 Install Dependencies
```bash
cd website-minimalist
pnpm add clsx tailwind-merge lucide-react
```

- [ ] Install minimal dependencies
- [ ] Keep bundle size small

### 6.2 Configure Tailwind Theme
- [ ] Update `tailwind.config.js` with monochromatic palette
- [ ] Add custom spacing
- [ ] Configure minimal colors

### 6.3 Create Layout Components
- [ ] Create `components/Hero.tsx`
  - Add single headline
  - Add subheadline
  - Add CTA button
  - Maximize whitespace
- [ ] Create `components/ValueProp.tsx`
  - Add bullet points
  - Add icons
  - Keep minimal
- [ ] Create `components/HowItWorks.tsx`
  - Add numbered steps
  - Add minimal icons
- [ ] Create `components/Features.tsx`
  - Add feature list
  - Keep concise
- [ ] Create `components/CTA.tsx`
  - Add single CTA
  - Keep simple
- [ ] Create `components/Footer.tsx`
  - Add minimal links
  - Add social icons

### 6.4 Create Main Page
- [ ] Update `app/page.tsx` to include all components
- [ ] Ensure smooth scrolling
- [ ] Optimize for performance

### 6.5 Optimize Performance
- [ ] Minimize JavaScript bundle
- [ ] Use CSS-only animations
- [ ] Optimize images
- [ ] Implement code splitting
- [ ] Add lazy loading

---

## Phase 7: Content Integration

### 7.1 Write Copy for Each Variant
- [ ] Write immersive variant copy
  - Hero headline
  - Feature descriptions
  - CTA text
- [ ] Write narrative variant copy
  - Chapter content
  - User stories
  - Quotes
- [ ] Write showcase variant copy
  - Feature descriptions
  - Comparison text
  - API documentation
- [ ] Write minimalist variant copy
  - Headline
  - Value props
  - CTA text

### 7.2 Add Images and Assets
- [ ] Create hero images for each variant
- [ ] Add feature illustrations
- [ ] Add user avatars for testimonials
- [ ] Optimize all images (WebP format)
- [ ] Add alt text for accessibility

### 7.3 Create Demo Content
- [ ] Create mock wallet data
- [ ] Create mock transaction data
- [ ] Create mock network data
- [ ] Create mock user stories

---

## Phase 8: Testing & Optimization

### 8.1 Cross-Browser Testing
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge
- [ ] Test on mobile browsers

### 8.2 Performance Testing
- [ ] Run Lighthouse audit for each variant
- [ ] Optimize Core Web Vitals
- [ ] Reduce bundle sizes
- [ ] Optimize images
- [ ] Implement lazy loading

### 8.3 Accessibility Testing
- [ ] Test with screen reader
- [ ] Test keyboard navigation
- [ ] Check color contrast ratios
- [ ] Add ARIA labels
- [ ] Test focus indicators

### 8.4 Responsive Testing
- [ ] Test on mobile (320px - 768px)
- [ ] Test on tablet (768px - 1024px)
- [ ] Test on desktop (1024px+)
- [ ] Test landscape orientations
- [ ] Test high DPI displays

---

## Phase 9: Deployment

### 9.1 Configure Build Processes
- [ ] Configure Next.js build for each variant
- [ ] Set up environment variables
- [ ] Configure image optimization
- [ ] Set up analytics

### 9.2 Set Up Hosting
- [ ] Create Vercel accounts for each variant
- [ ] Connect GitHub repositories
- [ ] Configure build settings
- [ ] Set up custom domains

### 9.3 Configure Domains
- [ ] Configure `smartwalletpro.com` for minimalist variant
- [ ] Configure `immersive.smartwalletpro.com` for immersive variant
- [ ] Configure `story.smartwalletpro.com` for narrative variant
- [ ] Configure `demo.smartwalletpro.com` for showcase variant

### 9.4 Set Up Analytics
- [ ] Add Google Analytics to each variant
- [ ] Configure event tracking
- [ ] Set up conversion tracking
- [ ] Configure custom dashboards

---

## Phase 10: Final Polish

### 10.1 Review All Variants
- [ ] Review immersive variant
  - Check 3D animations
  - Check particle effects
  - Check demo functionality
- [ ] Review narrative variant
  - Check story flow
  - Check typography
  - Check MDX rendering
- [ ] Review showcase variant
  - Check live demos
  - Check data fetching
  - Check comparison tables
- [ ] Review minimalist variant
  - Check performance
  - Check simplicity
  - Check accessibility

### 10.2 Documentation
- [ ] Create README for each variant
- [ ] Document setup instructions
- [ ] Document deployment process
- [ ] Add contribution guidelines

### 10.3 Launch Preparation
- [ ] Test all CTAs
- [ ] Test all links
- [ ] Test all forms
- [ ] Prepare launch announcement
- [ ] Set up monitoring

---

## Success Criteria

Each variant must meet the following criteria:

### Immersive
- [ ] 3D wallet model loads and rotates
- [ ] Particle system animates smoothly
- [ ] Scroll animations trigger correctly
- [ ] Demo simulator works
- [ ] Lighthouse score > 90

### Narrative
- [ ] All chapters render correctly
- [ ] MDX content displays properly
- [ ] Timeline animations work
- [ ] Story blocks display correctly
- [ ] Lighthouse score > 90

### Showcase
- [ ] Live demo works in sandbox
- [ ] Real-time data updates
- [ ] Comparison table sorts and filters
- [ ] API routes respond correctly
- [ ] Lighthouse score > 90

### Minimalist
- [ ] Page loads in < 1 second
- [ ] Bundle size < 100KB
- [ ] All elements accessible
- [ ] Responsive on all devices
- [ ] Lighthouse score > 95

---

## Notes

- Work through each phase systematically
- Test after completing each phase
- Commit changes frequently
- Document any deviations from the plan
- Ask for clarification if needed

---

## Estimated Implementation Order

1. **Phase 1-2**: Foundation & Shared Components (Start here)
2. **Phase 6**: Minimalist (Easiest, quick win)
3. **Phase 4**: Narrative (Medium complexity)
4. **Phase 5**: Showcase (More complex)
5. **Phase 3**: Immersive (Most complex)
6. **Phase 7-10**: Content, Testing, Deployment

This order allows you to:
- Build shared components first
- Get a quick win with minimalist
- Build confidence with narrative
- Tackle more complex variants
- Finish with the most challenging one
