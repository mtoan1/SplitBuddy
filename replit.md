# ChillBill Service

## Overview

ChillBill Service is a bill-splitting application that allows users to create, manage, and process bill splitting requests. The service integrates with AI for bill and image processing, handles participant management, and provides payment functionality. It's built as a full-stack application with a React frontend and Express backend.

## System Architecture

### Tech Stack
- **Frontend**: React with TypeScript, Vite for build tooling
- **Backend**: Node.js with Express and TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state
- **Development**: Replit environment with hot reloading

### Project Structure
```
├── client/          # React frontend application
├── server/          # Express backend API
├── shared/          # Shared TypeScript types and schemas
├── migrations/      # Database migration files
└── attached_assets/ # Documentation and requirements
```

## Key Components

### Frontend Architecture
- **React SPA**: Single-page application with component-based architecture
- **shadcn/ui**: Modern UI component library for consistent design
- **TanStack Query**: Handles API calls, caching, and server state management
- **Wouter**: Lightweight routing solution
- **Tailwind CSS**: Utility-first styling with custom design tokens

### Backend Architecture
- **Express REST API**: RESTful endpoints for bill management
- **TypeScript**: Type-safe server-side development
- **In-Memory Storage**: Simple Map-based data storage for development
- **Modular Structure**: Separated concerns (routes, storage)

### Data Schema
The application uses in-memory storage with the following main entities:
- **Bills**: Core bill splitting requests with metadata
- **Participants**: Users involved in bill splitting
- **Payment Requests**: Individual payment obligations
- **Notifications**: Communication tracking

Key enums define status types:
- Bill Status: created, active, completed, cancelled
- Payment Status: pending, paid, failed, overdue
- Split Methods: equal, custom_amount, percentage

## Data Flow

1. **Bill Creation**: User creates a bill split request with images
2. **AI Processing**: Images sent to AI service for bill data extraction and participant identification
3. **Split Calculation**: System calculates individual amounts based on chosen split method
4. **Payment Requests**: Generate payment links/QR codes for participants
5. **Payment Processing**: Handle payment updates and track completion
6. **Notifications**: Send updates to participants via various channels

## External Dependencies

### AI Service Integration
- Bill image processing for data extraction
- Group image processing for face recognition
- Currently mocked with dummy responses for development

### Payment System Integration
- Payment link generation
- QR code creation for easy payments
- Webhook handling for payment status updates
- Currently mocked for testing purposes

### Third-Party Libraries
- **@radix-ui**: Accessible UI primitives
- **qrcode**: QR code generation
- **wouter**: Lightweight routing
- **zod**: Runtime type validation

## Deployment Strategy

### Development Environment
- Replit-based development with hot reloading
- Vite dev server for frontend with proxy configuration
- tsx for TypeScript execution in development
- In-memory storage for all data

### Production Build
- Vite builds static frontend assets to `dist/public`
- esbuild bundles backend into `dist/index.js`
- Single deployment artifact with both frontend and backend
- All data stored in memory (resets on restart)

### Environment Configuration
- **Development**: `npm run dev` starts both frontend and backend
- **Production**: `npm run build` then `npm run start`
- No database setup required

## Recent Changes

- June 28, 2025: Removed PostgreSQL database dependency and implemented in-memory storage - application now runs without database requirements, data stored in Maps and resets on restart
- June 27, 2025: Added green checkmark icon for paid participants on selection screen for visual payment status clarity
- June 27, 2025: Fixed shared link routing to go to participant selection screen (/bills/:id/participants) instead of bill details
- June 27, 2025: Fixed shared link routing issue - moved /bill/:id route to end to prevent conflicts with more specific routes
- June 26, 2025: Made manual participants screen compact to match Bill Details design - reduced padding, simplified headers, streamlined form layout
- June 26, 2025: Removed section labels from participant selection screen for cleaner UI
- June 26, 2025: Converted to pure list format - removed all card styling, using simple rows with thin dividers between items
- June 26, 2025: Redesigned participant cards as ultra-compact list rows - removed all borders, reduced padding to minimum, responsive phone display
- June 26, 2025: Simplified participant cards to clean list format - removed avatars, status labels, and icons for minimal design
- June 26, 2025: Made participant cards more compact - reduced height by 40%, optimized layout, and improved information density
- June 26, 2025: Optimized participant selection screen with modern flat design, improved spacing, and Cake branding
- June 26, 2025: Added automatic bill date generation (random date within last 30 days) when receipt photo is uploaded
- June 26, 2025: Added automatic business name generation when receipt photo is uploaded
- June 26, 2025: Moved smart processing section to top of create bill screen with auto-fill functionality
- June 26, 2025: Added automatic total amount generation (100-5000) when receipt photo is uploaded
- June 26, 2025: Added automatic people count generation (5-12) when group photo is uploaded
- June 26, 2025: Implemented participant sorting with bill owner first, then alphabetical order
- June 25, 2025: Updated bill detail screen buttons to use primary pink color scheme instead of blue
- June 25, 2025: Updated "My Bills" button with Receipt icon and matching primary color scheme
- June 25, 2025: Sorted bill lists by creation date (newest first) on homepage and bills dashboard
- June 25, 2025: Added Cake banner image to bottom of homepage with responsive design
- June 25, 2025: Fixed split amount logic - manual changes preserved until "Redistribute" button clicked
- June 25, 2025: Added smart split amount editing with equal distribution and validation
- June 25, 2025: Updated bill dashboard to show real bills from API instead of hardcoded demo data
- June 25, 2025: Updated participant generation to use Vietnamese names (Toan, Hung, Tue, An, etc.)
- June 25, 2025: Modified participant headers to display names instead of numbers with compact layout
- June 25, 2025: Fixed logo image distortion by adding object-contain CSS class to maintain aspect ratio
- June 25, 2025: Replaced app logo with Cake company logo across all page headers
- June 25, 2025: Updated to modern flat design style - removed drop shadows, using clean borders and subtle hover effects
- June 25, 2025: Restored bill image and group photo upload sections to create-bill page with modern styling
- June 25, 2025: Added home navigation shortcuts to bill screens with consistent neon pink/deep blue styling
- June 25, 2025: Updated secondary color to deep blue (#271d7a) to match requested color scheme
- June 25, 2025: Changed primary color from green to neon pink (#ff37a5) as requested by user
- June 25, 2025: Fixed app compilation errors - removed broken JSX fragments and Card import issues
- June 25, 2025: Standardized mobile layout sizing from max-w-sm to max-w-md across all screens for consistency
- June 25, 2025: Implemented Cake's neon color palette (neon pink #ff37a5, deep blue #271d7a) with modern flat design
- June 25, 2025: Added neon glow effects, gradients, and enhanced visual styling throughout the interface
- June 25, 2025: Fixed CSS compilation errors and syntax issues preventing app from loading
- June 25, 2025: Updated mobile component classes with proper border handling and focus states
- June 25, 2025: Enhanced homepage with neon gradient text effects and consistent mobile dimensions
- June 25, 2025: Redesigned all screens with mobile app layout format - enhanced spacing, rounded corners, improved typography
- June 25, 2025: Fixed participant update API endpoints - corrected PATCH to PUT method and endpoint structure
- June 25, 2025: Implemented complete payment tracking system with mock payment flow, transaction IDs, and real-time progress updates
- June 25, 2025: Added payment status API endpoint and enhanced participant cards with Pay buttons and payment date display
- June 25, 2025: Fixed compilation errors in participant card component and updated payment flow routing

## User Preferences

Preferred communication style: Simple, everyday language.