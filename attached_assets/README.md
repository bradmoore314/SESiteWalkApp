# SE Checklist Application - README

## Overview
This application is a modern web-based replacement for the SE Checklist Excel spreadsheet. It provides a comprehensive system for managing security engineering projects, including card access points, cameras, and generating reports.

## Features
- User authentication and authorization
- Project management with detailed configuration options
- Card access point tracking and management
- Camera system planning and documentation
- Automated report generation (door schedules, camera schedules)
- CSV export functionality
- Responsive design for desktop and mobile use

## Technology Stack
- **Frontend**: React, Material-UI, Context API for state management
- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)

## Installation

### Prerequisites
- Node.js (v14+)
- MongoDB (v4+)
- npm or yarn

### Setup
1. Clone the repository
```
git clone https://github.com/yourusername/se-checklist-app.git
cd se-checklist-app
```

2. Install dependencies
```
npm install
cd frontend
npm install
cd ..
```

3. Configure environment variables
Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/se-checklist-app
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

4. Run the application in development mode
```
npm run dev
```

This will start both the backend server (port 5000) and the frontend development server (port 3000).

## Deployment
For production deployment, you can use the included deployment script:
```
./deploy.sh
```

The script will:
- Check for MongoDB installation and install if needed
- Install all dependencies
- Build the frontend
- Start the application in development mode
- Provide instructions for production deployment

### Manual Deployment
1. Build the frontend
```
cd frontend
npm run build
cd ..
```

2. Set NODE_ENV to production in your .env file
```
NODE_ENV=production
```

3. Start the server
```
npm start
```

### Deploying to Heroku
1. Create a Heroku account if you don't have one
2. Install Heroku CLI
3. Login to Heroku: `heroku login`
4. Create a new Heroku app: `heroku create se-checklist-app`
5. Add MongoDB addon: `heroku addons:create mongodb`
6. Set environment variables: `heroku config:set JWT_SECRET=your_jwt_secret`
7. Deploy to Heroku: `git push heroku main`

## Application Structure

### Backend
- `server.js` - Main Express application
- `bin/www` - Server startup script
- `config/` - Configuration files
- `models/` - Mongoose models
- `routes/` - API routes
- `controllers/` - Route controllers
- `middleware/` - Custom middleware

### Frontend
- `src/index.js` - Application entry point
- `src/App.js` - Main component with routing
- `src/components/` - Reusable UI components
- `src/pages/` - Page components
- `src/context/` - React Context providers
- `src/services/` - API service layer
- `src/utils/` - Utility functions

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `GET /api/auth/user` - Get current user

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get a specific project
- `POST /api/projects` - Create a new project
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

### Access Points
- `GET /api/access-points` - Get all access points
- `GET /api/access-points/project/:projectId` - Get access points for a project
- `GET /api/access-points/:id` - Get a specific access point
- `POST /api/access-points` - Create a new access point
- `PUT /api/access-points/:id` - Update an access point
- `DELETE /api/access-points/:id` - Delete an access point

### Cameras
- `GET /api/cameras` - Get all cameras
- `GET /api/cameras/project/:projectId` - Get cameras for a project
- `GET /api/cameras/:id` - Get a specific camera
- `POST /api/cameras` - Create a new camera
- `PUT /api/cameras/:id` - Update a camera
- `DELETE /api/cameras/:id` - Delete a camera

### Lookup Data
- `GET /api/lookup/door-types` - Get door types
- `GET /api/lookup/reader-types` - Get reader types
- `GET /api/lookup/camera-types` - Get camera types
- `GET /api/lookup/elevator-types` - Get elevator types
- `GET /api/lookup/intercom-types` - Get intercom types

### Reports
- `GET /api/reports/door-schedule/:projectId` - Get door schedule
- `GET /api/reports/camera-schedule/:projectId` - Get camera schedule
- `GET /api/reports/project-summary/:projectId` - Get project summary

## License
MIT
