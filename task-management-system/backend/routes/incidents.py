from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models import Incident, User
from datetime import datetime

incidents_bp = Blueprint('incidents', __name__)

def check_permission(current_user_role, required_roles):
    return current_user_role in required_roles

@incidents_bp.route('/', methods=['GET'])
@jwt_required()
def get_incidents():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Members can only see their assigned or created incidents
        if current_user.role == 'member':
            incidents = Incident.query.filter(
                (Incident.assigned_to == current_user_id) | 
                (Incident.created_by == current_user_id)
            ).all()
        else:
            incidents = Incident.query.all()
        
        return jsonify({'incidents': [incident.to_dict() for incident in incidents]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@incidents_bp.route('/', methods=['POST'])
@jwt_required()
def create_incident():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Incident name is required'}), 400
        if not data.get('description'):
            return jsonify({'error': 'Incident description is required'}), 400
        
        # Parse incident_date if provided
        incident_date = datetime.utcnow()
        if data.get('incident_date'):
            try:
                incident_date = datetime.fromisoformat(data['incident_date'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid incident_date format'}), 400
        
        new_incident = Incident(
            name=data.get('name'),
            description=data.get('description'),
            severity=data.get('severity', 'medium'),
            incident_date=incident_date,
            created_by=current_user_id,
            assigned_to=data.get('assigned_to')
        )
        
        # Only managers/supervisors can assign to others
        if data.get('assigned_to') and data.get('assigned_to') != current_user_id:
            if not check_permission(current_user.role, ['manager', 'supervisor']):
                return jsonify({'error': 'Only managers/supervisors can assign incidents to others'}), 403
        
        db.session.add(new_incident)
        db.session.commit()
        
        return jsonify({
            'message': 'Incident created successfully',
            'incident': new_incident.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@incidents_bp.route('/<int:incident_id>', methods=['GET'])
@jwt_required()
def get_incident(incident_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        incident = Incident.query.get(incident_id)
        if not incident:
            return jsonify({'error': 'Incident not found'}), 404
        
        # Members can only view their incidents
        if current_user.role == 'member' and incident.assigned_to != current_user_id and incident.created_by != current_user_id:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        return jsonify({'incident': incident.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@incidents_bp.route('/<int:incident_id>', methods=['PUT'])
@jwt_required()
def update_incident(incident_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        incident = Incident.query.get(incident_id)
        if not incident:
            return jsonify({'error': 'Incident not found'}), 404
        
        # Permission checks
        can_edit = (
            check_permission(current_user.role, ['manager', 'supervisor']) or
            incident.created_by == current_user_id or
            incident.assigned_to == current_user_id
        )
        
        if not can_edit:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            incident.name = data['name']
        if 'description' in data:
            incident.description = data['description']
        if 'severity' in data:
            incident.severity = data['severity']
        if 'status' in data:
            incident.status = data['status']
            if data['status'] in ['resolved', 'closed']:
                incident.resolved_at = datetime.utcnow()
            else:
                incident.resolved_at = None
        
        if 'incident_date' in data:
            if data['incident_date']:
                try:
                    incident.incident_date = datetime.fromisoformat(data['incident_date'].replace('Z', '+00:00'))
                except ValueError:
                    return jsonify({'error': 'Invalid incident_date format'}), 400
        
        # Only managers/supervisors can reassign incidents
        if 'assigned_to' in data and check_permission(current_user.role, ['manager', 'supervisor']):
            incident.assigned_to = data['assigned_to']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Incident updated successfully',
            'incident': incident.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@incidents_bp.route('/<int:incident_id>', methods=['DELETE'])
@jwt_required()
def delete_incident(incident_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        incident = Incident.query.get(incident_id)
        if not incident:
            return jsonify({'error': 'Incident not found'}), 404
        
        # Only creators or managers/supervisors can delete
        if incident.created_by != current_user_id and not check_permission(current_user.role, ['manager', 'supervisor']):
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        db.session.delete(incident)
        db.session.commit()
        
        return jsonify({'message': 'Incident deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500