from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models import RCA, Incident, User

rca_bp = Blueprint('rca', __name__)

def check_permission(current_user_role, required_roles):
    return current_user_role in required_roles

@rca_bp.route('/', methods=['GET'])
@jwt_required()
def get_rcas():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Members can only see their assigned RCAs
        if current_user.role == 'member':
            rcas = RCA.query.filter_by(assigned_to=current_user_id).all()
        else:
            rcas = RCA.query.all()
        
        return jsonify({'rcas': [rca.to_dict() for rca in rcas]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rca_bp.route('/', methods=['POST'])
@jwt_required()
def create_rca():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        data = request.get_json()
        
        # Validate required fields
        if not data.get('incident_id'):
            return jsonify({'error': 'Incident ID is required'}), 400
        if not data.get('root_cause'):
            return jsonify({'error': 'Root cause is required'}), 400
        
        # Check if incident exists
        incident = Incident.query.get(data['incident_id'])
        if not incident:
            return jsonify({'error': 'Incident not found'}), 404
        
        # Check if RCA already exists for this incident
        existing_rca = RCA.query.filter_by(incident_id=data['incident_id']).first()
        if existing_rca:
            return jsonify({'error': 'RCA already exists for this incident'}), 400
        
        new_rca = RCA(
            incident_id=data.get('incident_id'),
            root_cause=data.get('root_cause'),
            corrective_actions=data.get('corrective_actions'),
            preventive_actions=data.get('preventive_actions'),
            assigned_to=data.get('assigned_to', current_user_id)
        )
        
        # Only managers/supervisors can assign to others
        if data.get('assigned_to') and data.get('assigned_to') != current_user_id:
            if not check_permission(current_user.role, ['manager', 'supervisor']):
                return jsonify({'error': 'Only managers/supervisors can assign RCAs to others'}), 403
        
        db.session.add(new_rca)
        db.session.commit()
        
        return jsonify({
            'message': 'RCA created successfully',
            'rca': new_rca.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rca_bp.route('/<int:rca_id>', methods=['GET'])
@jwt_required()
def get_rca(rca_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        rca = RCA.query.get(rca_id)
        if not rca:
            return jsonify({'error': 'RCA not found'}), 404
        
        # Members can only view their RCAs
        if current_user.role == 'member' and rca.assigned_to != current_user_id:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        return jsonify({'rca': rca.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rca_bp.route('/<int:rca_id>', methods=['PUT'])
@jwt_required()
def update_rca(rca_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        rca = RCA.query.get(rca_id)
        if not rca:
            return jsonify({'error': 'RCA not found'}), 404
        
        # Permission checks
        can_edit = (
            check_permission(current_user.role, ['manager', 'supervisor']) or
            rca.assigned_to == current_user_id
        )
        
        if not can_edit:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        data = request.get_json()
        
        # Update fields
        if 'root_cause' in data:
            rca.root_cause = data['root_cause']
        if 'corrective_actions' in data:
            rca.corrective_actions = data['corrective_actions']
        if 'preventive_actions' in data:
            rca.preventive_actions = data['preventive_actions']
        if 'status' in data:
            rca.status = data['status']
        
        # Only managers/supervisors can reassign RCAs
        if 'assigned_to' in data and check_permission(current_user.role, ['manager', 'supervisor']):
            rca.assigned_to = data['assigned_to']
        
        db.session.commit()
        
        return jsonify({
            'message': 'RCA updated successfully',
            'rca': rca.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rca_bp.route('/<int:rca_id>', methods=['DELETE'])
@jwt_required()
def delete_rca(rca_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        rca = RCA.query.get(rca_id)
        if not rca:
            return jsonify({'error': 'RCA not found'}), 404
        
        # Only assigned user or managers/supervisors can delete
        if rca.assigned_to != current_user_id and not check_permission(current_user.role, ['manager', 'supervisor']):
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        db.session.delete(rca)
        db.session.commit()
        
        return jsonify({'message': 'RCA deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rca_bp.route('/by-incident/<int:incident_id>', methods=['GET'])
@jwt_required()
def get_rca_by_incident(incident_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        rca = RCA.query.filter_by(incident_id=incident_id).first()
        if not rca:
            return jsonify({'error': 'RCA not found for this incident'}), 404
        
        # Members can only view their RCAs
        if current_user.role == 'member' and rca.assigned_to != current_user_id:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        return jsonify({'rca': rca.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500