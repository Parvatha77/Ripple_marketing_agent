# Decision Intelligence Dashboard - UI Design Brief for Stitch AI

## Executive Summary

This is a React 18 + TypeScript web application for marketing executives to test discount strategies, visualize causal impact chains, and maintain governance/audit trails. The app runs 100% client-side with optional backend integration via environment variables.

---

## Core Use Cases

1. **Strategy Simulation**: Test "what-if" discount scenarios and see immediate impact on revenue, margin, competitor response, and brand perception
2. **Governance Tracking**: View all simulation runs with audit trail, decision history, and guardrail compliance
3. **Timeline Visualization**: Watch reaction cascade over 90 days (Day 0 → Day 30 → Day 90) across 6 customer personas and 2 competitors
4. **Comparison**: See 3 scenarios side-by-side (Conservative 15%, Aggressive 25%, Your Choice)

---

## Current Architecture

### Layout Structure
- **Fixed left sidebar** (264px wide): Navigation + branding
  - Dark blue gradient background (`from-[#1e3a8a] to-[#0f172a]`)
  - 3 main nav links: Governance, Simulator, Timeline
  - Active tab shows full gradient highlight (teal/blue/orange)
  - Inactive tabs show muted text with hover state
  
- **Main content area** (flexible width): Pages scale to available space
  - Minimal left/right padding (px-4) to reduce whitespace
  - Light background gradient (`from-slate-50 via-white to-[color]-50`)
  - White cards with subtle shadows for content sections

