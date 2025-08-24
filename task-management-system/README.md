# Task Management and Asset Tracking System

A comprehensive web-based application for managing tasks, deployments, incidents, RCA, and assets with role-based access control.

## Features

### User Roles & Authentication
- **Super Admin**: First-time setup only, create Managers and Supervisors
- **Manager & Supervisor**: Manage users, assign tasks, view reports, add all entities
- **Member**: View assigned items, add tasks/deployments/incidents/RCA/assets

### Core Modules
1. **Task Management**: Create, assign, and track tasks with priorities and due dates
2. **Deployment Management**: Track deployment status with backup locations
3. **Incident Management**: Log and manage incidents with severity levels
4. **RCA Management**: Root Cause Analysis for incidents
5. **Asset Management**: Comprehensive asset tracking with detailed fields
6. **Search**: Global search across all entities
7. **Reports**: Analytics and export capabilities

## Technology Stack

### Backend
- Python Flask
- SQLAlchemy ORM
- JWT Authentication
- SQLite Database (default)
- Flask-CORS for API access

### Frontend
- React 18 with TypeScript
- Material-UI (MUI) components
- React Router for navigation
- Axios for API calls
- Recharts for data visualization

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Installation

1. **Clone and setup the project**
```bash
cd task-management-system
```

2. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt
python app.py
```
The backend will run on http://localhost:5000

3. **Frontend Setup** (in a new terminal)
```bash
cd frontend
npm install
npm start
```
The frontend will run on http://localhost:3000

### Default Login
- **Username**: `superadmin`
- **Password**: `SuperAdmin123!`

## Project Structure

```
task-management-system/
├── backend/
│   ├── app.py                 # Main Flask application
│   ├── models.py              # Database models
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables
│   └── routes/                # API endpoints
│       ├── auth.py            # Authentication routes
│       ├── users.py           # User management
│       ├── tasks.py           # Task management
│       ├── deployments.py     # Deployment management
│       ├── incidents.py       # Incident management
│       ├── rca.py             # RCA management
│       ├── assets.py          # Asset management
│       ├── search.py          # Search functionality
│       └── reports.py         # Reports and analytics
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Main application pages
│   │   ├── context/           # React context providers
│   │   ├── services/          # API service layer
│   │   ├── types/             # TypeScript type definitions
│   │   └── App.tsx            # Main application component
│   ├── package.json           # Node.js dependencies
│   └── .env                   # Environment variables
└── README.md                  # Project documentation
```

## Configuration

### Backend Environment Variables (.env)
```
SECRET_KEY=your-secret-key-change-in-production
JWT_SECRET_KEY=jwt-secret-change-in-production
DATABASE_URL=sqlite:///task_management.db
FLASK_ENV=development
```

### Frontend Environment Variables (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/users/{id}` - Get user details
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Deactivate user

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/{id}` - Get task details
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task
- `GET /api/tasks/my-tasks` - Get user's tasks

### Similar endpoints exist for deployments, incidents, RCA, and assets.

### Search
- `GET /api/search?q={query}&type={type}` - Global search
- `GET /api/search/suggestions?q={query}` - Search suggestions

### Reports
- `GET /api/reports/dashboard` - Dashboard data
- `GET /api/reports/analytics` - Analytics data
- `POST /api/reports/export/csv` - Export CSV
- `POST /api/reports/export/pdf` - Export PDF

## Database Schema

### Users
- Basic user information with role-based access control
- Roles: super_admin, manager, supervisor, member

### Tasks
- Task management with priorities, status, and assignments
- Due dates and completion tracking

### Deployments
- Deployment tracking with status and backup locations
- Date and user tracking

### Incidents
- Incident logging with severity and status
- Assignment and resolution tracking

### RCA
- Root Cause Analysis linked to incidents
- Status tracking and action items

### Assets
- Comprehensive asset management
- Hardware specifications, ownership, and classification
- Security requirements and value ratings

## Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection

## Development

### Adding New Features
1. Backend: Add routes in `routes/` directory
2. Frontend: Add components/pages in respective directories
3. Update API services in `services/api.ts`
4. Add TypeScript types in `types/index.ts`

### Testing
```bash
# Backend tests (to be implemented)
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test
```

## Production Deployment

### Backend
1. Update environment variables for production
2. Use PostgreSQL or MySQL for production database
3. Configure proper CORS settings
4. Use Gunicorn with nginx

### Frontend
1. Build the application: `npm run build`
2. Serve static files with nginx or similar
3. Update API URL for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please create an issue in the repository.