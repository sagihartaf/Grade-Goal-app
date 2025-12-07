# GradeGoal - Strategic GPA Optimizer

## Overview

GradeGoal is a mobile-first web application designed for Israeli university and college students to strategically optimize their degree GPA. The application enables students to track courses, simulate grade scenarios with real-time calculations, and understand how different scores affect their overall academic performance. It features Hebrew RTL support, a "Magen" (protective grade) algorithm specific to Israeli academic institutions, and an interactive what-if scenario system using sliders.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool and development server.

**UI Component System**: shadcn/ui components built on Radix UI primitives, configured for Hebrew RTL layout with the "new-york" style variant.

**Styling Approach**: Tailwind CSS with extensive customization for RTL support, using the Rubik font family optimized for Hebrew typography. The design follows Material Design 3 principles with Linear-inspired minimalism for data clarity. Both light and dark modes are supported through CSS variables.

**State Management**: 
- TanStack Query (React Query) for server state management with infinite stale time
- Local React state for UI interactions and real-time score simulations
- Local score state maintained separately from server state to enable instant slider updates without API calls

**Routing**: wouter for lightweight client-side routing

**Key Design Patterns**:
- Mobile-first responsive design with bottom navigation
- Accordion/collapsible cards for semester and course organization
- Real-time GPA calculation with optimistic UI updates
- Framer Motion for smooth animations on grade sliders and transitions

**RTL Optimization**: Complete right-to-left layout support with Hebrew language throughout the interface, high contrast text requirements (7:1 for small text, 4.5:1 for larger text).

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js

**API Design**: RESTful API with session-based authentication

**Key Routes**:
- `/api/auth/*` - Authentication endpoints (Replit OIDC)
- `/api/semesters` - CRUD operations for semesters
- `/api/courses` - CRUD operations for courses
- `/api/grade-components` - Update individual grade component scores
- `/api/profile` - User profile management
- `/api/stats/institution` - Percentile ranking within institution
- `/api/subscription` - User subscription status
- `/api/stripe/*` - Stripe integration (checkout, portal, webhooks)

**Authentication Pattern**: 
- Replit OIDC (OpenID Connect) integration using Passport.js
- Session management with PostgreSQL-backed session store (connect-pg-simple)
- Session persistence with 7-day TTL
- Middleware-based route protection with `isAuthenticated` guard

**Business Logic**:
- GPA calculation engine with Israeli academic "Magen" algorithm
- Weighted average calculations across courses and semesters
- Real-time grade simulation without persistence until user commits changes
- Target grade tracking per course with progress visualization
- Percentile ranking within same academic institution
- PDF grade report export (using jspdf + jspdf-autotable)

**Stripe Integration** (Legacy):
- stripe-replit-sync for managed webhooks and data synchronization
- Webhook handlers for checkout.session.completed, subscription updates/deletions
- Customer portal for subscription management

**Lemon Squeezy Integration** (Primary):
- Redirect-based checkout flow (no SDK required)
- Checkout URL: https://gradegoal.lemonsqueezy.com/buy/1a922e3f-709c-47a3-9395-7b93865cad80
- User ID passed via checkout[custom][user_id] parameter
- Webhook endpoint: POST /api/webhooks/lemon-squeezy
- Listens for order_created event to upgrade users to Pro tier
- Free tier limited to 2 semesters, Pro tier unlimited
- PaywallModal component for upgrade prompts
- useProStatus hook for checking subscription status
- Environment variable: LEMONSQUEEZY_WEBHOOK_SECRET (for webhook signature verification)

**Ad Monetization** (Free Tier):
- AdPlaceholder.tsx: Reusable component that renders ad placeholders for free users only
- Pro users see no ads (component returns null when isPro is true)
- Sticky bottom banner (320×50): Fixed above BottomNavigation on all authenticated pages
- Inline dashboard banner (320×100): Positioned between GpaHeader and semester list
- All pages use pb-32 padding to prevent content overlap with stacked nav + ad
- Hebrew text "שטח פרסום" (Ad Space) as placeholder

### Data Storage Solutions

**ORM**: Drizzle ORM with PostgreSQL dialect

**Database Schema**:

1. **users** - User profiles linked to Replit Auth IDs
   - Stores academic institution, target GPA, subscription tier
   - Stripe customer ID and subscription ID for billing
   - Primary key: UUID (auto-generated)

2. **semesters** - Academic semesters organized by year and term
   - Foreign key to users (cascade delete)
   - Term enum: "A", "B", "Summer"
   - Auto-naming convention: "Year X - Semester Y"

3. **courses** - Individual courses within semesters
   - Foreign key to semesters (cascade delete)
   - Stores course name and credit hours (Nakaz)

4. **gradeComponents** - Grade components for each course
   - Foreign key to courses (cascade delete)
   - Stores component name, weight (must sum to 100%), score, and isMagen flag
   - Enables "Magen" algorithm: MAX(regular calculation, calculation without Magen components)

5. **sessions** - PostgreSQL-backed session storage for authentication

**Data Relationships**:
- One-to-many: user → semesters → courses → gradeComponents
- Cascade deletes ensure data integrity when removing parent records

**Migration Strategy**: Drizzle Kit with migrations stored in `/migrations` directory

### External Dependencies

**Authentication Service**: 
- Replit OIDC (OpenID Connect) for user authentication
- Environment variables: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`

**Database**: 
- PostgreSQL (provisioned via `DATABASE_URL` environment variable)
- Connection pooling via `pg` package

**Third-Party UI Libraries**:
- Radix UI for accessible component primitives
- Framer Motion for animations
- Lucide React for icons
- react-hook-form with Zod for form validation

**Development Tools**:
- Replit-specific plugins for dev environment integration (cartographer, dev-banner, runtime-error-modal)

**Build Dependencies**:
- esbuild for server bundling with dependency allowlist
- Vite for client bundling and HMR
- TypeScript for type safety across full stack

**Font Service**: Google Fonts (Rubik family for Hebrew support)