# AI Auditor - Design Guidelines

## Design Approach
**System Selected:** Material Design with Linear influences
**Rationale:** Combines data clarity with modern tech aesthetics. Material's structured components suit audit workflows while Linear's typography brings sophistication to technical content.

## Typography
- **Primary Font:** Inter (Google Fonts) - weights 400, 500, 600, 700
- **Hierarchy:**
  - H1: text-4xl font-bold (Dashboard titles)
  - H2: text-2xl font-semibold (Section headers)
  - H3: text-xl font-semibold (Card titles)
  - Body: text-base font-normal
  - Small: text-sm font-medium (Labels, metadata)
  - Code/Data: Mono font for results display

## Layout System
**Spacing Units:** Tailwind 2, 4, 6, 8, 12, 16 units
- Component padding: p-6
- Section spacing: py-12 to py-16
- Card gaps: gap-6
- Container max-width: max-w-7xl

## Core Components

### Dashboard Layout
- **Sidebar:** Fixed left navigation (w-64) with audit history, settings, profile
- **Main Area:** Dynamic content with top action bar including "New Audit" CTA
- **Stats Cards:** 3-4 column grid showing key metrics (total audits, pass rate, critical issues)

### Audit Input Section
- **Upload Zone:** Large dropzone with drag-and-drop for files/URLs
- **Configuration Panel:** Collapsible settings with toggle switches and dropdowns
- **Action Bar:** Primary "Run Audit" button with secondary options

### Results Display
- **Summary Cards:** Grid layout showing pass/fail/warning counts with icons
- **Detailed Report:** Expandable accordion sections for each audit category
- **Issue Cards:** List view with severity badges, description, and code snippets
- **Data Tables:** Sortable/filterable tables for comprehensive results

### Navigation
- **Top Bar:** Logo, global search, notifications, user menu
- **Sidebar Menu:** Icon + text, active state indicators, collapsible sections

### Forms & Inputs
- **Text Fields:** Outlined style with floating labels
- **Buttons:** Rounded (rounded-lg), solid fills, disabled states
- **Selects:** Custom styled dropdowns matching input aesthetic
- **Checkboxes/Toggles:** Material-style switches for settings

### Data Visualization
- **Charts:** Use Chart.js for trend graphs and audit history
- **Progress Indicators:** Circular progress for audit completion
- **Severity Badges:** Pill-shaped tags (Critical: red, Warning: yellow, Info: blue)

## Images
**Hero Section:** No traditional hero - dashboard leads immediately with functionality. If marketing page exists, use abstract AI/tech visualization (neural networks, data flows) as background with 40% opacity overlay for readability.

**Icons:** Heroicons via CDN for UI elements, custom audit-specific icons as placeholder comments.

**Illustrations:** Use spot illustrations in empty states (no audits yet, no results found).

## Animations
Minimal and purposeful:
- Smooth page transitions (200ms)
- Loading spinners during audit processing
- Accordion expand/collapse
- No decorative animations

## Key Principles
1. **Clarity First:** Audit results must be immediately scannable
2. **Action-Oriented:** Primary CTAs always visible and prominent
3. **Data Density:** Efficient use of space for information display without clutter
4. **Professional Tone:** Clean, technical aesthetic that builds trust
5. **Responsive Grid:** Adapts gracefully from 3-column desktop to single-column mobile