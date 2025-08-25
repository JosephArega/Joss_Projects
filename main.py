#!/usr/bin/env python3
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_file, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, date
import os
import csv
import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import base64
from io import BytesIO

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///task_management.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# ============ MODELS ============

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    role = db.Column(db.String(20), nullable=False)  # Super Admin, Manager, Supervisor, Member
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    
    # Relationships
    tasks_created = db.relationship('Task', backref='creator', lazy=True, foreign_keys='Task.created_by')
    tasks_assigned = db.relationship('Task', backref='assignee', lazy=True, foreign_keys='Task.assigned_to')
    deployments = db.relationship('Deployment', backref='deployer', lazy=True)
    incidents = db.relationship('Incident', backref='reporter', lazy=True)
    assets = db.relationship('Asset', backref='owner_user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def can_manage_users(self):
        return self.role in ['Super Admin', 'Manager', 'Supervisor']

    def can_assign_tasks(self):
        return self.role in ['Manager', 'Supervisor']

    def __repr__(self):
        return f'<User {self.username}>'

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    added_date = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime, nullable=False)
    priority = db.Column(db.String(20), nullable=False)  # High, Medium, Low
    status = db.Column(db.String(20), default='Pending')  # Pending, Completed, Overdue
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('user.id'))
    completed_date = db.Column(db.DateTime)

    def is_overdue(self):
        if self.status != 'Completed' and self.due_date < datetime.utcnow():
            return True
        return False

    def update_status(self):
        if self.status != 'Completed' and self.is_overdue():
            self.status = 'Overdue'

    def __repr__(self):
        return f'<Task {self.name}>'

class Deployment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='Pending')  # Successful, Pending, Failed
    deployed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    backup_location = db.Column(db.String(500))
    environment = db.Column(db.String(50))  # Production, Staging, Development
    version = db.Column(db.String(50))

    def __repr__(self):
        return f'<Deployment {self.name}>'

class Incident(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    severity = db.Column(db.String(20), nullable=False)  # Critical, High, Medium, Low
    status = db.Column(db.String(20), default='Open')  # Open, In Progress, Resolved, Closed
    reported_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('user.id'))
    resolution_date = db.Column(db.DateTime)
    
    # RCA fields
    rca_details = db.Column(db.Text)
    root_cause = db.Column(db.Text)
    corrective_actions = db.Column(db.Text)
    preventive_actions = db.Column(db.Text)

    def __repr__(self):
        return f'<Incident {self.name}>'

class Asset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    
    # Basic Information
    server_name = db.Column(db.String(100), nullable=False)
    asset_id = db.Column(db.String(50), unique=True, nullable=False)
    serial_number = db.Column(db.String(100))
    owner = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    custodian = db.Column(db.String(100))
    users = db.Column(db.Text)  # Comma separated user list
    
    # Technical Details
    ip_address = db.Column(db.String(45))  # IPv4 or IPv6
    rack_number = db.Column(db.String(20))
    slot_number = db.Column(db.String(20))
    host_name = db.Column(db.String(100))
    os = db.Column(db.String(100))
    service_packs_required = db.Column(db.Text)
    software_details = db.Column(db.Text)
    
    # Hardware Specifications
    vendor = db.Column(db.String(100))
    make_model = db.Column(db.String(100))
    cpu = db.Column(db.String(100))
    ram = db.Column(db.String(50))
    hdd = db.Column(db.String(100))
    
    # Business Information
    purpose_service_role = db.Column(db.Text)
    asset_type = db.Column(db.String(50))
    application_requirements = db.Column(db.Text)
    technical_contact = db.Column(db.String(100))
    dependency = db.Column(db.Text)
    
    # Classification
    criticality = db.Column(db.String(20))  # Critical, High, Medium, Low
    sensitivity = db.Column(db.String(20))  # Confidential, Internal, Public
    redundancy_requirements = db.Column(db.Text)
    stored_information_assets = db.Column(db.Text)
    
    # Security Requirements
    backup_schedule = db.Column(db.String(100))
    confidentiality_requirements = db.Column(db.String(20))  # High, Medium, Low
    integrity_requirements = db.Column(db.String(20))  # High, Medium, Low
    availability_requirements = db.Column(db.String(20))  # High, Medium, Low
    
    # Value Information
    value = db.Column(db.Float)
    asset_value_rating = db.Column(db.String(20))  # Very High, High, Medium, Low
    
    # Audit Information
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    updated_date = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Asset {self.server_name}>'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ============ ROUTES ============

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password', 'error')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    # Update task statuses
    tasks = Task.query.all()
    for task in tasks:
        task.update_status()
    db.session.commit()
    
    # Get dashboard data based on user role
    if current_user.role == 'Member':
        tasks = Task.query.filter_by(assigned_to=current_user.id).all()
        deployments = Deployment.query.filter_by(deployed_by=current_user.id).all()
        incidents = Incident.query.filter_by(reported_by=current_user.id).all()
        assets = Asset.query.filter_by(owner=current_user.id).all()
    else:
        tasks = Task.query.all()
        deployments = Deployment.query.all()
        incidents = Incident.query.all()
        assets = Asset.query.all()
    
    # Calculate statistics
    task_stats = {
        'total': len(tasks),
        'pending': len([t for t in tasks if t.status == 'Pending']),
        'completed': len([t for t in tasks if t.status == 'Completed']),
        'overdue': len([t for t in tasks if t.status == 'Overdue'])
    }
    
    deployment_stats = {
        'total': len(deployments),
        'successful': len([d for d in deployments if d.status == 'Successful']),
        'pending': len([d for d in deployments if d.status == 'Pending']),
        'failed': len([d for d in deployments if d.status == 'Failed'])
    }
    
    incident_stats = {
        'total': len(incidents),
        'open': len([i for i in incidents if i.status == 'Open']),
        'in_progress': len([i for i in incidents if i.status == 'In Progress']),
        'resolved': len([i for i in incidents if i.status == 'Resolved'])
    }
    
    asset_stats = {
        'total': len(assets),
        'critical': len([a for a in assets if a.criticality == 'Critical']),
        'high': len([a for a in assets if a.criticality == 'High']),
        'medium': len([a for a in assets if a.criticality == 'Medium'])
    }
    
    return render_template('dashboard.html', 
                         task_stats=task_stats,
                         deployment_stats=deployment_stats,
                         incident_stats=incident_stats,
                         asset_stats=asset_stats,
                         recent_tasks=tasks[:5],
                         recent_deployments=deployments[:5],
                         recent_incidents=incidents[:5])

