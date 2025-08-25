from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

# Import db from run to avoid circular imports
def get_db():
    from run import db
    return db

db = get_db()

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