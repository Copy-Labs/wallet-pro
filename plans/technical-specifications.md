# Technical Specifications - 4 Website Variants

## Variant 1: Immersive Experience (`/website-immersive`)

### File Structure
```
website-immersive/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── (sections)/
│       ├── hero/
│       │   └── page.tsx
│       ├── demo/
│       │   └── page.tsx
│       ├── features/
│       │   └── page.tsx
│       ├── gas-visualizer/
│       │   └── page.tsx
│       ├── network-explorer/
│       │   └── page.tsx
│       └── dapp-demo/
│           └── page.tsx
├── components/
│   ├── 3d/
│   │   ├── Wallet3D.tsx
│   │   ├── Globe3D.tsx
│   │   ├── ParticleField.tsx
│   │   └── TransactionParticles.tsx
│   ├── animations/
│   │   ├── ScrollReveal.tsx
│   │   ├── FadeIn.tsx
│   │   └── ParallaxSection.tsx
│   ├── demo/
│   │   ├── WalletSimulator.tsx
│   │   ├── TransactionFlow.tsx
│   │   └── NetworkSwitcher.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Badge.tsx
│   └── layout/
│       ├── Navigation.tsx
│       └── Footer.tsx
├── lib/
│   ├── three/
│   │   ├── scene.ts
│   │   ├── camera.ts
│   │   └── lighting.ts
│   └── animations/
│       └── gsap-config.ts
├── public/
│   ├── models/
│   │   └── wallet.glb
│   └── textures/
├── package.json
├── tailwind.config.js
└── next.config.js
```

### Key Components

#### `Wallet3D.tsx`
```typescript
// 3D wallet model with interactive rotation
// Uses React Three Fiber
// Features:
// - Auto-rotation on idle
// - Mouse drag to rotate
// - Click to expand/collapse
// - Particle emissions on transactions
```

#### `ParticleField.tsx`
```typescript
// Background particle system
// Represents blockchain transactions
// Features:
// - 1000+ particles
// - Flow animation
// - Mouse interaction
// - Color changes based on network
```

#### `WalletSimulator.tsx`
```typescript
// Interactive wallet demo
// Mock data for demonstration
// Features:
// - Create account
// - Send transaction
// - Switch networks
// - View balance
// - Gas sponsorship indicator
```

#### `GasVisualizer.tsx`
```typescript
// Animated graph showing gas savings
// Features:
// - Line chart with animation
// - Comparison: sponsored vs. non-sponsored
// - Interactive tooltips
// - Real-time data simulation
```

### Package Dependencies
```json
{
  "dependencies": {
    "next": "15.5.4",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.88.0",
    "three": "^0.158.0",
    "gsap": "^3.12.0",
    "framer-motion": "^10.16.0",
    "lucide-react": "^0.544.0",
    "recharts": "^2.10.0"
  }
}
```

### Tailwind Configuration
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#10B981', // Emerald green
          dark: '#059669',
          light: '#34D399'
        },
        accent: {
          DEFAULT: '#8B5CF6', // Violet
          dark: '#7C3AED',
          light: '#A78BFA'
        }
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        }
      }
    }
  }
}
```

---

## Variant 2: Narrative Experience (`/website-narrative`)

### File Structure
```
website-narrative/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── (chapters)/
│       ├── problem/
│       │   └── page.tsx
│       ├── journey/
│       │   └── page.tsx
│       ├── solution/
│       │   └── page.tsx
│       ├── stories/
│       │   └── page.tsx
│       ├── impact/
│       │   └── page.tsx
│       └── future/
│           └── page.tsx
├── components/
│   ├── narrative/
│   │   ├── Chapter.tsx
│   │   ├── StoryBlock.tsx
│   │   ├── Timeline.tsx
│   │   └── Quote.tsx
│   ├── typography/
│   │   ├── HeroText.tsx
│   │   ├── PullQuote.tsx
│   │   └── Caption.tsx
│   ├── visual/
│   │   ├── Illustration.tsx
│   │   ├── PhotoGrid.tsx
│   │   └── StatCard.tsx
│   └── layout/
│       ├── ChapterNav.tsx
│       └── Footer.tsx
├── content/
│   ├── chapters/
│   │   ├── 01-problem.mdx
│   │   ├── 02-journey.mdx
│   │   ├── 03-solution.mdx
│   │   ├── 04-stories.mdx
│   │   ├── 05-impact.mdx
│   │   └── 06-future.mdx
│   └── stories/
│       ├── sarah.mdx
│       ├── mike.mdx
│       └── priya.mdx
├── lib/
│   └── mdx.ts
├── public/
│   ├── images/
│   │   ├── stories/
│   │   └── illustrations/
│   └── fonts/
├── package.json
├── tailwind.config.js
└── next.config.js
```

### Key Components

#### `Chapter.tsx`
```typescript
// Chapter wrapper component
// Features:
// - Chapter number display
// - Progress indicator
// - Smooth scroll to next chapter
// - Background color transitions
```

#### `StoryBlock.tsx`
```typescript
// User story component
// Features:
// - User avatar
// - Story quote
// - Before/after comparison
// - Emotional impact metrics
```

#### `Timeline.tsx`
```typescript
// Visual timeline component
// Features:
// - Vertical timeline
// - Milestone markers
// - Scroll-triggered animations
// - Expandable details
```

### MDX Content Example (`01-problem.mdx`)
```mdx
import { Quote } from '@/components/narrative/Quote'
import { StatCard } from '@/components/visual/StatCard'

