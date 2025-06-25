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

- June 25, 2025: Enhanced QR code generation with shareable participant selection links and improved UI
- June 25, 2025: Added comprehensive homepage with bill management dashboard and statistics
- June 25, 2025: Fixed participant update API endpoints - corrected PATCH to PUT method and endpoint structure
- June 25, 2025: Resolved data type validation for amountToPay field (string vs number)
- June 25, 2025: Fixed critical API response parsing issue preventing bill creation navigation
- June 25, 2025: Implemented participant count input with automatic even split calculation  
- June 25, 2025: Added bill owner highlighting with crown badge in participant review
- June 25, 2025: Fixed routing issues between bill creation and participant screens
- June 25, 2025: Simplified navigation flow removing AI processing complexity

## User Preferences

Preferred communication style: Simple, everyday language.