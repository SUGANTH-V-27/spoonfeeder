# Spoon - Learning Management System

A full-stack learning management system built with React, TypeScript, Node.js, and PostgreSQL.

## Deployment

### Frontend (Vercel)

1. **Build Setup**: The frontend is configured for Vite with TypeScript
2. **Deploy**: Connect your GitHub repository to Vercel
3. **Environment Variables**:
   - `VITE_API_BASE`: Your backend API URL (e.g., `https://your-render-app.onrender.com/api`)

### Backend (Render)

1. **Build Setup**: The backend is configured with TypeScript compilation
2. **Deploy**: Connect your GitHub repository to Render and select Node.js
3. **Environment Variables**:
   ```
   DB_HOST=your_postgresql_host
   DB_PORT=5432
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   PORT=5000
   ```
4. **Build Command**: `npm run build`
5. **Start Command**: `npm start`

### Database Setup

1. Create a PostgreSQL database (Render, Supabase, or any PostgreSQL provider)
2. Run the schema.sql and seed.sql files from `backend/src/db/` to set up your database

### Supabase Setup

1. Create a Supabase project
2. Get your project URL and service role key from the API settings
3. Configure the environment variables as shown above

## Development

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- Supabase account

### Installation

1. **Backend**:
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Configure your environment variables
   npm run dev
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Build Commands

- **Frontend**: `npm run build`
- **Backend**: `npm run build` then `npm start`

## Features

- User authentication and authorization
- Course and topic management
- Video content integration
- Resource management (PDFs,documents, presentations)
- Practice questions and answers
- Admin panel for content management
- Responsive design with multiple view modes
