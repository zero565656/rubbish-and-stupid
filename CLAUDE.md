# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

R&S Journal Landing - an academic journal website built with Vite, React, TypeScript, and Supabase as the backend.

## Commands

```bash
npm run dev      # Start development server (http://localhost:5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
npm run test     # Run tests with Vitest
npm run test:watch  # Run tests in watch mode
```

## Architecture

### Tech Stack
- **Frontend**: Vite + React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn-ui components
- **State/Data**: TanStack React Query
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Routing**: React Router v6

### Database Tables (Supabase)
- `articles` - Published articles with title, author, DOI, pdf_url, tags
- `submissions` - Paper submissions with status (pending/approved/rejected)
- `journal_metadata` - Volume, issue, ISSN, hero section content
- `submission_rules` - Submission guidelines text
- `about_content` - About page content (slogan, purpose, introduction)

### Key Files
- [src/lib/supabase.ts](src/lib/supabase.ts) - Supabase client configuration
- [src/types/database.types.ts](src/types/database.types.ts) - TypeScript types for database tables
- [src/App.tsx](src/App.tsx) - Main routing configuration
- [src/pages/admin/Dashboard.tsx](src/pages/admin/Dashboard.tsx) - Admin panel for managing submissions

### Routes
- `/` - Home page with hero and article list
- `/submit` - Paper submission form
- `/about` - About the journal
- `/admin/login` - Editor login
- `/admin` - Admin dashboard (protected, requires auth)

### Authentication
Admin access is managed through Supabase Auth. The ProtectedRoute component checks authentication state. Admin credentials must be managed via Supabase Dashboard.

### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key

These are configured in `.env.local`.