### Color System
- **Primary**: Deep blue gradient (#1e3a8a → #0f172a)
- **Accent 1 (Governance tab)**: Teal (#0d9488 / #14b8a6)
- **Accent 2 (Simulator tab)**: Blue (#2563eb / #3b82f6)
- **Accent 3 (Timeline tab)**: Orange (#ea580c / #f97316)
- **Risk indicators**: Red (#ef4444), Orange (#f59e0b), Green (#10b981)
- **Typography**: Fraunces (display/headings), Inter (body), IBM Plex Mono (numbers)

---

## Screen 1: Governance Dashboard

### Purpose
Compliance, audit trail, and decision tracking. Shows all past simulations and manual decisions with outcomes.

### Current Features

#### 1. KPI Strip (6 Cards in Grid)
- **Live Discount**: Current active discount % (dynamic)
- **Guardrail Status**: "✓ Safe" (teal) or "⚠ At Risk" (orange) badge
- **Override Rate**: % of decisions that ignored guardrail recommendation
- **Open Risk Flags**: Count of active risk conditions
- **Margin Impact**: Percentage point delta vs. baseline
- **Avg Gap**: Average forecast-vs-guardrail variance

All cards: white background, rounded-xl, subtle borders, font-tabular for numbers

#### 2. Decision Timeline Chart (Visual)
- Horizontal SVG chart showing discount level over time
- Y-axis scale: 10% → 30% discount
- X-axis: Historical decisions plotted left-to-right
- **Data point shapes**:
  - Circle = simulation run
  - Square = no simulation run
- **Data point colors**:
  - Gray = no guardrail recommendation available
  - Green = decision followed guardrail
  - Red = decision overrode guardrail
- Grid lines, axis labels, legend at bottom

#### 3. Decision Audit Trail Table (Sortable)
Columns: Date | Type | Decision % | Initiated By | Sim Run? | Guardrail Rec | Action | Risk Level | Status

**Type badges**:
- Gray "Manual" = hand-entered decision
- Blue "💾 Saved" = saved simulation from Simulator screen

Features:
- Rows clickable to view detail
- Hover state (light blue background)
- Risk levels color-coded (low=teal, medium=blue, high=orange)
- Sorted by date (newest first)

#### 4. Decision Detail Panel
Shows side-by-side comparison when user clicks a row:

**Left column - "What Was Chosen"**:
- Discount level
- Margin impact (red text)
- Purchase intent lift
- Loyalty delta
- Competitor match risk

**Right column - "Guardrails Recommended"** (or "No Simulation Run"):
- Recommended discount
- Margin impact (green text)
- Purchase intent lift
- Loyalty delta
- Competitor match risk
- Variance explanation

All metrics: blue-tinted background cards, clean typography

---

## Screen 2: Strategy Simulator

### Purpose
Interactive testing of discount strategies with real-time causal flow visualization and guardrail recommendations.

### Current Features

#### 1. Scenario Description Card
- Scenario title & description
- 3-column grid: Scope | Effective Date | Baseline Discount %
- All in white card with subtle border

#### 2. Product Selection Dropdown
- `<select>` field showing:
  - "All Products (Site-Wide)" (default)
  - Optgroup "Individual Products" with list of all SKUs
- Styled with blue/indigo accent on focus

#### 3. Discount Controls
- **Orange gradient slider** (0–50%, step 1%)
- Large orange gradient text display: "XX%"
- Scale labels below (0%, 25%, 50%)
- Updates live as user drags

#### 4. Scenario Comparison Cards (3-Column)
**Scenario A (15% Discount)**:
- Risk badge: "Low Risk" (teal)
- Shows: Revenue lift, Margin impact, 12-mo CLV shift
- Teal accent color (border-teal-500, bg-teal-50)

**Scenario B (25% Discount)**:
- Risk badge: "Moderate Risk" (orange)
- Same metrics
- Orange accent color (border-orange-500, bg-orange-50)

**Your Input (Dynamic)**:
- Risk badge: "Low/Medium/High Risk" (updates with slider)
- Shows: Revenue lift, Margin impact, 12-mo CLV shift
- Cyan border (border-cyan-500, bg-cyan-50)

All cards: rounded-2xl, 2px border, hover states, clickable

#### 5. Ripple Effect Flow Graph (SVG-Based)
9-node simplified DAG showing causal chain:
- **Order 0 (Navy)**: Discount
- **Order 1 (Teal)**: Conversion, Full-price loss
- **Order 2 (Violet)**: Revenue, Price sensitivity
- **Order 3 (Brick)**: Margin, Competitor, CLV, Brand

Features:
- Animated dots travel along edges (respects prefers-reduced-motion)
- Nodes sized by magnitude (0-1 scale)
- Click node to select and see details in side panel
- Selected node: white background + larger circle
- Unrelated nodes dim out
- Legend at bottom showing order→confidence mapping

#### 6. Flow Node Detail Panel
Right-side panel showing selected node details:
- Node label & color order badge
- Value readout
- Evidence (top 3 persona quotes/deltas or competitor rationale)
- Close button (X)

#### 7. Strategy Guardrail Recommendation Card
Navy header card showing:
- Recommendation text (h2): "We recommend an 18% cap with targeted loyalty offer"
- Rationale prose mentioning affected personas
- Persona names as clickable chips (brand-tint background)

#### 8. Baseline vs. Outcome Summary Table
Columns: Metric | Baseline | Simulated End-State | Delta

Rows:
- Revenue ($)
- Full-price purchases (%)
- AOV ($)
- Repeat purchase rate (%)
- Discount depth (%)

Deltas: Green for positive, red for negative

#### 9. Save Simulation Section
Large card with:
- Headline: "Save This Simulation"
- Description: "Store this result in the database so it appears in your Governance Dashboard and audit trail"
- Button: "💾 Save Simulation"
  - States: Saving (⏳), Saved (✓, green), Error (✗, red), Idle (blue gradient)
  - Shows success/error message below
  - Auto-clears after 3 seconds

---

## Screen 3: Timeline (Reaction Cascade)

### Purpose
Watch how customers and competitors react to the chosen discount over 90 days.

### Current Layout
3-column layout: Day 0 | Day 30 | Day 90

### Current Features

#### Per-Time-Column:
1. **Header with badge**:
   - Numbered circle (1, 2, 3) in orange gradient
   - Time label (Day 0, Day 30, Day 90)
   - Orange border-bottom separator

2. **Persona Cards** (6 cards per column):
   - Persona name & segment
   - Purchase intent delta (↑/↓ with %)
   - Loyalty delta (↑/↓ with %)
   - Sentiment (positive/neutral/negative)
   - Quote from that persona at that timestep
   - Card colors: Subtle blue/teal gradient backgrounds
   - Rounded corners, small shadows

3. **Competitor Response Section** (Days 30 & 90 only):
   - "COMPETITOR RESPONSE" header
   - Competitor cards showing:
     - Competitor name
     - Action (Match, Hold, Escalate)
     - Rationale prose
   - Card colors: Orange/red tints for escalate, green for hold

---

## Data Flow & Integrations

### API Endpoints (Mock Server at `localhost:8787`)
- `GET /scenario` → Scenario metadata
- `GET /personas` → 6 personas with sensitivity/loyalty scores
- `GET /products` → 12 products with SKU, name, price, cost
- `GET /competitors` → 2 competitors with archetype, matching tendency
- `GET /baseline` → Current KPIs (revenue, AOV, repeat rate, discount depth %)
- `GET /outcome` → Simulated end-state at Day 90
- `GET /event-log` → All persona/competitor/guardrail events at each timestep
- `GET /graph` → Causal graph node/edge definitions
- **`GET /simulations`** → Fetch all saved simulations
- **`POST /simulations`** → Save new simulation result

### Simulation Engine (Client-Side)
Formula-driven, transparent:
- Input: discount %, persona sensitivity (0-1), brand loyalty (0-1), competitor tendency (0-1)
- Output: persona events (intent delta, loyalty delta), competitor actions, guardrail recommendation, financial outcome
- Time-aligned tuning curves decay/grow impact over Day 0 → Day 30 → Day 90

---

## Visual Design Principles

1. **Dense Information Layout**: Minimal whitespace, max content per pixel
2. **Light Theme**: Light background gradients, white cards, subtle shadows (not dark mode)
3. **3D Card Aesthetic**: Cards use box-shadow with rgba glows for depth:
   ```css
   box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 
               0 8px 10px -6px rgba(0, 0, 0, 0.1)
   ```
4. **Gradient Accents**: Headings, buttons, and data highlights use color gradients
5. **Rounded Corners**: Consistent rounded-xl (12px) for major sections, rounded-lg (8px) for minor
6. **Typography Hierarchy**:
   - Display: Fraunces, 28-48px, bold (page titles)
   - Section headers: 18-24px, semibold
   - Body: Inter, 14-16px, regular
   - Numbers: IBM Plex Mono, 12-16px, tabular figures
7. **Spacing**: 8px grid (4px, 8px, 12px, 16px, 24px, 32px)

---

## Current User Feedback & Pain Points

1. ✅ **Likes**: Colors are professional, flow graph shows causal thinking, guardrails are clear
2. ❌ **Issues to Address**:
   - Some users find 9-node flow graph "dense"—could benefit from clearer legend or progressive disclosure
   - Governance dashboard could surface "highest risk" simulations more prominently
   - Product dropdown is functional but could use visual icons or categories
   - Timeline persona quotes sometimes repeat—could show more variance

---

## Technical Stack (For Implementation Reference)

- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Zustand (useSimulationStore, useDiscountStore)
- **Styling**: Tailwind CSS v4 with custom design tokens
- **3D Rendering**: react-three-fiber + three.js (simplified to 2D for readability)
- **Routing**: react-router-dom (3 main routes: /governance, /simulator, /timeline)
- **Build**: Vite (dev server on :5173, build to dist/)

---

## Design Improvement Opportunities

1. **Governance Dashboard**: Could add "Quick Actions" button to jump to Simulator with pre-filled discount
2. **Simulator**: Could show "Risk Trajectory" chart (how risk changes as discount increases)
3. **Timeline**: Could add "Confidence Score" for each persona prediction
4. **Mobile**: Currently designed for desktop 1920px+—responsive design for tablet/mobile not yet implemented
5. **Dark Mode**: Only light theme supported; dark theme could be added via Tailwind config
6. **Accessibility**: WCAG AA compliance needed (color contrast, keyboard nav, screen reader support)

---

## Deliverable Format

**Current State**: Production-ready React component library
**Desired Deliverable**: Design system refresh, interaction patterns, improved layout density, enhanced visual hierarchy

Use this brief to understand current implementation, then propose:
- Refined wireframes
- Improved component spacing & visual relationships
- Enhanced data visualization (if applicable)
- Mobile-responsive design considerations
- Accessibility improvements
