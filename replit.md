# AssetFlow - Software Asset Management Platform

## Overview

AssetFlow is a comprehensive software asset management platform designed to help organizations track, manage, and optimize their software portfolios. The application provides multi-tenant architecture with features for software asset tracking, environment management, dependency mapping, and cost analysis. Built with a modern stack including React, Express.js, and PostgreSQL, it offers real-time insights into software usage, dependencies, and licensing costs across different environments and departments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, professional UI components
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for robust form management
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with TypeScript in ESM module format
- **Framework**: Express.js for RESTful API endpoints
- **Authentication**: Replit Auth integration with OpenID Connect for secure user authentication
- **Session Management**: Express sessions with PostgreSQL session store for scalable session handling
- **API Design**: RESTful endpoints with proper HTTP status codes and error handling
- **Middleware**: Custom logging, authentication guards, and error handling middleware

### Database Architecture
- **Primary Database**: PostgreSQL with Neon serverless hosting for scalability
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Schema Design**: Multi-tenant architecture with proper foreign key relationships
- **Migration Strategy**: Drizzle Kit for database schema migrations and version control

### Multi-Tenant Design
- **Isolation**: Tenant-based data isolation with user-tenant relationship mapping
- **Security**: Row-level security through tenant ID filtering in all queries
- **Scalability**: Shared database with logical separation for cost-effective multi-tenancy

### Component Architecture
- **Design System**: Radix UI primitives with custom styling for accessibility and consistency
- **Component Structure**: Modular components organized by feature (dashboard, software, environments, costs, dependencies)
- **Responsive Design**: Mobile-first approach with responsive breakpoints and touch-friendly interfaces
- **Icon System**: Font Awesome for consistent iconography across the application

### Data Flow Pattern
- **Query Management**: Centralized API requests through TanStack Query with proper caching strategies
- **Error Handling**: Unified error handling with user-friendly toast notifications
- **Loading States**: Skeleton components for better perceived performance
- **Real-time Updates**: Query invalidation for data consistency across components

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling and automatic scaling
- **Drizzle ORM**: Type-safe database operations with PostgreSQL dialect support

### Authentication & Security
- **Replit Auth**: OpenID Connect integration for secure user authentication and authorization
- **Session Storage**: PostgreSQL-backed session storage with configurable TTL

### UI & Design Libraries
- **Radix UI**: Unstyled, accessible UI primitives for complex components
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **Lucide React**: Modern icon library for consistent visual elements
- **React Flow**: Interactive node-based diagrams for dependency mapping

### Development & Build Tools
- **Vite**: Fast build tool with HMR and optimized production bundles
- **TypeScript**: Static type checking for better code quality and developer experience
- **ESBuild**: Fast bundling for server-side code compilation

### Form & Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: Runtime type validation for form inputs and API responses
- **Hookform Resolvers**: Integration between React Hook Form and Zod validation

### Utility Libraries
- **date-fns**: Modern date utility library for date formatting and manipulation
- **clsx & Tailwind Merge**: Conditional className utilities for dynamic styling
- **class-variance-authority**: Type-safe variant API for component styling