# User Management Routes
@app.route('/users')
@login_required
def users():
    if not current_user.can_manage_users():
        flash('Access denied', 'error')
        return redirect(url_for('dashboard'))
    
    users = User.query.all()
    return render_template('users.html', users=users)

@app.route('/users/add', methods=['GET', 'POST'])
@login_required
def add_user():
    if not current_user.can_manage_users():
        flash('Access denied', 'error')
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        role = request.form['role']
        
        # Check role restrictions
        if current_user.role == 'Super Admin' and role not in ['Manager', 'Supervisor']:
            flash('Super Admin can only create Manager and Supervisor roles', 'error')
            return render_template('add_user.html')
        
        if User.query.filter_by(username=username).first():
            flash('Username already exists', 'error')
            return render_template('add_user.html')
        
        if User.query.filter_by(email=email).first():
            flash('Email already exists', 'error')
            return render_template('add_user.html')
        
        user = User(username=username, email=email, role=role, created_by=current_user.id)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        flash('User created successfully', 'success')
        return redirect(url_for('users'))
    
    return render_template('add_user.html')

# Task Management Routes
@app.route('/tasks')
@login_required
def tasks():
    if current_user.role == 'Member':
        tasks = Task.query.filter_by(assigned_to=current_user.id).all()
    else:
        tasks = Task.query.all()
    
    # Update task statuses
    for task in tasks:
        task.update_status()
    db.session.commit()
    
    return render_template('tasks.html', tasks=tasks)

@app.route('/tasks/add', methods=['GET', 'POST'])
@login_required
def add_task():
    if request.method == 'POST':
        name = request.form['name']
        description = request.form['description']
        due_date = datetime.strptime(request.form['due_date'], '%Y-%m-%d')
        priority = request.form['priority']
        assigned_to = request.form.get('assigned_to')
        
        if assigned_to == '':
            assigned_to = None
        
        task = Task(
            name=name,
            description=description,
            due_date=due_date,
            priority=priority,
            created_by=current_user.id,
            assigned_to=assigned_to
        )
        
        db.session.add(task)
        db.session.commit()
        
        flash('Task created successfully', 'success')
        return redirect(url_for('tasks'))
    
    users = User.query.all() if current_user.can_assign_tasks() else []
    return render_template('add_task.html', users=users)

@app.route('/tasks/<int:task_id>/complete', methods=['POST'])
@login_required
def complete_task(task_id):
    task = Task.query.get_or_404(task_id)
    
    if current_user.role == 'Member' and task.assigned_to != current_user.id:
        flash('Access denied', 'error')
        return redirect(url_for('tasks'))
    
    task.status = 'Completed'
    task.completed_date = datetime.utcnow()
    db.session.commit()
    
    flash('Task marked as completed', 'success')
    return redirect(url_for('tasks'))

# Continue with other routes in the same pattern...
# (Adding remaining routes for brevity, the same logic applies)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        
        # Create super admin if it doesn't exist
        if not User.query.filter_by(role='Super Admin').first():
            super_admin = User(
                username='superadmin',
                email='admin@example.com',
                role='Super Admin'
            )
            super_admin.set_password('admin123')
            db.session.add(super_admin)
            db.session.commit()
            print("Super Admin created with username: superadmin, password: admin123")
    
    print("Starting Task Management System...")
    print("Access the application at: http://localhost:5000")
    print("Default login: superadmin / admin123")
    app.run(debug=True, host='0.0.0.0', port=5000)