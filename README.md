# Pagana - Multi-Platform Application Architecture

## Overview

Pagana is a comprehensive multi-platform application consisting of a **backend API**, **web frontend**, **mobile applications**, and **admin portals**. This repository contains the complete architecture structure with full configuration for frontend and admin portals, while backend and mobile apps are structured as placeholders for visualization.

---

## 🏗️ Project Structure

```
pagana/
├── pagana-api/              # Django + Django REST Framework (DRF) Backend
├── pagana-web/              # React + Vite + TypeScript Web Frontend
├── pagana-mobile-customer/  # React Native + Expo Customer Mobile App
├── pagana-mobile-vendor/    # React Native + Expo Vendor Mobile App
├── pagana-mobile-rider/     # React Native + Expo Rider Mobile App
├── pagana-admin/            # Admin Portal Suite
│   ├── pagana-superadmin/   # Full System Admin Portal
│   └── pagana-ops/          # Operations Staff Portal
└── README.md                # This file
```

---

## 📦 Component Details

### 1. **pagana-api** - Backend API

**Technology Stack:**
- Django (Python web framework)
- Django REST Framework (DRF)
- PostgreSQL/MySQL (database)

**Purpose:**
- RESTful API backend serving all platforms
- Business logic and data management
- Authentication and authorization
- Database operations and models

**Structure:**
- Basic Django project structure (`apps/`, `settings.py`, `manage.py`)
- Placeholder files for architecture visualization
- No full implementation (structure only)

**Status:** ⚠️ Placeholder structure only

---

### 2. **pagana-web** - Web Frontend

**Technology Stack:**
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - High-quality component library
- **TanStack Query (React Query)** - Server state management
- **React Router v6** - Client-side routing

**Purpose:**
- User-facing web application
- Login/registration pages
- Dashboard and main user interface
- Responsive design with modern UI

**Key Features:**
- ✅ **Fully configured** - Ready-to-run skeleton
- ✅ **React Query integration** - API state management setup
- ✅ **UI Toolkit configured** - Tailwind CSS + Shadcn UI
- ✅ **Authentication pages** - Login/registration with routing
- ✅ **TypeScript support** - Type-safe development

**Structure:**
```
pagana-web/
├── src/
│   ├── api/              # API client and React Query hooks
│   ├── components/       # Reusable UI components
│   ├── features/         # Feature-based modules
│   ├── pages/            # Route pages (Login, Register, Dashboard)
│   ├── hooks/            # Custom React hooks
│   └── styles/           # Global styles
├── main.tsx              # Application entry point
└── index.html            # HTML template
```

**Status:** ✅ Fully configured and ready-to-run

---

### 3. **Mobile Applications** - React Native + Expo Apps

**Technology Stack:**
- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform
- **NativeWind** - Tailwind-like styling for React Native
- **React Native Paper** - Material Design component library

**Purpose:**
- Three separate mobile applications for different user roles
- Independent deployment to App Store and Play Store
- Native mobile experience for each user type

**Architecture:**
Each mobile app is a **separate root-level project** for:
- Independent App Store / Play Store deployments
- Clean CI/CD pipelines
- Long-term scalability (Foodpanda / Grab-style architecture)
- No role-based conditionals - each app has its own codebase

#### 3.1 **pagana-mobile-customer** - Customer Mobile App

**Purpose:**
- Customer-facing mobile application
- Browse products/services
- Place orders
- Track deliveries
- Manage account and preferences

**Bundle Identifiers:**
- iOS: `com.pagana.customer`
- Android: `com.pagana.customer`

**Status:** ⚠️ Basic structure and UI toolkit configuration only

#### 3.2 **pagana-mobile-vendor** - Vendor Mobile App

**Purpose:**
- Vendor-facing mobile application
- Manage products/services
- Process orders
- Monitor sales and analytics
- Manage inventory

**Bundle Identifiers:**
- iOS: `com.pagana.vendor`
- Android: `com.pagana.vendor`

**Status:** ⚠️ Basic structure and UI toolkit configuration only

#### 3.3 **pagana-mobile-rider** - Rider Mobile App

**Purpose:**
- Rider/delivery driver mobile application
- Accept delivery requests
- Navigate to pickup and delivery locations
- Track earnings and statistics
- Manage availability

**Bundle Identifiers:**
- iOS: `com.pagana.rider`
- Android: `com.pagana.rider`

**Status:** ⚠️ Basic structure and UI toolkit configuration only

**Key Features (All Mobile Apps):**
- ✅ **UI Toolkit setup** - NativeWind + React Native Paper
- ✅ **Expo configuration** - Ready for development
- ✅ **Basic structure** - App.js and package.json placeholders
- ✅ **Separate projects** - Independent deployment and development

---

### 4. **pagana-admin** - Admin Portal Suite

**Technology Stack:**
- **React** - UI library
- **React Router v6** - Routing
- **TanStack Query (React Query)** - API state management
- **Tailwind CSS** - Styling
- **Shadcn UI / Headless UI** - Component library

**Purpose:**
- Administrative interfaces for system management
- Two separate portals for different admin roles

#### 4.1 **pagana-superadmin** - Full System Admin Portal

**Purpose:**
- Complete system administration
- User management, system configuration
- Full access to all administrative features

**Structure:**
```
pagana-admin/pagana-superadmin/
├── src/
│   ├── pages/            # Admin pages
│   ├── components/       # Admin components
│   ├── hooks/            # Custom hooks
│   └── styles/           # Styling
└── main.tsx              # Entry point
```

