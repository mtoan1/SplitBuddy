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
- **Drizzle ORM**: Type-safe database operations
- **Modular Structure**: Separated concerns (routes, storage, database)

### Database Schema
The application uses PostgreSQL with the following main entities:
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
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **@radix-ui**: Accessible UI primitives
- **drizzle-orm**: Type-safe database toolkit
- **qrcode**: QR code generation
- **wouter**: Lightweight routing
- **zod**: Runtime type validation

## Deployment Strategy

### Development Environment
- Replit-based development with hot reloading
- Vite dev server for frontend with proxy configuration
- tsx for TypeScript execution in development
- Environment variables for database connections

### Production Build
- Vite builds static frontend assets to `dist/public`
- esbuild bundles backend into `dist/index.js`
- Single deployment artifact with both frontend and backend
- PostgreSQL database provisioned separately

### Environment Configuration
- **Development**: `npm run dev` starts both frontend and backend
- **Production**: `npm run build` then `npm run start`
- Database migrations via `npm run db:push`

## Recent Changes

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