# The Web3 Barrier

Imagine trying to send money to a friend, but first you need to:

1. Write down 12 random words on a piece of paper
2. Never lose that paper, ever
3. Understand what "gas fees" are
4. Pay $50 just to send $10

<Quote>
"I wanted to buy my first NFT, but I gave up after three hours of trying to figure out how to set up a wallet."
</Quote>

<StatCard
  value="6 Billion"
  label="People excluded from Web3 by complexity"
/>

This isn't a technical problem. It's a human problem.
```

### Package Dependencies
```json
{
  "dependencies": {
    "next": "15.5.4",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@mdx-js/loader": "^3.0.0",
    "@mdx-js/react": "^3.0.0",
    "framer-motion": "^10.16.0",
    "lucide-react": "^0.544.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.1"
  }
}
```

### Tailwind Configuration
```javascript
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: theme('colors.gray.800'),
            fontSize: '1.125rem',
            lineHeight: '1.8'
          }
        }
      })
    }
  }
}
```

---

## Variant 3: Showcase Experience (`/website-showcase`)

### File Structure
```
website-showcase/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── api/
│   │   └── stats/
│   │       └── route.ts
│   └── (sections)/
│       ├── hero/
│       │   └── page.tsx
│       ├── demo/
│       │   └── page.tsx
│       ├── features/
│       │   └── page.tsx
│       ├── comparison/
│       │   └── page.tsx
│       ├── stats/
│       │   └── page.tsx
│       ├── developer/
│       │   └── page.tsx
│       └── pricing/
│           └── page.tsx
├── components/
│   ├── demo/
│   │   ├── WalletDemo.tsx
│   │   ├── DemoSandbox.tsx
│   │   └── FeatureTour.tsx
│   ├── features/
│   │   ├── FeatureCard.tsx
│   │   ├── FeatureGrid.tsx
│   │   └── FeatureDetail.tsx
│   ├── comparison/
│   │   ├── ComparisonTable.tsx
│   │   ├── CompetitorRow.tsx
│   │   └── FeatureCheck.tsx
│   ├── stats/
│   │   ├── LiveGasPrice.tsx
│   │   ├── NetworkStatus.tsx
│   │   ├── TransactionCounter.tsx
│   │   └── SavingsChart.tsx
│   ├── developer/
│   │   ├── CodeBlock.tsx
│   │   ├── APIPreview.tsx
│   │   └── EndpointCard.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Tabs.tsx
│       ├── Accordion.tsx
│       └── Badge.tsx
├── demo/
│   ├── index.html
│   ├── wallet-demo.js
│   └── styles.css
├── lib/
│   ├── api/
│   │   ├── blockchain.ts
│   │   └── stats.ts
│   └── hooks/
│       ├── useGasPrice.ts
│       ├── useNetworkStatus.ts
│       └── useTransactionCount.ts
├── public/
│   ├── demo/
│   └── images/
├── package.json
├── tailwind.config.js
└── next.config.js
```

### Key Components

#### `WalletDemo.tsx`
```typescript
// Live wallet demo in iframe
// Features:
// - Sandboxed environment
// - Mock blockchain data
// - Full wallet functionality
// - Reset button
```

#### `FeatureTour.tsx`
```typescript
// Interactive feature tour
// Features:
// - Step-by-step guide
// - Highlight elements
// - Progress indicator
// - Skip option
```

#### `ComparisonTable.tsx`
```typescript
// Feature comparison table
// Features:
// - Sortable columns
// - Filter by category
// - Highlight best features
// - Export to CSV
```

#### `LiveGasPrice.tsx`
```typescript
// Real-time gas price display
// Features:
// - WebSocket updates
// - Network selector
// - Historical chart
// - Price alerts
```

### API Route Example (`api/stats/route.ts`)
```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  // Fetch real blockchain data
  const gasPrice = await fetchGasPrice()
  const networkStatus = await getNetworkStatus()
  const transactionCount = await getTransactionCount()

  return NextResponse.json({
    gasPrice,
    networkStatus,
    transactionCount,
    timestamp: Date.now()
  })
}
```

### Demo Sandbox (`demo/index.html`)
```html
<!DOCTYPE html>
<html>
<head>
  <title>Smart Wallet Pro Demo</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="wallet-demo">
    <!-- Simulated wallet interface -->
  </div>
  <script src="wallet-demo.js"></script>
