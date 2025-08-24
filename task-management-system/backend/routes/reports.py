from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models import Task, Deployment, Incident, RCA, Asset, User
from datetime import datetime, timedelta
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
import os
import tempfile

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
            
            # Asset breakdown by type
            asset_types = db.session.query(Asset.asset_type, db.func.count(Asset.id)).group_by(Asset.asset_type).all()
            for asset_type, count in asset_types:
                if asset_type:
                    data['assets']['by_type'][asset_type] = count
        
        return jsonify({'dashboard': data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def create_chart(chart_type, data, title, labels=None):
    """Create a chart and return base64 encoded image"""
    plt.figure(figsize=(10, 6))
    
    if chart_type == 'bar':
        if labels:
            plt.bar(labels, data)
        else:
            plt.bar(range(len(data)), data)
    elif chart_type == 'pie':
        plt.pie(data, labels=labels, autopct='%1.1f%%')
    elif chart_type == 'line':
        plt.plot(data)
    
    plt.title(title)
    plt.tight_layout()
    
    # Save to base64
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.getvalue()).decode()
    plt.close()
    
    return image_base64

@reports_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not check_permission(current_user.role, ['manager', 'supervisor']):
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        # Get date range
        days = int(request.args.get('days', 30))
        start_date = datetime.utcnow() - timedelta(days=days)
        
        analytics = {}
        
        # Task analytics
        task_status_counts = db.session.query(
            Task.status, db.func.count(Task.id)
        ).group_by(Task.status).all()
        
        task_priority_counts = db.session.query(
            Task.priority, db.func.count(Task.id)
        ).group_by(Task.priority).all()
        
        analytics['tasks'] = {
            'status_distribution': {status: count for status, count in task_status_counts},
            'priority_distribution': {priority: count for priority, count in task_priority_counts}
        }
        
        # Deployment analytics
        deployment_status_counts = db.session.query(
            Deployment.status, db.func.count(Deployment.id)
        ).group_by(Deployment.status).all()
        
        analytics['deployments'] = {
            'status_distribution': {status: count for status, count in deployment_status_counts}
        }
        
        # Incident analytics
        incident_severity_counts = db.session.query(
            Incident.severity, db.func.count(Incident.id)
        ).group_by(Incident.severity).all()
        
        analytics['incidents'] = {
            'severity_distribution': {severity: count for severity, count in incident_severity_counts}
        }
        
        # Asset analytics
        asset_type_counts = db.session.query(
            Asset.asset_type, db.func.count(Asset.id)
        ).filter(Asset.asset_type.isnot(None)).group_by(Asset.asset_type).all()
        
        asset_value_counts = db.session.query(
            Asset.asset_value_rating, db.func.count(Asset.id)
        ).filter(Asset.asset_value_rating.isnot(None)).group_by(Asset.asset_value_rating).all()
        
        analytics['assets'] = {
            'type_distribution': {asset_type: count for asset_type, count in asset_type_counts},
            'value_distribution': {rating: count for rating, count in asset_value_counts}
        }
        
        # Generate charts
        charts = {}
        
        # Task status chart
        if analytics['tasks']['status_distribution']:
            status_data = analytics['tasks']['status_distribution']
            charts['task_status'] = create_chart(
                'pie', list(status_data.values()), 'Task Status Distribution', list(status_data.keys())
            )
        
        # Asset type chart
        if analytics['assets']['type_distribution']:
            type_data = analytics['assets']['type_distribution']
            charts['asset_types'] = create_chart(
                'bar', list(type_data.values()), 'Asset Type Distribution', list(type_data.keys())
            )
        
        analytics['charts'] = charts
        
        return jsonify({'analytics': analytics}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/export/csv', methods=['POST'])
@jwt_required()
def export_csv():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        data = request.get_json()
        report_type = data.get('type', 'tasks')
        
        # Get data based on type and user permissions
        if report_type == 'tasks':
            if current_user.role == 'member':
                tasks = Task.query.filter(
                    (Task.assigned_to == current_user_id) | (Task.created_by == current_user_id)
                ).all()
            else:
                tasks = Task.query.all()
            
            df_data = []
            for task in tasks:
                df_data.append({
                    'ID': task.id,
                    'Name': task.name,
                    'Description': task.description,
                    'Priority': task.priority,
                    'Status': task.status,
                    'Due Date': task.due_date.isoformat() if task.due_date else '',
                    'Created By': task.creator.username if task.creator else '',
                    'Assigned To': task.assignee.username if task.assignee else '',
                    'Created At': task.created_at.isoformat()
                })
            
            df = pd.DataFrame(df_data)
            
        elif report_type == 'assets':
            if current_user.role == 'member':
                assets = Asset.query.filter_by(owner_id=current_user_id).all()
            else:
                assets = Asset.query.all()
            
            df_data = []
            for asset in assets:
                df_data.append({
                    'ID': asset.id,
                    'Server Name': asset.server_name,
                    'Asset ID': asset.asset_id,
                    'Serial Number': asset.serial_number,
                    'IP Address': asset.ip_address,
                    'Operating System': asset.operating_system,
                    'Asset Type': asset.asset_type,
                    'Owner': asset.asset_owner.username if asset.asset_owner else '',
                    'Created At': asset.created_at.isoformat()
                })
            
            df = pd.DataFrame(df_data)
        
        else:
            return jsonify({'error': 'Invalid report type'}), 400
        
        # Create CSV file
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_data = csv_buffer.getvalue()
        
        # Return as downloadable file
        output = io.BytesIO()
        output.write(csv_data.encode('utf-8'))
        output.seek(0)
        
        return send_file(
            output,
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'{report_type}_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/export/pdf', methods=['POST'])
@jwt_required()
def export_pdf():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        data = request.get_json()
        report_type = data.get('type', 'tasks')
        
        # Create PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
        )
        
        # Content
        content = []
        
        # Title
        title = f"{report_type.title()} Report - Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        content.append(Paragraph(title, title_style))
        content.append(Spacer(1, 12))
        
        # Get data and create table
        if report_type == 'tasks':
            if current_user.role == 'member':
                tasks = Task.query.filter(
                    (Task.assigned_to == current_user_id) | (Task.created_by == current_user_id)
                ).all()
            else:
                tasks = Task.query.all()
            
            table_data = [['Name', 'Priority', 'Status', 'Due Date', 'Assigned To']]
            for task in tasks:
                table_data.append([
                    task.name[:30] + '...' if len(task.name) > 30 else task.name,
                    task.priority,
                    task.status,
                    task.due_date.strftime('%Y-%m-%d') if task.due_date else 'N/A',
                    task.assignee.username if task.assignee else 'Unassigned'
                ])
        
        elif report_type == 'assets':
            if current_user.role == 'member':
                assets = Asset.query.filter_by(owner_id=current_user_id).all()
            else:
                assets = Asset.query.all()
            
            table_data = [['Server Name', 'Asset ID', 'Type', 'IP Address', 'Owner']]
            for asset in assets:
                table_data.append([
                    asset.server_name,
                    asset.asset_id,
                    asset.asset_type or 'N/A',
                    asset.ip_address or 'N/A',
                    asset.asset_owner.username if asset.asset_owner else 'N/A'
                ])
        
        # Create table
        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        content.append(table)
        
        # Build PDF
        doc.build(content)
        buffer.seek(0)
        
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'{report_type}_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500