from datetime import datetime
from decimal import Decimal
from database import db, bcrypt
from sqlalchemy import Numeric

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.Enum('super_admin', 'manager', 'supervisor', 'member', name='user_roles'), nullable=False)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Relationships
    created_tasks = db.relationship('Task', foreign_keys='Task.created_by', backref='creator', lazy='dynamic')
    assigned_tasks = db.relationship('Task', foreign_keys='Task.assigned_to', backref='assignee', lazy='dynamic')
    deployments = db.relationship('Deployment', backref='deployer', lazy='dynamic')
    incidents = db.relationship('Incident', foreign_keys='Incident.assigned_to', backref='assigned_user', lazy='dynamic')
    created_incidents = db.relationship('Incident', foreign_keys='Incident.created_by', backref='incident_creator', lazy='dynamic')
    rcas = db.relationship('RCA', backref='rca_assignee', lazy='dynamic')
    assets = db.relationship('Asset', backref='asset_owner', lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

class Task(db.Model):
    __tablename__ = 'tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    priority = db.Column(db.Enum('low', 'medium', 'high', 'critical', name='task_priority'), default='medium')
    status = db.Column(db.Enum('pending', 'in_progress', 'completed', 'overdue', name='task_status'), default='pending')
    due_date = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'priority': self.priority,
            'status': self.status,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat(),
            'created_by': self.creator.username if self.creator else None,
            'assigned_to': self.assignee.username if self.assignee else None
        }

class Deployment(db.Model):
    __tablename__ = 'deployments'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.Enum('pending', 'successful', 'failed', name='deployment_status'), default='pending')
    deployment_date = db.Column(db.DateTime, default=datetime.utcnow)
    backup_location = db.Column(db.String(500))
    deployed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'status': self.status,
            'deployment_date': self.deployment_date.isoformat(),
            'backup_location': self.backup_location,
            'deployed_by': self.deployer.username if self.deployer else None,
            'created_at': self.created_at.isoformat()
        }

class Incident(db.Model):
    __tablename__ = 'incidents'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    severity = db.Column(db.Enum('low', 'medium', 'high', 'critical', name='incident_severity'), default='medium')
    status = db.Column(db.Enum('open', 'investigating', 'resolved', 'closed', name='incident_status'), default='open')
    incident_date = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'severity': self.severity,
            'status': self.status,
            'incident_date': self.incident_date.isoformat(),
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'created_at': self.created_at.isoformat(),
            'created_by': self.incident_creator.username if self.incident_creator else None,
            'assigned_to': self.assigned_user.username if self.assigned_user else None
        }

class RCA(db.Model):
    __tablename__ = 'rca'
    
    id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, db.ForeignKey('incidents.id'), nullable=False)
    root_cause = db.Column(db.Text, nullable=False)
    corrective_actions = db.Column(db.Text)
    preventive_actions = db.Column(db.Text)
    status = db.Column(db.Enum('draft', 'under_review', 'approved', 'implemented', name='rca_status'), default='draft')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    incident = db.relationship('Incident', backref='rca_analysis')
    
    def to_dict(self):
        return {
            'id': self.id,
            'incident_id': self.incident_id,
            'incident_name': self.incident.name if self.incident else None,
            'root_cause': self.root_cause,
            'corrective_actions': self.corrective_actions,
            'preventive_actions': self.preventive_actions,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'assigned_to': self.rca_assignee.username if self.rca_assignee else None
        }

class Asset(db.Model):
    __tablename__ = 'assets'
    
    id = db.Column(db.Integer, primary_key=True)
    server_name = db.Column(db.String(100), nullable=False)
    asset_id = db.Column(db.String(50), unique=True, nullable=False)
    serial_number = db.Column(db.String(50))
    ip_address = db.Column(db.String(15))
    rack_number = db.Column(db.String(20))
    slot_number = db.Column(db.String(20))
    host_name = db.Column(db.String(100))
    operating_system = db.Column(db.String(100))
    service_packs = db.Column(db.Text)
    software_details = db.Column(db.Text)
    business_requirements = db.Column(db.Text)
    technical_contact = db.Column(db.String(100))
    vendor = db.Column(db.String(100))
    make_model = db.Column(db.String(100))
    cpu = db.Column(db.String(100))
    ram = db.Column(db.String(50))
    hdd = db.Column(db.String(100))
    purpose = db.Column(db.Text)
    asset_type = db.Column(db.String(50))
    dependency = db.Column(db.Text)
    redundancy_requirements = db.Column(db.Text)
    stored_information = db.Column(db.Text)
    backup_schedule = db.Column(db.String(100))
    confidentiality_req = db.Column(db.String(20))
    integrity_req = db.Column(db.String(20))
    availability_req = db.Column(db.String(20))
    asset_value = db.Column(Numeric(10, 2))
    asset_value_rating = db.Column(db.Enum('low', 'medium', 'high', 'critical', name='asset_value_rating'))
    classification = db.Column(db.String(50))
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    custodian = db.Column(db.String(100))
    users = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'server_name': self.server_name,
            'asset_id': self.asset_id,
            'serial_number': self.serial_number,
            'ip_address': self.ip_address,
            'rack_number': self.rack_number,
            'slot_number': self.slot_number,
            'host_name': self.host_name,
            'operating_system': self.operating_system,
            'service_packs': self.service_packs,
            'software_details': self.software_details,
            'business_requirements': self.business_requirements,
            'technical_contact': self.technical_contact,
            'vendor': self.vendor,
            'make_model': self.make_model,
            'cpu': self.cpu,
            'ram': self.ram,
            'hdd': self.hdd,
            'purpose': self.purpose,
            'asset_type': self.asset_type,
            'dependency': self.dependency,
            'redundancy_requirements': self.redundancy_requirements,
            'stored_information': self.stored_information,
            'backup_schedule': self.backup_schedule,
            'confidentiality_req': self.confidentiality_req,
            'integrity_req': self.integrity_req,
            'availability_req': self.availability_req,
            'asset_value': float(self.asset_value) if self.asset_value else None,
            'asset_value_rating': self.asset_value_rating,
            'classification': self.classification,
            'owner': self.asset_owner.username if self.asset_owner else None,
            'custodian': self.custodian,
            'users': self.users,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }