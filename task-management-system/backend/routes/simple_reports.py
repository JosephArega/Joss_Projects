from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models import Task, Deployment, Incident, RCA, Asset, User

reports_bp = Blueprint('reports', __name__)

def check_permission(current_user_role, required_roles):
    return current_user_role in required_roles

@reports_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        data = {}
        
        if current_user.role == 'member':
            # Member dashboard - only their data
            data['tasks'] = {
                'total': Task.query.filter((Task.assigned_to == current_user_id) | (Task.created_by == current_user_id)).count(),
                'pending': Task.query.filter((Task.assigned_to == current_user_id) | (Task.created_by == current_user_id), Task.status == 'pending').count(),
                'completed': Task.query.filter((Task.assigned_to == current_user_id) | (Task.created_by == current_user_id), Task.status == 'completed').count(),
                'overdue': Task.query.filter((Task.assigned_to == current_user_id) | (Task.created_by == current_user_id), Task.status == 'overdue').count()
            }
            
            data['deployments'] = {
                'total': Deployment.query.filter_by(deployed_by=current_user_id).count(),
                'successful': Deployment.query.filter_by(deployed_by=current_user_id, status='successful').count(),
                'pending': Deployment.query.filter_by(deployed_by=current_user_id, status='pending').count(),
                'failed': Deployment.query.filter_by(deployed_by=current_user_id, status='failed').count()
            }
            
            data['incidents'] = {
                'total': Incident.query.filter((Incident.assigned_to == current_user_id) | (Incident.created_by == current_user_id)).count(),
                'open': Incident.query.filter((Incident.assigned_to == current_user_id) | (Incident.created_by == current_user_id), Incident.status == 'open').count(),
                'resolved': Incident.query.filter((Incident.assigned_to == current_user_id) | (Incident.created_by == current_user_id), Incident.status == 'resolved').count()
            }
            
            data['assets'] = {
                'total': Asset.query.filter_by(owner_id=current_user_id).count()
            }
        else:
            # Manager/Supervisor dashboard - all data
            data['tasks'] = {
                'total': Task.query.count(),
                'pending': Task.query.filter_by(status='pending').count(),
                'completed': Task.query.filter_by(status='completed').count(),
                'overdue': Task.query.filter_by(status='overdue').count()
            }
            
            data['deployments'] = {
                'total': Deployment.query.count(),
                'successful': Deployment.query.filter_by(status='successful').count(),
                'pending': Deployment.query.filter_by(status='pending').count(),
                'failed': Deployment.query.filter_by(status='failed').count()
            }
            
            data['incidents'] = {
                'total': Incident.query.count(),
                'open': Incident.query.filter_by(status='open').count(),
                'investigating': Incident.query.filter_by(status='investigating').count(),
                'resolved': Incident.query.filter_by(status='resolved').count(),
                'closed': Incident.query.filter_by(status='closed').count()
            }
            
            data['rca'] = {
                'total': RCA.query.count(),
                'draft': RCA.query.filter_by(status='draft').count(),
                'approved': RCA.query.filter_by(status='approved').count(),
                'implemented': RCA.query.filter_by(status='implemented').count()
            }
            
            data['assets'] = {
                'total': Asset.query.count(),
                'by_type': {}
            }
        
        return jsonify({'dashboard': data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500