# Component Architecture - Shared & Variant-Specific

## Overview

This document outlines the component architecture for all 4 website variants, focusing on shared components that can be reused across variants while maintaining each variant's unique identity.

---

## Component Hierarchy

```
Smart Wallet Pro Websites
├── Shared Components (website-shared)
│   ├── Brand Components
│   ├── Data Components
│   └── Utility Components
│
├── Variant 1: Immersive
│   ├── 3D Components
│   ├── Animation Components
│   └── Demo Components
│
├── Variant 2: Narrative
│   ├── Story Components
│   ├── Typography Components
│   └── Visual Components
│
├── Variant 3: Showcase
│   ├── Demo Components
│   ├── Stats Components
│   └── Comparison Components
│
└── Variant 4: Minimalist
    ├── Layout Components
    └── Content Components
```

---

## Shared Components (`website-shared`)

### Brand Components

#### `Logo`
```typescript
// website-shared/components/brand/Logo.tsx

interface LogoProps {
  variant?: 'full' | 'icon' | 'wordmark'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'light' | 'dark' | 'colored'
  className?: string
}

// Usage:
// <Logo variant="full" size="lg" color="colored" />
```

**Variants:**
- **Immersive**: Animated logo with particle effects
- **Narrative**: Clean, serif typography
- **Showcase**: Full color with hover effects
- **Minimalist**: Monochrome, minimal

#### `CTAButton`
```typescript
// website-shared/components/brand/CTAButton.tsx

interface CTAButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  onClick?: () => void
  className?: string
}

// Usage:
// <CTAButton variant="primary" size="lg" href="/download">
//   Download Extension
// </CTAButton>
```

**Variant Styling:**
- **Immersive**: Gradient background, glow effect
- **Narrative**: Solid color, elegant hover
- **Showcase**: Bold, prominent
- **Minimalist**: Simple, clean

### Data Components

#### `FeatureCard`
```typescript
// website-shared/components/data/FeatureCard.tsx

interface FeatureCardProps {
  feature: {
    id: string
    title: string
    description: string
    icon: string
    category: string
  }
  variant?: 'default' | 'compact' | 'expanded'
  className?: string
}

// Usage:
// <FeatureCard feature={gasSponsorshipFeature} variant="expanded" />
```

**Variant Implementations:**
- **Immersive**: 3D icon, hover animations
- **Narrative**: Large typography, emotional copy
- **Showcase**: Detailed specs, expandable
- **Minimalist**: Icon + title only

#### `NetworkBadge`
```typescript
// website-shared/components/data/NetworkBadge.tsx

interface NetworkBadgeProps {
  network: {
    id: string
    name: string
    chainId: number
    icon: string
  }
  size?: 'sm' | 'md' | 'lg'
  showChainId?: boolean
  className?: string
}

// Usage:
// <NetworkBadge network={ethereumNetwork} size="md" showChainId />
```

#### `StatCard`
```typescript
// website-shared/components/data/StatCard.tsx

interface StatCardProps {
  value: string | number
  label: string
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  icon?: React.ReactNode
  className?: string
}

// Usage:
// <StatCard value="$1.2M" label="Gas Savings" trend={{ value: 23, direction: 'up' }} />
```

### Utility Components

#### `Section`
```typescript
// website-shared/components/layout/Section.tsx

interface SectionProps {
  children: React.ReactNode
  id?: string
  className?: string
  background?: 'white' | 'gray' | 'dark' | 'gradient'
  padding?: 'sm' | 'md' | 'lg' | 'xl'
}

// Usage:
// <Section id="features" background="gray" padding="lg">
//   <FeatureGrid />
// </Section>
```

#### `Container`
```typescript
// website-shared/components/layout/Container.tsx

interface ContainerProps {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

// Usage:
// <Container size="lg">
//   <Hero />
// </Container>
```

---

## Variant 1: Immersive Components

### 3D Components

#### `Wallet3D`
```typescript
// website-immersive/components/3d/Wallet3D.tsx

interface Wallet3DProps {
  autoRotate?: boolean
  interactive?: boolean
  onInteraction?: () => void
  className?: string
}

// Features:
// - React Three Fiber canvas
// - 3D wallet model (GLB/GLTF)
// - Mouse drag to rotate
// - Click to expand
// - Particle emissions
```

#### `ParticleField`
```typescript
// website-immersive/components/3d/ParticleField.tsx

interface ParticleFieldProps {
  count?: number
  color?: string
  speed?: number
  interactive?: boolean
  className?: string
}

// Features:
// - 1000+ particles
// - Flow animation
// - Mouse interaction
// - Network-specific colors
```

#### `Globe3D`
```typescript
// website-immersive/components/3d/Globe3D.tsx

interface Globe3DProps {
  networks?: Network[]
  interactive?: boolean
  onNetworkClick?: (network: Network) => void
  className?: string
}

// Features:
// - 3D globe
// - Network markers
// - Click to select network
// - Rotation animation
```

