# Prompt for Stitch AI - Design Review & Optimization

**Copy this entire prompt and paste into Stitch AI Google**

---

## Project Brief

You are reviewing a React decision-intelligence dashboard for marketing executives. The app allows users to test discount strategies in real-time and see cascading impact across customer behavior, financials, and competitor response.

**Current tech**: React 18, TypeScript, Tailwind CSS v4, Zustand state management. **Not a design-only request** — there's a fully functional implementation that needs visual/UX refinement.

---

## Current UI Architecture

### 1. Left Sidebar Navigation (Fixed, 264px)
- **Background**: Dark blue gradient (`#1e3a8a → #0f172a`)
- **Branding**: "Ripple Decision Intelligence" header
- **3 main tabs**: 
  - Governance (teal accent: `#0d9488`)
  - Simulator (blue accent: `#2563eb`)
  - Timeline (orange accent: `#ea580c`)
- **Active state**: Full-width gradient highlight + shadow
- **Inactive state**: Muted text (`text-blue-100`) with hover (`hover:bg-blue-600/50`)

### 2. Main Content (Responsive)
- **Background**: Light gradient (`from-slate-50 via-white to-[accent]-50`)
- **Layout**: Max-width fluid, padding: 4px left/right (minimal whitespace)
- **Card style**: White bg, rounded-xl, subtle shadow, border-gray-200
- **Typography**: Fraunces (headings), Inter (body), IBM Plex Mono (numbers)

---

## Screen-by-Screen Feature Breakdown

### SCREEN 1: GOVERNANCE DASHBOARD
**Purpose**: Audit trail, compliance, decision history tracking

**Section A: KPI Strip (6 Cards)**
- Live Discount % (current active discount)
- Guardrail Status (✓ Safe in teal, ⚠ At Risk in orange)
- Override Rate (% of decisions ignored guardrails)
- Open Risk Flags (count)
- Margin Impact (pp delta vs baseline)
- Avg Gap (forecast vs guardrail variance)
- **Design**: Grid layout, white cards, tabular font numbers, minimal borders

**Section B: Decision Timeline Chart**
- SVG visualization showing historical discount decisions over time
- Y-axis: 10%–30% discount range
- Data point shapes: Circle = simulation run, Square = no sim
- Data point colors: Gray (no rec), Green (followed rec), Red (overrode rec)
- **Design**: Subtle gradient background, axis labels, legend at bottom

**Section C: Decision Audit Trail Table**
- Columns: Date | Type | Discount % | Initiated By | Sim Run? | Guardrail Rec | Risk Level | Status
- **Type column badges**: Gray "Manual" or Blue "💾 Saved" (saved simulations from Simulator)
- **Rows**: Clickable, hover highlight, sorted by date (newest first)
- **Risk level colors**: Low=teal, Medium=blue, High=orange
- Includes both manual decisions (mock data) and saved simulations (from API)

**Section D: Decision Detail Panel**
- Shows when user clicks a table row
- **Left column**: "What Was Chosen" (discount %, margin impact, persona intent, loyalty, competitor risk)
- **Right column**: "Guardrails Recommended" (same metrics but guardrail version)
- **Variance section**: Shows difference between chosen and recommended
- **Design**: Blue tinted backgrounds, clean typography, side-by-side comparison

---

### SCREEN 2: STRATEGY SIMULATOR
**Purpose**: Interactive "what-if" testing with real-time visualization and guardrail feedback

**Section A: Scenario Card**
- Title & description of scenario
- Grid: Scope | Effective Date | Baseline Discount %
- **Design**: White card, minimal styling

**Section B: Product Selection**
- `<select>` dropdown: "All Products (Site-Wide)" + individual SKU list
- **Design**: Standard form styling with blue focus ring

**Section C: Discount Controls**
- **Slider**: Orange gradient, 0–50% range, step 1
- **Display**: Large orange gradient text showing current % (e.g., "20%")
- **Scale**: 0%, 25%, 50% labels
- Updates live as user drags
- **Design**: Prominent, easy to interact with

