from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models import Deployment, User
from datetime import datetime

deployments_bp = Blueprint('deployments', __name__)

def check_permission(current_user_role, required_roles):
    return current_user_role in required_roles

@deployments_bp.route('/', methods=['GET'])
@jwt_required()
def get_deployments():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Members can only see their deployments
        if current_user.role == 'member':
            deployments = Deployment.query.filter_by(deployed_by=current_user_id).all()
        else:
            deployments = Deployment.query.all()
        
        return jsonify({'deployments': [deployment.to_dict() for deployment in deployments]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@deployments_bp.route('/', methods=['POST'])
@jwt_required()
def create_deployment():
    try:
        current_user_id = get_jwt_identity()
        
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Deployment name is required'}), 400
        
        # Parse deployment_date if provided
        deployment_date = datetime.utcnow()
        if data.get('deployment_date'):
            try:
                deployment_date = datetime.fromisoformat(data['deployment_date'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid deployment_date format'}), 400
        
        new_deployment = Deployment(
            name=data.get('name'),
            description=data.get('description'),
            status=data.get('status', 'pending'),
            deployment_date=deployment_date,
            backup_location=data.get('backup_location'),
            deployed_by=current_user_id
        )
        
        db.session.add(new_deployment)
        db.session.commit()
        
        return jsonify({
            'message': 'Deployment created successfully',
            'deployment': new_deployment.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@deployments_bp.route('/<int:deployment_id>', methods=['GET'])
@jwt_required()
def get_deployment(deployment_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        deployment = Deployment.query.get(deployment_id)
        if not deployment:
            return jsonify({'error': 'Deployment not found'}), 404
        
        # Members can only view their deployments
        if current_user.role == 'member' and deployment.deployed_by != current_user_id:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        return jsonify({'deployment': deployment.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@deployments_bp.route('/<int:deployment_id>', methods=['PUT'])
@jwt_required()
def update_deployment(deployment_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        deployment = Deployment.query.get(deployment_id)
        if not deployment:
            return jsonify({'error': 'Deployment not found'}), 404
        
        # Permission checks
        can_edit = (
            check_permission(current_user.role, ['manager', 'supervisor']) or
            deployment.deployed_by == current_user_id
        )
        
        if not can_edit:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            deployment.name = data['name']
        if 'description' in data:
            deployment.description = data['description']
        if 'status' in data:
            deployment.status = data['status']
        if 'backup_location' in data:
            deployment.backup_location = data['backup_location']
        
        if 'deployment_date' in data:
            if data['deployment_date']:
                try:
                    deployment.deployment_date = datetime.fromisoformat(data['deployment_date'].replace('Z', '+00:00'))
                except ValueError:
                    return jsonify({'error': 'Invalid deployment_date format'}), 400
        
        db.session.commit()
        
        return jsonify({
            'message': 'Deployment updated successfully',
            'deployment': deployment.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@deployments_bp.route('/<int:deployment_id>', methods=['DELETE'])
@jwt_required()
def delete_deployment(deployment_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        deployment = Deployment.query.get(deployment_id)
        if not deployment:
            return jsonify({'error': 'Deployment not found'}), 404
        
        # Only deployers or managers/supervisors can delete
        if deployment.deployed_by != current_user_id and not check_permission(current_user.role, ['manager', 'supervisor']):
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        db.session.delete(deployment)
        db.session.commit()
        
        return jsonify({'message': 'Deployment deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500