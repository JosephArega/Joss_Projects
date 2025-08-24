from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models import Task, User
from datetime import datetime

tasks_bp = Blueprint('tasks', __name__)

def check_permission(current_user_role, required_roles):
    return current_user_role in required_roles

@tasks_bp.route('/', methods=['GET'])
@jwt_required()
def get_tasks():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Members can only see their assigned tasks
        if current_user.role == 'member':
            tasks = Task.query.filter_by(assigned_to=current_user_id).all()
        else:
            tasks = Task.query.all()
        
        return jsonify({'tasks': [task.to_dict() for task in tasks]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('/', methods=['POST'])
@jwt_required()
def create_task():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Task name is required'}), 400
        
        # Parse due_date if provided
        due_date = None
        if data.get('due_date'):
            try:
                due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid due_date format'}), 400
        
        new_task = Task(
            name=data.get('name'),
            description=data.get('description'),
            priority=data.get('priority', 'medium'),
            due_date=due_date,
            created_by=current_user_id,
            assigned_to=data.get('assigned_to')
        )
        
        # Only managers/supervisors can assign to others
        if data.get('assigned_to') and data.get('assigned_to') != current_user_id:
            if not check_permission(current_user.role, ['manager', 'supervisor']):
                return jsonify({'error': 'Only managers/supervisors can assign tasks to others'}), 403
        
        db.session.add(new_task)
        db.session.commit()
        
        return jsonify({
            'message': 'Task created successfully',
            'task': new_task.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('/<int:task_id>', methods=['GET'])
@jwt_required()
def get_task(task_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        task = Task.query.get(task_id)
        if not task:
            return jsonify({'error': 'Task not found'}), 404
        
        # Members can only view their tasks
        if current_user.role == 'member' and task.assigned_to != current_user_id and task.created_by != current_user_id:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        return jsonify({'task': task.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        task = Task.query.get(task_id)
        if not task:
            return jsonify({'error': 'Task not found'}), 404
        
        # Permission checks
        can_edit = (
            check_permission(current_user.role, ['manager', 'supervisor']) or
            task.created_by == current_user_id or
            task.assigned_to == current_user_id
        )
        
        if not can_edit:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            task.name = data['name']
        if 'description' in data:
            task.description = data['description']
        if 'priority' in data:
            task.priority = data['priority']
        if 'status' in data:
            task.status = data['status']
            if data['status'] == 'completed':
                task.completed_at = datetime.utcnow()
            else:
                task.completed_at = None
        
        if 'due_date' in data:
            if data['due_date']:
                try:
                    task.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
                except ValueError:
                    return jsonify({'error': 'Invalid due_date format'}), 400
            else:
                task.due_date = None
        
        # Only managers/supervisors can reassign tasks
        if 'assigned_to' in data and check_permission(current_user.role, ['manager', 'supervisor']):
            task.assigned_to = data['assigned_to']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Task updated successfully',
            'task': task.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('/<int:task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        task = Task.query.get(task_id)
        if not task:
            return jsonify({'error': 'Task not found'}), 404
        
        # Only creators or managers/supervisors can delete
        if task.created_by != current_user_id and not check_permission(current_user.role, ['manager', 'supervisor']):
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        db.session.delete(task)
        db.session.commit()
        
        return jsonify({'message': 'Task deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('/my-tasks', methods=['GET'])
@jwt_required()
def get_my_tasks():
    try:
        current_user_id = get_jwt_identity()
        
        assigned_tasks = Task.query.filter_by(assigned_to=current_user_id).all()
        created_tasks = Task.query.filter_by(created_by=current_user_id).all()
        
        # Combine and remove duplicates
        all_tasks = list({task.id: task for task in assigned_tasks + created_tasks}.values())
        
        return jsonify({'tasks': [task.to_dict() for task in all_tasks]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500