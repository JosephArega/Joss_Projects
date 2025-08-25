# Task Management and Asset Tracking System

A comprehensive web-based Task Management and Asset Tracking System built with Flask, featuring role-based access control, reporting, and analytics.

## 🌟 Features

### User Management & Authentication
- **Role-based Access Control**: Super Admin, Manager, Supervisor, Member
- **Secure Login**: Password encryption with bcrypt
- **User Management**: Create and manage users based on role permissions

### Task Management
- ✅ Create, assign, and track tasks
- 📅 Due date management with overdue detection
- 🎯 Priority levels (High, Medium, Low)
- 📊 Status tracking (Pending, Completed, Overdue)
- 👥 Task assignment capabilities

### Deployment Management
- 🚀 Track deployments across environments
- 📍 Environment management (Production, Staging, Development)
- 📋 Status tracking (Successful, Pending, Failed)
- 💾 Backup location tracking
- 🔖 Version management

### Incident & RCA Management
- 🚨 Incident reporting and tracking
- 🔍 Root Cause Analysis (RCA) documentation
- ⚠️ Severity levels (Critical, High, Medium, Low)
- 🔄 Status workflow (Open, In Progress, Resolved, Closed)
- 📝 Corrective and preventive actions tracking

### Asset Management
- 🖥️ Comprehensive asset registration
- 📊 Asset classification (Criticality, Sensitivity)
- 💰 Asset valuation and rating
- 🔒 Security requirements tracking
- 📈 Complete asset lifecycle management

### Search & Reporting
- 🔍 Global search across all modules
- 📊 Interactive analytics with charts
- 📄 CSV and PDF export capabilities
- 📈 Real-time dashboard statistics
- 📅 Date range filtering

### UI/UX Features
- 📱 Responsive design (mobile and desktop)
- 🎨 Modern Bootstrap-based interface
- 🔄 Real-time updates and notifications
- 📊 Interactive charts and visualizations

## 🛠️ Technology Stack

- **Backend**: Flask (Python)
- **Database**: SQLite (easily configurable for PostgreSQL/MySQL)
- **Frontend**: Bootstrap 5, HTML5, CSS3, JavaScript
- **Authentication**: Flask-Login with bcrypt
- **Forms**: Flask-WTF with WTForms
- **Visualization**: Matplotlib, Seaborn
- **Reports**: ReportLab (PDF), CSV export
- **Data Processing**: Pandas

## 📋 Requirements

- Python 3.8+
- Virtual environment (recommended)
- Modern web browser

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd task-management-system
```

### 2. Set up Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements_simple.txt
```

### 4. Run the Application
```bash
python main.py
```

### 5. Access the Application
Open your browser and navigate to: `http://localhost:5000`

**Default Super Admin Credentials:**
- Username: `superadmin`
- Password: `admin123`

## 📁 Project Structure

```
task-management-system/
├── main.py                 # Main application file
├── templates/              # HTML templates
│   ├── base.html          # Base template
│   ├── login.html         # Login page
│   ├── dashboard.html     # Dashboard
│   ├── tasks.html         # Task management
│   ├── deployments.html   # Deployment management
│   ├── incidents.html     # Incident management
│   ├── assets.html        # Asset management
│   ├── reports.html       # Reports and analytics
│   └── ...
├── static/                 # Static files
│   ├── css/
│   │   └── style.css      # Custom styles
│   └── js/
│       └── script.js      # Custom JavaScript
├── requirements_simple.txt # Python dependencies
└── README.md              # This file
```

## 👥 User Roles & Permissions

### Super Admin
- 🔧 Create Managers and Supervisors
- 👁️ Full system access
- 📊 All data visibility

### Manager & Supervisor
- 👥 Manage users (create Members)
- 📋 Assign tasks to others
- 📊 View all reports
- ➕ Add tasks/deployments/incidents/RCA/assets
- 📈 Full dashboard access

### Member
- 👁️ View only assigned tasks and own items
- ➕ Add tasks/deployments/incidents/RCA/assets
- 📊 Limited dashboard (own data only)
- 🔍 Search within accessible data

## 🗄️ Database Schema

The system uses SQLAlchemy ORM with the following main models:

- **User**: Authentication and role management
- **Task**: Task management with assignments
- **Deployment**: Deployment tracking
- **Incident**: Incident and RCA management  
- **Asset**: Comprehensive asset management

## 📊 Reports & Analytics

### Available Reports
- 📋 Task completion and priority analysis
- 🚀 Deployment success rate tracking
- 🚨 Incident severity and resolution metrics
- 💻 Asset inventory and criticality overview
- 📈 Combined analytics dashboard

### Export Options
- 📄 **CSV Export**: Raw data for further analysis
- 📑 **PDF Export**: Professional formatted reports
- 📊 **Interactive Charts**: Real-time visualizations

## 🔧 Configuration

### Environment Variables
Create a `.env` file for production configuration:

```env
SECRET_KEY=your-super-secret-key-here
DATABASE_URL=sqlite:///task_management.db
FLASK_ENV=production
```

### Database Configuration
For production, modify the database URI in `main.py`:

```python
# For PostgreSQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:password@localhost/dbname'

# For MySQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://user:password@localhost/dbname'
```

## 🛡️ Security Features

- 🔐 Password hashing with bcrypt
- 🔒 Role-based access control
- 🛡️ CSRF protection with Flask-WTF
- 🔑 Session management with Flask-Login
- ✅ Input validation and sanitization

## 🚀 Deployment

### Development
```bash
python main.py
```

### Production
1. Set environment variables
2. Use a production WSGI server (gunicorn recommended)
3. Configure reverse proxy (nginx)
4. Set up database backups
5. Enable SSL/HTTPS

### Docker Deployment
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements_simple.txt
EXPOSE 5000
CMD ["python", "main.py"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all dependencies are installed in the virtual environment
2. **Database Issues**: Delete `task_management.db` to reset the database
3. **Port Conflicts**: Change the port in `main.py` if 5000 is occupied
4. **Template Errors**: Ensure all template files are in the `templates/` directory

### Support

For issues and questions:
1. Check the troubleshooting section
2. Review the application logs
3. Ensure all dependencies are correctly installed
4. Verify Python version compatibility (3.8+)

## 🎯 Future Enhancements

- 📧 Email notifications
- 📱 Mobile application
- 🔄 API endpoints for external integrations
- 📊 Advanced analytics and dashboards
- 🔐 Single Sign-On (SSO) integration
- 📋 Workflow automation
- 📆 Calendar integration
- 💬 Comment system for tasks and incidents

---

**Built with ❤️ using Flask and modern web technologies**