**Section D: Scenario Comparison (3-Column Cards)**
Each card shows: discount %, risk badge, revenue lift, margin impact, 12-mo CLV shift

- **Scenario A (15%)**: Teal accent, "Low Risk" badge
- **Scenario B (25%)**: Orange accent, "Moderate Risk" badge  
- **Your Input (Dynamic)**: Cyan accent, "Low/Medium/High Risk" badge (updates with slider)

**Design**: Rounded-2xl, 2px border, rounded info boxes, hover states

**Section E: Ripple Effect Flow Graph**
- 9-node SVG directed acyclic graph (DAG) showing causal chain
- **Nodes by order**: 
  - Order 0 (Navy): Discount
  - Order 1 (Teal): Conversion, Full-price loss
  - Order 2 (Violet): Revenue, Price sensitivity
  - Order 3 (Brick): Margin, Competitor, CLV, Brand
- **Features**:
  - Animated dots travel along edges
  - Nodes sized by magnitude (0-1 scale)
  - Click to select → shows details in right panel
  - Selected node: white background + larger circle
  - Unrelated nodes dim when another is selected
  - Legend at bottom showing order→confidence mapping
- **Design**: Clean 2D layout, readable at 1920px viewport

**Section F: Flow Node Detail Panel**
- Right-side sliding panel showing selected node
- **Content**: Node label, color badge, value, evidence (persona quotes or competitor rationale), close button
- **Design**: White card, left-aligned text

**Section G: Strategy Guardrail Card**
- Navy header: "Strategy Guardrail"
- **Recommendation**: Large text (h2) e.g., "We recommend an 18% cap with targeted loyalty offer"
- **Rationale**: Prose paragraph mentioning affected personas
- **Persona chips**: Names as clickable badges with brand-tint backgrounds
- **Design**: Gradient background (`from-blue-50 to-indigo-50`), blue-200 border

**Section H: Baseline vs. Outcome Table**
- 4 columns: Metric | Baseline | Simulated | Delta
- Rows: Revenue ($), Full-price % (%), AOV ($), Repeat rate (%), Discount depth (%)
- **Deltas**: Green (positive), Red (negative)
- **Design**: Simple table, font-tabular numbers

**Section I: Save Simulation Section** (NEW)
- Headline: "Save This Simulation"
- Description: "Store this result in the database so it appears in your Governance Dashboard and audit trail"
- **Button states**:
  - Idle: "💾 Save Simulation" (blue gradient)
  - Saving: "⏳ Saving…" (disabled, gray)
  - Saved: "✓ Saved" (green, 3-sec confirmation)
  - Error: "✗ Error" (red)
- Success/error message below button, auto-clears after 3 seconds
- Saved simulations appear in Governance Dashboard audit trail as "💾 Saved" entries

---

### SCREEN 3: TIMELINE (Reaction Cascade)
**Purpose**: Visualize how personas and competitors react over 90 days

**Layout**: 3-column grid (Day 0 | Day 30 | Day 90)

**Per Column**:
- **Header**: Numbered circle badge (1, 2, 3 in orange gradient) + time label (Day 0, Day 30, Day 90)
- **Persona Cards** (6 per column):
  - Name & segment
  - Intent delta (↑/↓ %)
  - Loyalty delta (↑/↓ %)
  - Sentiment (emoji/color)
  - Quoted reaction (persona voice)
  - **Design**: Rounded cards, subtle blue/teal gradient bg, small shadow
  
- **Competitor Section** (Days 30 & 90 only):
  - Header: "COMPETITOR RESPONSE"
  - Cards per competitor showing: Name, Action (Match/Hold/Escalate), Rationale
  - **Design**: Orange/red tints for escalate, green for hold

---

## Data Flow