#### 4.2 **pagana-ops** - Operations Staff Portal

**Purpose:**
- Daily operations monitoring
- Staff actions and task management
- Limited administrative access

**Structure:**
```
pagana-admin/pagana-ops/
├── src/
│   ├── pages/            # Operations pages
│   ├── components/       # Operations components
│   ├── hooks/            # Custom hooks
│   └── styles/           # Styling
└── main.tsx              # Entry point
```

**Status:** ✅ Fully configured with React Router, React Query, and UI toolkit

---

## 🔐 Authentication & Routing

### Web Frontend (pagana-web)
- **Login/Registration pages** implemented
- **React Router v6** for client-side navigation
- Route protection and redirects configured
- Integration with backend authentication API

### Mobile Apps (pagana-mobile-customer, pagana-mobile-vendor, pagana-mobile-rider)
- Each app has its own authentication flow structure
- API integration ready
- Separate app configurations and bundle identifiers

### Admin Portals
- Separate authentication for admin portals
- Role-based routing (superadmin vs ops)
- React Router setup for internal navigation

---

## 🎨 UI Toolkit Integration

### Frontend Web (pagana-web)
- **Tailwind CSS** - Fully configured with `tailwind.config.js`
- **Shadcn UI** - Component library integrated
- **Vite** - Build tool with Tailwind PostCSS integration
- Modern, responsive design ready

### Mobile Apps (pagana-mobile-customer, pagana-mobile-vendor, pagana-mobile-rider)
- **NativeWind** - Tailwind-like styling for React Native
- **React Native Paper** - Prebuilt Material Design components
- Consistent design system across all mobile apps
- Each app configured independently

### Admin Portals
- **Tailwind CSS** - Consistent styling
- **Shadcn UI / Headless UI** - Professional admin components
- Unified design language across admin interfaces

---

## 📊 State Management

### Frontend Web & Admin Portals
- **TanStack Query (React Query)** - Primary state management
- Server state synchronization
- Caching and background updates
- Optimistic updates support
- API integration hooks

**Key Features:**
- Query and mutation hooks
- Loading and error states
- Cache management
- API client setup

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ (for frontend, mobile, and admin)
- **Python** 3.10+ (for backend)
- **npm** or **yarn** package manager
- **Expo CLI** (for mobile development)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd pagana
   ```

2. **Backend (pagana-api):**
   ```bash
   cd pagana-api
   # Placeholder structure - full setup instructions to be added
   ```

3. **Web Frontend (pagana-web):**
   ```bash
   cd pagana-web
   npm install
   npm run dev
   ```

4. **Mobile Apps:**
   ```bash
   # Customer App
   cd pagana-mobile-customer
   npm install
   npx expo start
   
   # Vendor App
   cd pagana-mobile-vendor
   npm install
   npx expo start
   
   # Rider App
   cd pagana-mobile-rider
   npm install
   npx expo start
   ```

5. **Admin Portals (pagana-admin):**
   ```bash
   cd pagana-admin/pagana-superadmin
   npm install
   npm run dev
   
   # or for ops portal:
   cd pagana-admin/pagana-ops
   npm install
   npm run dev
   ```

---

## 📁 Key Configuration Files

### Frontend Web (pagana-web)
- `vite.config.ts` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

### Mobile Apps (pagana-mobile-customer, pagana-mobile-vendor, pagana-mobile-rider)
- `package.json` - Dependencies (NativeWind, React Native Paper)
- `app.json` - Expo configuration (unique bundle identifiers)
- `tailwind.config.js` - NativeWind configuration
- Each app has independent configuration

### Admin Portals
- `vite.config.ts` / `webpack.config.js` - Build configuration
- `tailwind.config.js` - Tailwind CSS configuration
- React Router configuration files

---

## 🔄 Development Workflow

1. **Backend API** - Develop REST endpoints in `pagana-api`
2. **Web Frontend** - Build user interface in `pagana-web` using React Query for API calls
3. **Mobile Apps** - Develop mobile experiences in `pagana-mobile-customer`, `pagana-mobile-vendor`, `pagana-mobile-rider`
4. **Admin Portals** - Manage administrative interfaces in `pagana-admin`

All platforms connect to the same backend API (`pagana-api`).

---

## 📝 Notes

- **Frontend (pagana-web)** and **Admin Portals** are **fully configured** with React Query, UI toolkits, and routing
- **Backend (pagana-api)** and **Mobile Apps** are **placeholder structures** for architecture visualization
- Each component can be developed independently
- Shared API contract ensures consistency across platforms
- **Mobile apps are separate root-level projects** for independent deployment and scalability

---

## 🛠️ Technology Summary

| Component | Framework | State Management | UI Toolkit | Status |
|-----------|-----------|------------------|------------|--------|
| Backend | Django + DRF | - | - | ⚠️ Placeholder |
| Web Frontend | React + Vite + TS | React Query | Tailwind + Shadcn UI | ✅ Configured |
| Mobile (Customer) | React Native + Expo | - | NativeWind + RN Paper | ⚠️ Structure Only |
| Mobile (Vendor) | React Native + Expo | - | NativeWind + RN Paper | ⚠️ Structure Only |
| Mobile (Rider) | React Native + Expo | - | NativeWind + RN Paper | ⚠️ Structure Only |
| Admin (Superadmin) | React | React Query | Tailwind + Shadcn UI | ✅ Configured |
| Admin (Ops) | React | React Query | Tailwind + Shadcn UI | ✅ Configured |

---

## 📄 License

N/A

## 👥 Contributors

N/A
