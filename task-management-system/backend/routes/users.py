from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models import User
from datetime import datetime

users_bp = Blueprint('users', __name__)

def check_permission(current_user_role, required_roles):
    return current_user_role in required_roles

@users_bp.route('/', methods=['GET'])
@jwt_required()
def get_users():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not check_permission(current_user.role, ['super_admin', 'manager', 'supervisor']):
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        users = User.query.all()
        return jsonify({'users': [user.to_dict() for user in users]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/', methods=['POST'])
@jwt_required()
def create_user():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        data = request.get_json()
        role = data.get('role')
        
        # Role-based creation permissions
        if current_user.role == 'super_admin' and role not in ['manager', 'supervisor']:
            return jsonify({'error': 'Super Admin can only create Managers and Supervisors'}), 403
        elif current_user.role in ['manager', 'supervisor'] and role not in ['member']:
            return jsonify({'error': 'Managers/Supervisors can only create Members'}), 403
        elif current_user.role == 'member':
            return jsonify({'error': 'Members cannot create users'}), 403
        
        # Check if username or email already exists
        if User.query.filter_by(username=data.get('username')).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=data.get('email')).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'role']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        if len(data.get('password')) < 8:
            return jsonify({'error': 'Password must be at least 8 characters long'}), 400
        
        new_user = User(
            username=data.get('username'),
            email=data.get('email'),
            role=role,
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            created_by=current_user_id
        )
        new_user.set_password(data.get('password'))
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'User created successfully',
            'user': new_user.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Users can view their own profile or higher roles can view all
        if current_user_id != user_id and not check_permission(current_user.role, ['super_admin', 'manager', 'supervisor']):
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Permission checks
        if current_user_id != user_id and not check_permission(current_user.role, ['super_admin', 'manager', 'supervisor']):
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        data = request.get_json()
        
        # Update allowed fields
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'email' in data:
            user.email = data['email']
        
        # Only managers/supervisors can update role and status (except super_admin)
        if check_permission(current_user.role, ['super_admin', 'manager', 'supervisor']):
            if 'role' in data and user.role != 'super_admin':
                user.role = data['role']
            if 'is_active' in data:
                user.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not check_permission(current_user.role, ['super_admin', 'manager', 'supervisor']):
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Cannot delete super admin or yourself
        if user.role == 'super_admin' or user_id == current_user_id:
            return jsonify({'error': 'Cannot delete this user'}), 403
        
        # Soft delete by deactivating
        user.is_active = False
        db.session.commit()
        
        return jsonify({'message': 'User deactivated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500