### API Endpoints (Mock @ localhost:8787)
```
GET /scenario       → Current scenario (description, scope, dates)
GET /personas       → 6 personas (discount_sensitivity, brand_loyalty 0-1)
GET /products       → 12 products (sku_id, name, price, cost)
GET /competitors    → 2 competitors (price_match_tendency 0-1)
GET /baseline       → Current metrics (revenue, AOV, repeat rate, discount %)
GET /outcome        → Simulated Day-90 state
GET /event-log      → All persona/competitor/guardrail events per timestep
GET /graph          → Causal graph node/edge definitions
GET /simulations    → All saved simulations (ID, discount %, product, outcomes, timestamp)
POST /simulations   → Save new simulation (returns ID + created_at)
```

### Client-Side Simulation
- Formula-driven, transparent calculation
- Input: discount %, persona sensitivity, brand loyalty, competitor tendency
- Output: persona events (delta %), competitor actions, guardrail rec, financial outcome
- No backend calls needed after initial data load (fully interactive)

---

## Visual Design System

**Color Palette**:
- Primary: Blue gradient (#1e3a8a → #0f172a)
- Accent A (Governance): Teal (#0d9488, #14b8a6)
- Accent B (Simulator): Blue (#2563eb, #3b82f6)
- Accent C (Timeline): Orange (#ea580c, #f97316)
- Risk: Red (#ef4444), Orange (#f59e0b), Green (#10b981)
- Neutral: Gray (50-900 scale)
- Background: Light gradients (slate-50, white, [color]-50)

**Typography**:
- Display (titles): Fraunces, 28–48px, bold
- Section heads: 18–24px, semibold
- Body: Inter, 14–16px, regular
- Numbers: IBM Plex Mono, 12–16px, tabular

**Spacing**: 8px grid (4, 8, 12, 16, 24, 32px)

**Shadows**: Subtle depth
```css
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 8px 10px -6px rgba(0, 0, 0, 0.1)
```

**Corners**: Rounded-xl (12px) for major sections, rounded-lg (8px) for minor

---

## Key Design Principles

1. **Dense Information**: Minimal whitespace, max content per pixel
2. **Light Theme**: Bright backgrounds, white cards, subtle shadows (no dark mode)
3. **Gradient Accents**: Buttons, headings, data highlights use color gradients
4. **Visual Hierarchy**: Clear section separation, color-coded risk levels
5. **Real-Time Feedback**: Instant slider updates, animation on graph, guardrail color changes
6. **Audit Trail First**: Governance page shows all decisions with traceability

---

## Current Strengths

✅ Professional color scheme (purple, teal, blue, orange gradients)
✅ Clear information architecture (3 focused screens)
✅ Transparent simulation engine (users understand the "how")
✅ Guardrail recommendation is prominent and actionable
✅ Timeline shows persona empathy (quotes, emotions)
✅ Audit trail includes saved simulations for full traceability

---

## Areas for UX/Design Refinement

❌ 9-node flow graph can feel dense—could benefit from progressive disclosure or clearer visual grouping
❌ Governance dashboard could highlight "highest risk" scenarios or "decisions not followed" more prominently
❌ Product dropdown has no visual icons/categories—could use better scannability
❌ Mobile responsiveness not yet addressed (currently desktop-only, 1920px+)
❌ Accessibility (WCAG AA): color contrast, keyboard nav, screen reader support needs review
❌ Dark mode: not currently supported
❌ Timeline persona quotes sometimes repeat variants—could show more text diversity

---

## What We Need From Design Review

1. **Visual Refinement**: Improve spacing, hierarchy, or card layouts?
2. **Interaction Patterns**: Better flow for saving → viewing in governance?
3. **Data Visualization**: Could flow graph or timeline be clearer/more scannable?
4. **Mobile/Responsive**: How should this adapt to tablet/mobile screens?
5. **Accessibility**: WCAG AA improvements, dark mode support, etc.?
6. **Component Library**: Should we formalize these as reusable design components?

**Please analyze current implementation and propose improvements in these areas.**
