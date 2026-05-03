# Architecture Diagram - 4 Website Variants

## High-Level Architecture

```mermaid
graph TB
    subgraph "Smart Wallet Pro Project"
        A[Smart Wallet Pro Extension]
    end

    subgraph "Website Variants"
        B[Immersive Experience]
        C[Narrative Experience]
        D[Showcase Experience]
        E[Minimalist Experience]
    end

    subgraph "Shared Resources"
        F[Shared Assets]
        G[Shared Data]
        H[Shared Components]
    end

    A -->|Features & Data| G
    F --> B
    F --> C
    F --> D
    F --> E
    G --> B
    G --> C
    G --> D
    G --> E
    H --> B
    H --> C
    H --> D
    H --> E

    B -->|immersive.smartwalletpro.com| I[Users]
    C -->|story.smartwalletpro.com| I
    D -->|demo.smartwalletpro.com| I
    E -->|smartwalletpro.com| I
```

---

## Component Hierarchy

```mermaid
graph LR
    subgraph "Shared Components"
        SC1[Logo]
        SC2[CTA Button]
        SC3[Feature Card]
        SC4[Network Badge]
        SC5[Stat Card]
        SC6[Section]
        SC7[Container]
    end

    subgraph "Immersive Components"
        IC1[Wallet3D]
        IC2[Particle Field]
        IC3[Globe3D]
        IC4[Scroll Reveal]
        IC5[Wallet Simulator]
    end

    subgraph "Narrative Components"
        NC1[Chapter]
        NC2[Story Block]
        NC3[Timeline]
        NC4[Hero Text]
        NC5[Pull Quote]
    end

    subgraph "Showcase Components"
        SHC1[Wallet Demo]
        SHC2[Feature Tour]
        SHC3[Comparison Table]
        SHC4[Live Gas Price]
        SHC5[API Preview]
    end

    subgraph "Minimalist Components"
        MC1[Hero]
        MC2[Value Prop]
        MC3[How It Works]
        MC4[Features]
        MC5[CTA]
    end

    SC1 --> IC1
    SC1 --> NC1
    SC1 --> SHC1
    SC1 --> MC1

    SC3 --> IC5
    SC3 --> NC2
    SC3 --> SHC2
    SC3 --> MC4
```

---

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Variant
    participant SharedData
    participant WalletExtension

    User->>Variant: Visits website
    Variant->>SharedData: Request features
    SharedData-->>Variant: Return feature data
    Variant->>SharedData: Request networks
    SharedData-->>Variant: Return network data
    Variant->>WalletExtension: Link to download
    User->>WalletExtension: Install extension
```

---

## Implementation Flow

```mermaid
graph TD
    A[Phase 1: Foundation] --> B[Phase 2: Shared Components]
    B --> C[Phase 3: Variant Implementation]
    C --> D[Phase 4: Content Integration]
    D --> E[Phase 5: Testing & Optimization]
    E --> F[Phase 6: Deployment]

    C --> C1[Minimalist]
    C --> C2[Narrative]
    C --> C3[Showcase]
    C --> C4[Immersive]

    style C1 fill:#90EE90
    style C2 fill:#87CEEB
    style C3 fill:#DDA0DD
    style C4 fill:#FFB6C1
```

---

## Tech Stack Comparison

| Component | Immersive | Narrative | Showcase | Minimalist |
|-----------|-----------|-----------|-----------|------------|
| Framework | Next.js 15 | Next.js 15 | Next.js 15 | Next.js 15 |
| Styling | Tailwind + Framer | Tailwind + Custom | Tailwind + Radix | Tailwind |
| 3D | Three.js + R3F | - | - | - |
| Animations | GSAP + Framer | Framer | Framer | CSS only |
| Data Fetching | - | - | TanStack Query | - |
| Charts | Recharts | - | Recharts | - |
| MDX | - | MDX | - | - |
| Bundle Size | Large | Medium | Medium | Small |
| Load Time | Medium | Medium | Medium | Fast |
| Complexity | High | Medium | High | Low |

---

## User Journey by Variant

### Immersive
```mermaid
graph LR
    A[Hero with 3D Wallet] --> B[Interactive Demo]
    B --> C[Feature Animations]
    C --> D[Gas Visualizer]
    D --> E[Network Explorer]
    E --> F[Download CTA]
```

### Narrative
```mermaid
graph LR
    A[Chapter 1: Problem] --> B[Chapter 2: Journey]
    B --> C[Chapter 3: Solution]
    C --> D[Chapter 4: Stories]
    D --> E[Chapter 5: Impact]
    E --> F[Chapter 6: Future]
    F --> G[Download CTA]
```

### Showcase
```mermaid
graph LR
    A[Hero with Screenshot] --> B[Live Demo]
    B --> C[Feature Grid]
    C --> D[Comparison Table]
    D --> E[Live Stats]
    E --> F[Developer Preview]
    F --> G[Download CTA]
