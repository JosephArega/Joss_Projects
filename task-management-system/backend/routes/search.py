from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models import Task, Deployment, Incident, RCA, Asset, User
from sqlalchemy import or_, and_

search_bp = Blueprint('search', __name__)

def check_permission(current_user_role, required_roles):
    return current_user_role in required_roles

@search_bp.route('/', methods=['GET'])
@jwt_required()
def global_search():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'error': 'Search query is required'}), 400
        
        search_type = request.args.get('type', 'all')  # all, tasks, deployments, incidents, rca, assets
        
        results = {
            'tasks': [],
            'deployments': [],
            'incidents': [],
            'rca': [],
            'assets': []
        }
        
        # Build search filter based on user role
        def get_user_filter_tasks():
            if current_user.role == 'member':
                return or_(Task.assigned_to == current_user_id, Task.created_by == current_user_id)
            return True
        
        def get_user_filter_deployments():
            if current_user.role == 'member':
                return Deployment.deployed_by == current_user_id
            return True
        
        def get_user_filter_incidents():
            if current_user.role == 'member':
                return or_(Incident.assigned_to == current_user_id, Incident.created_by == current_user_id)
            return True
        
        def get_user_filter_rca():
            if current_user.role == 'member':
                return RCA.assigned_to == current_user_id
            return True
        
        def get_user_filter_assets():
            if current_user.role == 'member':
                return Asset.owner_id == current_user_id
            return True
        
        # Search Tasks
        if search_type in ['all', 'tasks']:
            task_search = or_(
                Task.name.ilike(f'%{query}%'),
                Task.description.ilike(f'%{query}%'),
                Task.priority.ilike(f'%{query}%'),
                Task.status.ilike(f'%{query}%')
            )
            
            tasks = Task.query.filter(
                and_(task_search, get_user_filter_tasks())
            ).all()
            
            results['tasks'] = [task.to_dict() for task in tasks]
        
        # Search Deployments
        if search_type in ['all', 'deployments']:
            deployment_search = or_(
                Deployment.name.ilike(f'%{query}%'),
                Deployment.description.ilike(f'%{query}%'),
                Deployment.status.ilike(f'%{query}%'),
                Deployment.backup_location.ilike(f'%{query}%')
            )
            
            deployments = Deployment.query.filter(
                and_(deployment_search, get_user_filter_deployments())
            ).all()
            
            results['deployments'] = [deployment.to_dict() for deployment in deployments]
        
        # Search Incidents
        if search_type in ['all', 'incidents']:
            incident_search = or_(
                Incident.name.ilike(f'%{query}%'),
                Incident.description.ilike(f'%{query}%'),
                Incident.severity.ilike(f'%{query}%'),
                Incident.status.ilike(f'%{query}%')
            )
            
            incidents = Incident.query.filter(
                and_(incident_search, get_user_filter_incidents())
            ).all()
            
            results['incidents'] = [incident.to_dict() for incident in incidents]
        
        # Search RCA
        if search_type in ['all', 'rca']:
            rca_search = or_(
                RCA.root_cause.ilike(f'%{query}%'),
                RCA.corrective_actions.ilike(f'%{query}%'),
                RCA.preventive_actions.ilike(f'%{query}%'),
                RCA.status.ilike(f'%{query}%')
            )
            
            rcas = RCA.query.filter(
                and_(rca_search, get_user_filter_rca())
            ).all()
            
            results['rca'] = [rca.to_dict() for rca in rcas]
        
        # Search Assets
        if search_type in ['all', 'assets']:
            asset_search = or_(
                Asset.server_name.ilike(f'%{query}%'),
                Asset.asset_id.ilike(f'%{query}%'),
                Asset.serial_number.ilike(f'%{query}%'),
                Asset.ip_address.ilike(f'%{query}%'),
                Asset.host_name.ilike(f'%{query}%'),
                Asset.operating_system.ilike(f'%{query}%'),
                Asset.vendor.ilike(f'%{query}%'),
                Asset.make_model.ilike(f'%{query}%'),
                Asset.asset_type.ilike(f'%{query}%'),
                Asset.purpose.ilike(f'%{query}%')
            )
            
            assets = Asset.query.filter(
                and_(asset_search, get_user_filter_assets())
            ).all()
            
            results['assets'] = [asset.to_dict() for asset in assets]
        
        # Calculate total results
        total_results = sum(len(results[key]) for key in results)
        
        return jsonify({
            'query': query,
            'total_results': total_results,
            'results': results
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@search_bp.route('/suggestions', methods=['GET'])
@jwt_required()
def search_suggestions():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        query = request.args.get('q', '').strip()
        if len(query) < 2:
            return jsonify({'suggestions': []}), 200
        
        suggestions = []
        
        # Get suggestions based on user role
        if current_user.role == 'member':
            # Tasks
            tasks = Task.query.filter(
                and_(
                    or_(Task.assigned_to == current_user_id, Task.created_by == current_user_id),
                    Task.name.ilike(f'%{query}%')
                )
            ).limit(5).all()
            suggestions.extend([{'type': 'task', 'value': task.name, 'id': task.id} for task in tasks])
            
            # Assets
            assets = Asset.query.filter(
                and_(
                    Asset.owner_id == current_user_id,
                    or_(
                        Asset.server_name.ilike(f'%{query}%'),
                        Asset.asset_id.ilike(f'%{query}%')
                    )
                )
            ).limit(5).all()
            suggestions.extend([{'type': 'asset', 'value': asset.server_name, 'id': asset.id} for asset in assets])
        else:
            # All entities for managers/supervisors
            tasks = Task.query.filter(Task.name.ilike(f'%{query}%')).limit(3).all()
            suggestions.extend([{'type': 'task', 'value': task.name, 'id': task.id} for task in tasks])
            
            deployments = Deployment.query.filter(Deployment.name.ilike(f'%{query}%')).limit(3).all()
            suggestions.extend([{'type': 'deployment', 'value': deployment.name, 'id': deployment.id} for deployment in deployments])
            
            incidents = Incident.query.filter(Incident.name.ilike(f'%{query}%')).limit(3).all()
            suggestions.extend([{'type': 'incident', 'value': incident.name, 'id': incident.id} for incident in incidents])
            
            assets = Asset.query.filter(
                or_(
                    Asset.server_name.ilike(f'%{query}%'),
                    Asset.asset_id.ilike(f'%{query}%')
                )
            ).limit(3).all()
            suggestions.extend([{'type': 'asset', 'value': asset.server_name, 'id': asset.id} for asset in assets])
        
        return jsonify({'suggestions': suggestions[:10]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500