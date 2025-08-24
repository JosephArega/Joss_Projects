from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models import Asset, User

assets_bp = Blueprint('assets', __name__)

def check_permission(current_user_role, required_roles):
    return current_user_role in required_roles

@assets_bp.route('/', methods=['GET'])
@jwt_required()
def get_assets():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Members can only see their owned assets
        if current_user.role == 'member':
            assets = Asset.query.filter_by(owner_id=current_user_id).all()
        else:
            assets = Asset.query.all()
        
        return jsonify({'assets': [asset.to_dict() for asset in assets]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assets_bp.route('/', methods=['POST'])
@jwt_required()
def create_asset():
    try:
        current_user_id = get_jwt_identity()
        
        data = request.get_json()
        
        # Validate required fields
        if not data.get('server_name'):
            return jsonify({'error': 'Server name is required'}), 400
        if not data.get('asset_id'):
            return jsonify({'error': 'Asset ID is required'}), 400
        
        # Check if asset_id already exists
        existing_asset = Asset.query.filter_by(asset_id=data['asset_id']).first()
        if existing_asset:
            return jsonify({'error': 'Asset ID already exists'}), 400
        
        new_asset = Asset(
            server_name=data.get('server_name'),
            asset_id=data.get('asset_id'),
            serial_number=data.get('serial_number'),
            ip_address=data.get('ip_address'),
            rack_number=data.get('rack_number'),
            slot_number=data.get('slot_number'),
            host_name=data.get('host_name'),
            operating_system=data.get('operating_system'),
            service_packs=data.get('service_packs'),
            software_details=data.get('software_details'),
            business_requirements=data.get('business_requirements'),
            technical_contact=data.get('technical_contact'),
            vendor=data.get('vendor'),
            make_model=data.get('make_model'),
            cpu=data.get('cpu'),
            ram=data.get('ram'),
            hdd=data.get('hdd'),
            purpose=data.get('purpose'),
            asset_type=data.get('asset_type'),
            dependency=data.get('dependency'),
            redundancy_requirements=data.get('redundancy_requirements'),
            stored_information=data.get('stored_information'),
            backup_schedule=data.get('backup_schedule'),
            confidentiality_req=data.get('confidentiality_req'),
            integrity_req=data.get('integrity_req'),
            availability_req=data.get('availability_req'),
            asset_value=data.get('asset_value'),
            asset_value_rating=data.get('asset_value_rating'),
            classification=data.get('classification'),
            owner_id=data.get('owner_id', current_user_id),
            custodian=data.get('custodian'),
            users=data.get('users')
        )
        
        db.session.add(new_asset)
        db.session.commit()
        
        return jsonify({
            'message': 'Asset created successfully',
            'asset': new_asset.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assets_bp.route('/<int:asset_id>', methods=['GET'])
@jwt_required()
def get_asset(asset_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        asset = Asset.query.get(asset_id)
        if not asset:
            return jsonify({'error': 'Asset not found'}), 404
        
        # Members can only view their assets
        if current_user.role == 'member' and asset.owner_id != current_user_id:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        return jsonify({'asset': asset.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assets_bp.route('/<int:asset_id>', methods=['PUT'])
@jwt_required()
def update_asset(asset_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        asset = Asset.query.get(asset_id)
        if not asset:
            return jsonify({'error': 'Asset not found'}), 404
        
        # Permission checks
        can_edit = (
            check_permission(current_user.role, ['manager', 'supervisor']) or
            asset.owner_id == current_user_id
        )
        
        if not can_edit:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        data = request.get_json()
        
        # Update fields
        updatable_fields = [
            'server_name', 'serial_number', 'ip_address', 'rack_number', 'slot_number',
            'host_name', 'operating_system', 'service_packs', 'software_details',
            'business_requirements', 'technical_contact', 'vendor', 'make_model',
            'cpu', 'ram', 'hdd', 'purpose', 'asset_type', 'dependency',
            'redundancy_requirements', 'stored_information', 'backup_schedule',
            'confidentiality_req', 'integrity_req', 'availability_req',
            'asset_value', 'asset_value_rating', 'classification', 'custodian', 'users'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(asset, field, data[field])
        
        # Only managers/supervisors can change owner
        if 'owner_id' in data and check_permission(current_user.role, ['manager', 'supervisor']):
            asset.owner_id = data['owner_id']
        
        # Check if asset_id is being changed and doesn't conflict
        if 'asset_id' in data and data['asset_id'] != asset.asset_id:
            existing_asset = Asset.query.filter_by(asset_id=data['asset_id']).first()
            if existing_asset:
                return jsonify({'error': 'Asset ID already exists'}), 400
            asset.asset_id = data['asset_id']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Asset updated successfully',
            'asset': asset.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assets_bp.route('/<int:asset_id>', methods=['DELETE'])
@jwt_required()
def delete_asset(asset_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        asset = Asset.query.get(asset_id)
        if not asset:
            return jsonify({'error': 'Asset not found'}), 404
        
        # Only owners or managers/supervisors can delete
        if asset.owner_id != current_user_id and not check_permission(current_user.role, ['manager', 'supervisor']):
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        db.session.delete(asset)
        db.session.commit()
        
        return jsonify({'message': 'Asset deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500