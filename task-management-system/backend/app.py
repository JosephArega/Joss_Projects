from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from database import db, bcrypt

load_dotenv()

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///task_management.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-string')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Initialize extensions
db.init_app(app)
jwt = JWTManager(app)
bcrypt.init_app(app)
CORS(app)

# Import models
from models import User, Task, Deployment, Incident, RCA, Asset

# Import routes
from routes.auth import auth_bp
from routes.users import users_bp
from routes.tasks import tasks_bp
from routes.deployments import deployments_bp
from routes.incidents import incidents_bp
from routes.rca import rca_bp
from routes.assets import assets_bp
from routes.simple_reports import reports_bp
from routes.search import search_bp

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(tasks_bp, url_prefix='/api/tasks')
app.register_blueprint(deployments_bp, url_prefix='/api/deployments')
app.register_blueprint(incidents_bp, url_prefix='/api/incidents')
app.register_blueprint(rca_bp, url_prefix='/api/rca')
app.register_blueprint(assets_bp, url_prefix='/api/assets')
app.register_blueprint(reports_bp, url_prefix='/api/reports')
app.register_blueprint(search_bp, url_prefix='/api/search')

@app.route('/api/health')
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

def create_tables():
    with app.app_context():
        db.create_all()
        
        # Create super admin if no users exist
        if not User.query.first():
            super_admin = User(
                username='superadmin',
                email='admin@company.com',
                role='super_admin',
                is_active=True
            )
            super_admin.set_password('SuperAdmin123!')
            db.session.add(super_admin)
            db.session.commit()
            print("Super Admin created - Username: superadmin, Password: SuperAdmin123!")

if __name__ == '__main__':
    create_tables()
    app.run(debug=True, host='0.0.0.0', port=5000)