```

### Minimalist
```mermaid
graph LR
    A[Hero Headline] --> B[Value Props]
    B --> C[How It Works]
    C --> D[Features List]
    D --> E[Download CTA]
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        A[Local Development]
        B[Git Repository]
    end

    subgraph "CI/CD"
        C[GitHub Actions]
    end

    subgraph "Hosting"
        D[Vercel]
    end

    subgraph "Domains"
        E[smartwalletpro.com]
        F[immersive.smartwalletpro.com]
        G[story.smartwalletpro.com]
        H[demo.smartwalletpro.com]
    end

    A --> B
    B --> C
    C --> D
    D --> E
    D --> F
    D --> G
    D --> H
```

---

## Performance Targets

```mermaid
graph LR
    subgraph "Performance Metrics"
        A[Immersive<br/>Lighthouse > 90]
        B[Narrative<br/>Lighthouse > 90]
        C[Showcase<br/>Lighthouse > 90]
        D[Minimalist<br/>Lighthouse > 95<br/>Load < 1s<br/>Bundle < 100KB]
    end

    subgraph "Accessibility"
        E[WCAG 2.1 AA<br/>All Variants]
    end

    subgraph "Responsiveness"
        F[Mobile 320px-768px<br/>All Variants]
        G[Tablet 768px-1024px<br/>All Variants]
        H[Desktop 1024px+<br/>All Variants]
    end

    A --> E
    B --> E
    C --> E
    D --> E

    A --> F
    B --> F
    C --> F
    D --> F

    A --> G
    B --> G
    C --> G
    D --> G

    A --> H
    B --> H
    C --> H
    D --> H
```

---

## Shared Data Structure

```mermaid
graph TD
    subgraph "Shared Data"
        A[features.json]
        B[networks.json]
        C[statistics.json]
        D[hero.json]
        E[testimonials/]
    end

    subgraph "Features Data"
        A1[gas-sponsorship]
        A2[no-seed-phrase]
        A3[multi-network]
        A4[dapp-integration]
    end

    subgraph "Networks Data"
        B1[Ethereum]
        B2[Polygon]
        B3[Arbitrum]
        B4[Optimism]
    end

    subgraph "Statistics Data"
        C1[users]
        C2[transactions]
        C3[savings]
    end

    A --> A1
    A --> A2
    A --> A3
    A --> A4

    B --> B1
    B --> B2
    B --> B3
    B --> B4

    C --> C1
    C --> C2
    C --> C3
```

---

## Component Reusability Pattern

```mermaid
graph LR
    subgraph "Shared Base Component"
        A[BaseFeatureCard]
    end

    subgraph "Variant Implementations"
        B[Immersive FeatureCard]
        C[Narrative FeatureCard]
        D[Showcase FeatureCard]
        E[Minimalist FeatureCard]
    end

    A --> B
    A --> C
    A --> D
    A --> E

    B -->|3D icon, hover animations| F[User]
    C -->|Large typography, emotional copy| F
    D -->|Detailed specs, expandable| F
    E -->|Icon + title only| F
```

---

## File Structure Overview

```mermaid
graph TD
    A[smart-wallet-pro/] --> B[website-immersive/]
    A --> C[website-narrative/]
    A --> D[website-showcase/]
    A --> E[website-minimalist/]
    A --> F[website-shared/]

    B --> B1[app/]
    B --> B2[components/]
    B --> B3[lib/]
    B --> B4[public/]

    C --> C1[app/]
    C --> C2[components/]
    C --> C3[content/]
    C --> C4[public/]

    D --> D1[app/]
    D --> D2[components/]
    D --> D3[demo/]
    D --> D4[lib/]
    D --> D5[public/]

    E --> E1[app/]
    E --> E2[components/]
    E --> E3[lib/]
    E --> E4[public/]

    F --> F1[assets/]
    F --> F2[content/]
    F --> F3[data/]
```

---

## Success Metrics Flow

```mermaid
graph LR
    subgraph "User Actions"
        A[Visit Website]
        B[Interact with Features]
        C[Click CTA]
        D[Download Extension]
    end

    subgraph "Metrics Tracked"
        E[Engagement<br/>Time on page<br/>Scroll depth<br/>Interaction rate]
        F[Conversion<br/>CTA clicks<br/>Downloads]
        G[Performance<br/>Lighthouse scores<br/>Load times]
        H[Accessibility<br/>WCAG compliance<br/>Screen reader support]
    end

    A --> E
    B --> E
    C --> F
    D --> F
    A --> G
    B --> G
    A --> H
    B --> H
```

---

## Summary

This architecture diagram illustrates:

1. **High-level structure** of all 4 variants and their relationship to shared resources
2. **Component hierarchy** showing shared and variant-specific components
3. **Data flow** between variants, shared data, and the wallet extension
4. **Implementation flow** through all phases
5. **Tech stack comparison** across all variants
6. **User journeys** for each variant
7. **Deployment architecture** from development to production
8. **Performance targets** for all variants
9. **Shared data structure** and organization
10. **Component reusability pattern** for efficient development
11. **File structure overview** for each variant
12. **Success metrics flow** and tracking

All diagrams use Mermaid syntax and can be rendered in any Markdown viewer that supports Mermaid.