</body>
</html>
```

### Package Dependencies
```json
{
  "dependencies": {
    "next": "15.5.4",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@tanstack/react-query": "^5.90.5",
    "recharts": "^2.10.0",
    "prismjs": "^1.29.0",
    "framer-motion": "^10.16.0",
    "lucide-react": "^0.544.0",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-accordion": "^1.2.12",
    "viem": "^2.8.6"
  }
}
```

---

## Variant 4: Minimalist Experience (`/website-minimalist`)

### File Structure
```
website-minimalist/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── Hero.tsx
│   ├── ValueProp.tsx
│   ├── HowItWorks.tsx
│   ├── Features.tsx
│   ├── CTA.tsx
│   └── Footer.tsx
├── lib/
│   └── utils.ts
├── public/
│   ├── logo.svg
│   └── icons/
├── package.json
├── tailwind.config.js
└── next.config.js
```

### Key Components

#### `Hero.tsx`
```typescript
// Minimal hero section
// Features:
// - Single headline
// - One subheadline
// - One CTA button
// - No images or graphics
```

#### `ValueProp.tsx`
```typescript
// Core value propositions
// Features:
// - 3-4 bullet points
// - Icon + text only
// - No descriptions
```

#### `HowItWorks.tsx`
```typescript
// Simple 3-step process
// Features:
// - Numbered steps
// - One line each
// - Minimal icons
```

### Page Structure (`page.tsx`)
```typescript
export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <ValueProp />
      <HowItWorks />
      <Features />
      <CTA />
      <Footer />
    </main>
  )
}
```

### Package Dependencies
```json
{
  "dependencies": {
    "next": "15.5.4",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "lucide-react": "^0.544.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.1"
  }
}
```

### Tailwind Configuration
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // Monochromatic palette
        black: '#000000',
        white: '#FFFFFF',
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      spacing: {
        '128': '32rem',
        '144': '36rem'
      }
    }
  }
}
```

---

## Shared Assets Structure (`/website-shared`)

```
website-shared/
├── assets/
│   ├── logos/
│   │   ├── logo-primary.svg
│   │   ├── logo-secondary.svg
│   │   ├── icon.svg
│   │   └── favicon.ico
│   ├── icons/
│   │   ├── wallet.svg
│   │   ├── gas.svg
│   │   ├── network.svg
│   │   ├── security.svg
│   │   └── dapp.svg
│   └── images/
│       ├── hero-bg.jpg
│       ├── team/
│       └── screenshots/
├── content/
│   ├── copy/
│   │   ├── hero.json
│   │   ├── features.json
│   │   └── testimonials.json
│   ├── testimonials/
│   │   ├── user-1.json
│   │   ├── user-2.json
│   │   └── user-3.json
│   └── statistics/
│       ├── users.json
│       ├── transactions.json
│       └── savings.json
└── data/
    ├── features.json
    ├── networks.json
    ├── pricing.json
    └── faq.json
```

### Shared Data Example (`data/features.json`)
```json
{
  "features": [
    {
      "id": "gas-sponsorship",
      "title": "Gas Sponsorship",
      "description": "Transactions under $1 are automatically gas-sponsored",
      "icon": "gas",
      "category": "cost-saving"
    },
    {
      "id": "no-seed-phrase",
      "title": "No Seed Phrases",
      "description": "Never worry about losing your seed phrase again",
      "icon": "security",
      "category": "security"
    },
    {
      "id": "multi-network",
      "title": "Multi-Network Support",
      "description": "Seamlessly switch between Ethereum, Polygon, Arbitrum, and more",
      "icon": "network",
      "category": "network"
    },
    {
      "id": "dapp-integration",
      "title": "DApp Integration",
      "description": "Connect to any DApp with one click",
      "icon": "dapp",
      "category": "integration"
    }
  ]
}
```

---

## Implementation Checklist

### Phase 1: Foundation Setup
- [ ] Create all 4 website directories
- [ ] Initialize Next.js projects for each variant
- [ ] Configure Tailwind CSS for each theme
- [ ] Set up shared assets directory
- [ ] Create shared data structures
- [ ] Configure package.json for each variant

### Phase 2: Variant-Specific Setup
- [ ] **Immersive**: Install Three.js, GSAP, React Three Fiber
- [ ] **Narrative**: Install MDX, configure typography
- [ ] **Showcase**: Set up API routes, demo sandbox
- [ ] **Minimalist**: Optimize for performance

### Phase 3: Component Development
- [ ] Create shared components (logo, footer, navigation)
- [ ] Build variant-specific components
- [ ] Implement animations and interactions
- [ ] Add responsive design

### Phase 4: Content Integration
- [ ] Write copy for each variant
- [ ] Add images and assets
- [ ] Implement live data fetching (showcase)
- [ ] Create demo content

### Phase 5: Testing & Optimization
- [ ] Test all variants across browsers
- [ ] Optimize performance
- [ ] Check accessibility
- [ ] Mobile responsiveness testing

### Phase 6: Deployment
- [ ] Configure build processes
- [ ] Set up hosting
- [ ] Configure domains
- [   Set up analytics
