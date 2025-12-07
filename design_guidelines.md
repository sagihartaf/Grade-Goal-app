# GradeGoal Design Guidelines

## Design Approach: Design System + Productivity Focus

**Selected System**: Material Design 3 principles with Linear-inspired minimalism for data clarity
**Justification**: GradeGoal is a utility-focused productivity tool requiring precision, efficiency, and data clarity. Material Design 3 provides excellent mobile patterns, robust component library, and strong RTL support critical for Hebrew interfaces.

## Core Design Principles

1. **Data-First Clarity**: Every element serves the calculation and decision-making process
2. **Mobile-Native Efficiency**: Touch-optimized interactions with generous tap targets
3. **Real-Time Feedback**: Instant visual updates reflect calculation changes
4. **RTL Excellence**: Natural Hebrew reading flow without compromises

## Typography System (Hebrew RTL)

**Font Family**: 
- Primary: 'Rubik' (Google Fonts) - Excellent Hebrew support, modern sans-serif
- Fallback: system-ui, -apple-system

**Hierarchy**:
- Main GPA Display (Hero): text-5xl font-bold (48px) - The dominant focal point
- Section Headers: text-2xl font-semibold (24px)
- Semester Names: text-lg font-medium (18px)
- Course Names: text-base font-medium (16px)
- Component Labels: text-sm font-normal (14px)
- Helper Text/Credits: text-xs (12px)
- Navigation Labels: text-sm font-medium (14px)

**High Contrast Requirement**: All input fields and data displays must use strong color contrast ratios (minimum 7:1 for text-sm and smaller, 4.5:1 for text-base and larger).

## Layout & Spacing System

**Tailwind Units**: Standardize on 2, 4, 6, 8, 12, 16 for consistency
- Component padding: p-4 to p-6
- Section spacing: mb-6 to mb-8
- Card gaps: gap-4
- Bottom nav height: h-16
- Safe area for bottom nav: pb-20 on main content

**Container Structure**:
- Full viewport height layout with bottom navigation
- Main content: px-4 max-w-2xl mx-auto (centered, readable width)
- Expandable cards: w-full with internal px-4 py-4

## Component Library

### Bottom Navigation Bar
Fixed bottom bar with 2-3 primary actions (Dashboard, Profile, Settings)
- Icons: Heroicons (outline for inactive, solid for active)
- Height: h-16 with safe area consideration
- Background: Elevated surface with subtle shadow
- Active indicator: Icon color change + small indicator bar above icon

### Dynamic GPA Header
Sticky top header showing current filtered GPA
- Large numerical display (text-5xl) with decimal precision
- Filter chips below (Entire Degree / Year / Semester)
- Smooth number transition when values update
- Compact on scroll behavior (reduces to text-3xl)

### Accordion Semester Cards
Material-inspired elevated cards with expand/collapse
- Collapsed state: Semester name + aggregate GPA + chevron icon
- Border-radius: rounded-lg
- Shadow: Subtle elevation (shadow-md)
- Expanded state reveals courses inline with smooth height transition
- Each course is a nested card-like row with minimal styling

### Course Rows (Within Expanded Semester)
Clean rows with left-aligned layout (RTL aware):
- Course name (font-medium)
- Credits display (small badge/chip)
- Grade components listed vertically within course
- Touch-optimized spacing (min-h-12 per row)

### Interactive Sliders
Material Design 3 slider pattern:
- Track height: h-1.5
- Thumb size: w-5 h-5
- Active state: Scale up thumb slightly
- Value label appears above thumb during interaction
- Smooth transition: transition-all duration-200 ease-out
- RTL consideration: Slider direction inverted for Hebrew

### Form Inputs (Semester/Course Creation)
Material Design outlined text fields:
- Height: h-12 for touch optimization
- Clear floating labels
- Dropdown selects for Academic Year and Term (no free text)
- Validation states with inline error messages
- High contrast borders (especially in focus state)

### Buttons & Actions
- Primary CTA: Rounded-lg with h-12 minimum
- Icon buttons: w-10 h-10 for 44px touch target
- Ghost buttons for secondary actions
- Disabled states clearly distinguished

### Ad Placeholder Zones (Free Tier)
- Banner style: Fixed aspect ratio containers
- Positioned: Between major sections
- Clear "Advertisement" label
- Non-intrusive borders to separate from content

## RTL-Specific Considerations

- All flex/grid layouts: Apply `dir="rtl"` to HTML root
- Icons and chevrons: Mirror horizontally for RTL (rotate-180 where needed)
- Sliders: Reverse direction (right = low, left = high in RTL)
- Navigation order: Right-to-left reading flow
- Margins/padding: Use logical properties (`ms-` instead of `ml-`, `me-` instead of `mr-`)

## Animation Guidelines

**Use Sparingly - Performance First**:
- Slider drag: Smooth easing on value updates
- Accordion expand/collapse: height transition (duration-300)
- GPA number updates: Subtle fade/scale transition
- Tab switching: Simple opacity fade
- **NO decorative animations** - Every motion serves usability

## Accessibility Mandates

- Minimum touch target: 44x44px for all interactive elements
- High contrast mode support (text contrast ratios enforced)
- Semantic HTML with proper ARIA labels for Hebrew screen readers
- Keyboard navigation support for all interactions
- Focus indicators clearly visible

## Mobile-First Responsive Behavior

**Base (Mobile)**:
- Single column layout
- Full-width cards
- Bottom navigation primary

**Tablet (md: 768px+)**:
- Max-width container (max-w-3xl)
- Slightly larger typography scale
- Side navigation option unlocked

**Desktop (lg: 1024px+)**:
- Max-width container (max-w-4xl)
- Optional side panel for filters/quick actions
- Hover states activated

## Images

**No Hero Image Required**: This is a data-focused productivity tool, not a marketing site. The "hero" is the dynamic GPA display itself.

**Icon Usage**: 
- Use Heroicons throughout (via CDN)
- Academic/grade-related icons: Calculator, chart bar, academic cap, clipboard
- Navigation icons: Home, user circle, cog

This design creates a professional, efficient tool that respects Israeli academic culture while prioritizing data clarity and mobile usability.