### Animation Components

#### `ScrollReveal`
```typescript
// website-immersive/components/animations/ScrollReveal.tsx

interface ScrollRevealProps {
  children: React.ReactNode
  direction?: 'up' | 'down' | 'left' | 'right'
  delay?: number
  duration?: number
  className?: string
}

// Features:
// - GSAP ScrollTrigger
// - Smooth reveal animations
// - Stagger children
// - Custom easing
```

#### `ParallaxSection`
```typescript
// website-immersive/components/animations/ParallaxSection.tsx

interface ParallaxSectionProps {
  children: React.ReactNode
  speed?: number
  className?: string
}

// Features:
// - Parallax scrolling
// - Depth effect
// - Smooth performance
```

### Demo Components

#### `WalletSimulator`
```typescript
// website-immersive/components/demo/WalletSimulator.tsx

interface WalletSimulatorProps {
  initialBalance?: number
  networks?: Network[]
  className?: string
}

// Features:
// - Mock wallet interface
// - Create account
// - Send transaction
// - Switch networks
// - Gas sponsorship indicator
// - Animated balance updates
```

---

## Variant 2: Narrative Components

### Story Components

#### `Chapter`
```typescript
// website-narrative/components/narrative/Chapter.tsx

interface ChapterProps {
  number: number
  title: string
  children: React.ReactNode
  nextChapter?: string
  className?: string
}

// Features:
// - Chapter number display
// - Progress indicator
// - Smooth scroll to next
// - Background transitions
```

#### `StoryBlock`
```typescript
// website-narrative/components/narrative/StoryBlock.tsx

interface StoryBlockProps {
  story: {
    name: string
    avatar: string
    quote: string
    before: string
    after: string
    impact: string
  }
  className?: string
}

// Features:
// - User avatar
// - Story quote
// - Before/after comparison
// - Emotional impact metrics
```

#### `Timeline`
```typescript
// website-narrative/components/narrative/Timeline.tsx

interface TimelineProps {
  events: {
    date: string
    title: string
    description: string
    icon?: React.ReactNode
  }[]
  className?: string
}

// Features:
// - Vertical timeline
// - Milestone markers
// - Scroll-triggered animations
// - Expandable details
```

### Typography Components

#### `HeroText`
```typescript
// website-narrative/components/typography/HeroText.tsx

interface HeroTextProps {
  headline: string
  subheadline?: string
  className?: string
}

// Features:
// - Large, impactful typography
// - Serif font family
// - Line height optimization
// - Responsive sizing
```

#### `PullQuote`
```typescript
// website-narrative/components/typography/PullQuote.tsx

interface PullQuoteProps {
  quote: string
  author?: string
  className?: string
}

// Features:
// - Large quote marks
// - Italic styling
// - Author attribution
// - Center alignment
```

---

## Variant 3: Showcase Components

### Demo Components

#### `WalletDemo`
```typescript
// website-showcase/components/demo/WalletDemo.tsx

interface WalletDemoProps {
  sandbox?: boolean
  features?: string[]
  className?: string
}

// Features:
// - Iframe sandbox
// - Full wallet functionality
// - Mock blockchain data
// - Reset button
// - Feature toggles
```

#### `FeatureTour`
```typescript
// website-showcase/components/demo/FeatureTour.tsx

interface FeatureTourProps {
  steps: {
    target: string
    title: string
    description: string
    position?: 'top' | 'bottom' | 'left' | 'right'
  }[]
  autoPlay?: boolean
  className?: string
}

// Features:
// - Step-by-step guide
// - Highlight elements
// - Progress indicator
// - Skip option
// - Keyboard navigation
```

### Stats Components

#### `LiveGasPrice`
```typescript
// website-showcase/components/stats/LiveGasPrice.tsx

interface LiveGasPriceProps {
  networks?: Network[]
  refreshInterval?: number
  className?: string
}

// Features:
// - WebSocket updates
// - Network selector
// - Historical chart
// - Price alerts
// - Gwei/USD conversion
```

#### `NetworkStatus`
```typescript
// website-showcase/components/stats/NetworkStatus.tsx

interface NetworkStatusProps {
  networks?: Network[]
  className?: string
}

// Features:
// - Real-time status
// - Block height
// - TPS (transactions per second)
// - Health indicator
```

#### `SavingsChart`
```typescript
// website-showcase/components/stats/SavingsChart.tsx

interface SavingsChartProps {
  data: {
    date: string
    sponsored: number
    regular: number
  }[]
  className?: string
}

// Features:
// - Line chart
// - Comparison lines
// - Interactive tooltips
// - Zoom/pan
// - Export options
```

### Comparison Components

#### `ComparisonTable`
```typescript
// website-showcase/components/comparison/ComparisonTable.tsx

interface ComparisonTableProps {
  competitors: {
    name: string
    features: {
      [key: string]: boolean | string | number
    }
  }[]
  features: string[]
  sortable?: boolean
  filterable?: boolean
  className?: string
}

// Features:
// - Sortable columns
// - Filter by category
// - Highlight best features
// - Export to CSV
// - Mobile responsive
```

---

## Variant 4: Minimalist Components

### Layout Components

#### `Hero`
```typescript
// website-minimalist/components/Hero.tsx

interface HeroProps {
  headline: string
  subheadline?: string
  cta?: {
    text: string
    href: string
  }
  className?: string
}

// Features:
// - Single headline
// - One subheadline
// - One CTA button
// - No images or graphics
// - Maximum whitespace
```

#### `ValueProp`
```typescript
// website-minimalist/components/ValueProp.tsx

interface ValuePropProps {
  items: {
    icon: React.ReactNode
    text: string
  }[]
  className?: string
}

// Features:
// - 3-4 bullet points
// - Icon + text only
// - No descriptions
// - Clean alignment
```

#### `HowItWorks`
```typescript
// website-minimalist/components/HowItWorks.tsx

interface HowItWorksProps {
  steps: {
    number: number
    text: string
  }[]
  className?: string
}

// Features:
// - Numbered steps
// - One line each
// - Minimal icons
// - Simple flow
```

---

## Component Reusability Strategy

### 1. Shared Data Layer

All variants consume the same data from `website-shared/data/`:

```typescript
// website-shared/data/features.json
{
  "features": [
    {
      "id": "gas-sponsorship",
      "title": "Gas Sponsorship",
      "description": "Transactions under $1 are automatically gas-sponsored",
      "icon": "gas",
      "category": "cost-saving"
    }
  ]
}
```

### 2. Component Variants Pattern

Each variant implements its own version of shared components:

```typescript
// website-immersive/components/FeatureCard.tsx
import { BaseFeatureCard } from 'website-shared/components/data/FeatureCard'
import { motion } from 'framer-motion'

export function FeatureCard(props: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <BaseFeatureCard {...props} variant="expanded" />
    </motion.div>
  )
}

// website-minimalist/components/FeatureCard.tsx
import { BaseFeatureCard } from 'website-shared/components/data/FeatureCard'

export function FeatureCard(props: FeatureCardProps) {
  return <BaseFeatureCard {...props} variant="compact" />
}
```

### 3. Theme Configuration

Each variant has its own Tailwind theme:

```javascript
// website-immersive/tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#10B981',
        accent: '#8B5CF6'
      },
      animation: {
        'float': 'float 6s ease-in-out infinite'
      }
    }
  }
}

// website-minimalist/tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        black: '#000000',
        white: '#FFFFFF',
        gray: { /* monochromatic */ }
      }
    }
  }
}
```

### 4. Shared Utilities

Common utilities in `website-shared/lib/`:

```typescript
// website-shared/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}
```

---

## Component Dependencies

### Shared Dependencies
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.3.1",
  "lucide-react": "^0.544.0"
}
```

### Immersive-Specific
```json
{
  "@react-three/fiber": "^8.15.0",
  "@react-three/drei": "^9.88.0",
  "three": "^0.158.0",
  "gsap": "^3.12.0",
  "framer-motion": "^10.16.0"
}
```

### Narrative-Specific
```json
{
  "@mdx-js/loader": "^3.0.0",
  "@mdx-js/react": "^3.0.0",
  "framer-motion": "^10.16.0"
}
```

### Showcase-Specific
```json
{
  "@tanstack/react-query": "^5.90.5",
  "recharts": "^2.10.0",
  "prismjs": "^1.29.0",
  "framer-motion": "^10.16.0",
  "viem": "^2.8.6"
}
```

### Minimalist-Specific
```json
{
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.3.1",
  "lucide-react": "^0.544.0"
}
```

---

## Component Testing Strategy

### Shared Components
- Unit tests for all props
- Snapshot tests for variants
- Accessibility tests (a11y)

### Variant-Specific Components
- Integration tests with shared components
- Performance tests (especially 3D)
- Cross-browser compatibility tests

---

## Performance Considerations

### Immersive
- Lazy load 3D models
- Use React.memo for expensive components
- Implement virtual scrolling for particle systems
- Optimize Three.js render loop

### Narrative
- Lazy load MDX content
- Optimize images (WebP, lazy loading)
- Use CSS animations over JS where possible

### Showcase
- Implement data caching with TanStack Query
- Debounce API calls
- Use virtual scrolling for large datasets
- Optimize chart rendering

### Minimalist
- Minimize JavaScript bundle
- Use CSS-only animations
- Optimize images and assets
- Implement code splitting

---

## Accessibility Standards

All components must meet WCAG 2.1 AA standards:

- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus indicators
- Color contrast ratios
- Reduced motion support

---

## Next Steps

1. Implement shared components first
2. Create variant-specific wrappers
3. Test component reusability
4. Optimize performance
5. Ensure accessibility compliance
