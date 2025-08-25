from flask import render_template, request, redirect, url_for, flash, jsonify, send_file, make_response
from flask_login import login_user, login_required, logout_user, current_user

# Import app and db from run to avoid circular imports
def get_app_and_db():
    from run import app, db
    return app, db

app, db = get_app_and_db()
from models import User, Task, Deployment, Incident, Asset
from datetime import datetime, date
import csv
import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import base64
from io import BytesIO

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password', 'error')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    # Update task statuses
    tasks = Task.query.all()
    for task in tasks:
        task.update_status()
    db.session.commit()
    
    # Get dashboard data based on user role
    if current_user.role == 'Member':
        tasks = Task.query.filter_by(assigned_to=current_user.id).all()
        deployments = Deployment.query.filter_by(deployed_by=current_user.id).all()
        incidents = Incident.query.filter_by(reported_by=current_user.id).all()
        assets = Asset.query.filter_by(owner=current_user.id).all()
    else:
        tasks = Task.query.all()
        deployments = Deployment.query.all()
        incidents = Incident.query.all()
        assets = Asset.query.all()
    
    # Calculate statistics
    task_stats = {
        'total': len(tasks),
        'pending': len([t for t in tasks if t.status == 'Pending']),
        'completed': len([t for t in tasks if t.status == 'Completed']),
        'overdue': len([t for t in tasks if t.status == 'Overdue'])
    }
    
    deployment_stats = {
        'total': len(deployments),
        'successful': len([d for d in deployments if d.status == 'Successful']),
        'pending': len([d for d in deployments if d.status == 'Pending']),
        'failed': len([d for d in deployments if d.status == 'Failed'])
    }
    
    incident_stats = {
        'total': len(incidents),
        'open': len([i for i in incidents if i.status == 'Open']),
        'in_progress': len([i for i in incidents if i.status == 'In Progress']),
        'resolved': len([i for i in incidents if i.status == 'Resolved'])
    }
    
    asset_stats = {
        'total': len(assets),
        'critical': len([a for a in assets if a.criticality == 'Critical']),
        'high': len([a for a in assets if a.criticality == 'High']),
        'medium': len([a for a in assets if a.criticality == 'Medium'])
    }
    
    return render_template('dashboard.html', 
                         task_stats=task_stats,
                         deployment_stats=deployment_stats,
                         incident_stats=incident_stats,
                         asset_stats=asset_stats,
                         recent_tasks=tasks[:5],
                         recent_deployments=deployments[:5],
                         recent_incidents=incidents[:5])

# User Management Routes
@app.route('/users')
@login_required
def users():
    if not current_user.can_manage_users():
        flash('Access denied', 'error')
        return redirect(url_for('dashboard'))
    
    users = User.query.all()
    return render_template('users.html', users=users)

@app.route('/users/add', methods=['GET', 'POST'])
@login_required
def add_user():
    if not current_user.can_manage_users():
        flash('Access denied', 'error')
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        role = request.form['role']
        
        # Check role restrictions
        if current_user.role == 'Super Admin' and role not in ['Manager', 'Supervisor']:
            flash('Super Admin can only create Manager and Supervisor roles', 'error')
            return render_template('add_user.html')
        
        if User.query.filter_by(username=username).first():
            flash('Username already exists', 'error')
            return render_template('add_user.html')
        
        if User.query.filter_by(email=email).first():
            flash('Email already exists', 'error')
            return render_template('add_user.html')
        
        user = User(username=username, email=email, role=role, created_by=current_user.id)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        flash('User created successfully', 'success')
        return redirect(url_for('users'))
    
    return render_template('add_user.html')

# Task Management Routes
@app.route('/tasks')
@login_required
def tasks():
    if current_user.role == 'Member':
        tasks = Task.query.filter_by(assigned_to=current_user.id).all()
    else:
        tasks = Task.query.all()
    
    # Update task statuses
    for task in tasks:
        task.update_status()
    db.session.commit()
    
    return render_template('tasks.html', tasks=tasks)

@app.route('/tasks/add', methods=['GET', 'POST'])
@login_required
def add_task():
    if request.method == 'POST':
        name = request.form['name']
        description = request.form['description']
        due_date = datetime.strptime(request.form['due_date'], '%Y-%m-%d')
        priority = request.form['priority']
        assigned_to = request.form.get('assigned_to')
        
        if assigned_to == '':
            assigned_to = None
        
        task = Task(
            name=name,
            description=description,
            due_date=due_date,
            priority=priority,
            created_by=current_user.id,
            assigned_to=assigned_to
        )
        
        db.session.add(task)
        db.session.commit()
        
        flash('Task created successfully', 'success')
        return redirect(url_for('tasks'))
    
    users = User.query.all() if current_user.can_assign_tasks() else []
    return render_template('add_task.html', users=users)

@app.route('/tasks/<int:task_id>/complete', methods=['POST'])
@login_required
def complete_task(task_id):
    task = Task.query.get_or_404(task_id)
    
    if current_user.role == 'Member' and task.assigned_to != current_user.id:
        flash('Access denied', 'error')
        return redirect(url_for('tasks'))
    
    task.status = 'Completed'
    task.completed_date = datetime.utcnow()
    db.session.commit()
    
    flash('Task marked as completed', 'success')
    return redirect(url_for('tasks'))

# Deployment Management Routes
@app.route('/deployments')
@login_required
def deployments():
    if current_user.role == 'Member':
        deployments = Deployment.query.filter_by(deployed_by=current_user.id).all()
    else:
        deployments = Deployment.query.all()
    
    return render_template('deployments.html', deployments=deployments)

@app.route('/deployments/add', methods=['GET', 'POST'])
@login_required
def add_deployment():
    if request.method == 'POST':
        name = request.form['name']
        description = request.form['description']
        environment = request.form['environment']
        version = request.form['version']
        backup_location = request.form['backup_location']
        
        deployment = Deployment(
            name=name,
            description=description,
            environment=environment,
            version=version,
            backup_location=backup_location,
            deployed_by=current_user.id
        )
        
        db.session.add(deployment)
        db.session.commit()
        
        flash('Deployment created successfully', 'success')
        return redirect(url_for('deployments'))
    
    return render_template('add_deployment.html')

@app.route('/deployments/<int:deployment_id>/update_status', methods=['POST'])
@login_required
def update_deployment_status(deployment_id):
    deployment = Deployment.query.get_or_404(deployment_id)
    
    if not current_user.can_assign_tasks() and deployment.deployed_by != current_user.id:
        flash('Access denied', 'error')
        return redirect(url_for('deployments'))
    
    status = request.form['status']
    deployment.status = status
    db.session.commit()
    
    flash('Deployment status updated', 'success')
    return redirect(url_for('deployments'))

# Incident Management Routes
@app.route('/incidents')
@login_required
def incidents():
    if current_user.role == 'Member':
        incidents = Incident.query.filter_by(reported_by=current_user.id).all()
    else:
        incidents = Incident.query.all()
    
    return render_template('incidents.html', incidents=incidents)

@app.route('/incidents/add', methods=['GET', 'POST'])
@login_required
def add_incident():
    if request.method == 'POST':
        name = request.form['name']
        description = request.form['description']
        severity = request.form['severity']
        assigned_to = request.form.get('assigned_to')
        
        if assigned_to == '':
            assigned_to = None
        
        incident = Incident(
            name=name,
            description=description,
            severity=severity,
            reported_by=current_user.id,
            assigned_to=assigned_to
        )
        
        db.session.add(incident)
        db.session.commit()
        
        flash('Incident created successfully', 'success')
        return redirect(url_for('incidents'))
    
    users = User.query.all() if current_user.can_assign_tasks() else []
    return render_template('add_incident.html', users=users)

@app.route('/incidents/<int:incident_id>/rca', methods=['GET', 'POST'])
@login_required
def incident_rca(incident_id):
    incident = Incident.query.get_or_404(incident_id)
    
    if request.method == 'POST':
        incident.rca_details = request.form['rca_details']
        incident.root_cause = request.form['root_cause']
        incident.corrective_actions = request.form['corrective_actions']
        incident.preventive_actions = request.form['preventive_actions']
        incident.status = request.form['status']
        
        if incident.status in ['Resolved', 'Closed']:
            incident.resolution_date = datetime.utcnow()
        
        db.session.commit()
        flash('RCA updated successfully', 'success')
        return redirect(url_for('incidents'))
    
    return render_template('incident_rca.html', incident=incident)

# Asset Management Routes
@app.route('/assets')
@login_required
def assets():
    if current_user.role == 'Member':
        assets = Asset.query.filter_by(owner=current_user.id).all()
    else:
        assets = Asset.query.all()
    
    return render_template('assets.html', assets=assets)

@app.route('/assets/add', methods=['GET', 'POST'])
@login_required
def add_asset():
    if request.method == 'POST':
        asset = Asset(
            server_name=request.form['server_name'],
            asset_id=request.form['asset_id'],
            serial_number=request.form['serial_number'],
            owner=current_user.id,
            custodian=request.form['custodian'],
            users=request.form['users'],
            ip_address=request.form['ip_address'],
            rack_number=request.form['rack_number'],
            slot_number=request.form['slot_number'],
            host_name=request.form['host_name'],
            os=request.form['os'],
            service_packs_required=request.form['service_packs_required'],
            software_details=request.form['software_details'],
            vendor=request.form['vendor'],
            make_model=request.form['make_model'],
            cpu=request.form['cpu'],
            ram=request.form['ram'],
            hdd=request.form['hdd'],
            purpose_service_role=request.form['purpose_service_role'],
            asset_type=request.form['asset_type'],
            application_requirements=request.form['application_requirements'],
            technical_contact=request.form['technical_contact'],
            dependency=request.form['dependency'],
            criticality=request.form['criticality'],
            sensitivity=request.form['sensitivity'],
            redundancy_requirements=request.form['redundancy_requirements'],
            stored_information_assets=request.form['stored_information_assets'],
            backup_schedule=request.form['backup_schedule'],
            confidentiality_requirements=request.form['confidentiality_requirements'],
            integrity_requirements=request.form['integrity_requirements'],
            availability_requirements=request.form['availability_requirements'],
            value=float(request.form['value']) if request.form['value'] else None,
            asset_value_rating=request.form['asset_value_rating']
        )
        
        try:
            db.session.add(asset)
            db.session.commit()
            flash('Asset created successfully', 'success')
            return redirect(url_for('assets'))
        except Exception as e:
            db.session.rollback()
            flash('Error creating asset. Asset ID might already exist.', 'error')
    
    return render_template('add_asset.html')

@app.route('/assets/<int:asset_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_asset(asset_id):
    asset = Asset.query.get_or_404(asset_id)
    
    if current_user.role == 'Member' and asset.owner != current_user.id:
        flash('Access denied', 'error')
        return redirect(url_for('assets'))
    
    if request.method == 'POST':
        asset.server_name = request.form['server_name']
        asset.serial_number = request.form['serial_number']
        asset.custodian = request.form['custodian']
        asset.users = request.form['users']
        asset.ip_address = request.form['ip_address']
        asset.rack_number = request.form['rack_number']
        asset.slot_number = request.form['slot_number']
        asset.host_name = request.form['host_name']
        asset.os = request.form['os']
        asset.service_packs_required = request.form['service_packs_required']
        asset.software_details = request.form['software_details']
        asset.vendor = request.form['vendor']
        asset.make_model = request.form['make_model']
        asset.cpu = request.form['cpu']
        asset.ram = request.form['ram']
        asset.hdd = request.form['hdd']
        asset.purpose_service_role = request.form['purpose_service_role']
        asset.asset_type = request.form['asset_type']
        asset.application_requirements = request.form['application_requirements']
        asset.technical_contact = request.form['technical_contact']
        asset.dependency = request.form['dependency']
        asset.criticality = request.form['criticality']
        asset.sensitivity = request.form['sensitivity']
        asset.redundancy_requirements = request.form['redundancy_requirements']
        asset.stored_information_assets = request.form['stored_information_assets']
        asset.backup_schedule = request.form['backup_schedule']
        asset.confidentiality_requirements = request.form['confidentiality_requirements']
        asset.integrity_requirements = request.form['integrity_requirements']
        asset.availability_requirements = request.form['availability_requirements']
        asset.value = float(request.form['value']) if request.form['value'] else None
        asset.asset_value_rating = request.form['asset_value_rating']
        asset.updated_date = datetime.utcnow()
        
        db.session.commit()
        flash('Asset updated successfully', 'success')
        return redirect(url_for('assets'))
    
    return render_template('edit_asset.html', asset=asset)

# Search functionality
@app.route('/search')
@login_required
def search():
    query = request.args.get('q', '')
    if not query:
        return render_template('search_results.html', query=query, tasks=[], deployments=[], incidents=[], assets=[])
    
    # Search in tasks
    task_results = Task.query.filter(Task.name.contains(query) | Task.description.contains(query)).all()
    
    # Search in deployments
    deployment_results = Deployment.query.filter(Deployment.name.contains(query) | Deployment.description.contains(query)).all()
    
    # Search in incidents
    incident_results = Incident.query.filter(Incident.name.contains(query) | Incident.description.contains(query)).all()
    
    # Search in assets
    asset_results = Asset.query.filter(
        Asset.server_name.contains(query) | 
        Asset.asset_id.contains(query) |
        Asset.host_name.contains(query) |
        Asset.ip_address.contains(query)
    ).all()
    
    # Filter results based on user role
    if current_user.role == 'Member':
        task_results = [t for t in task_results if t.assigned_to == current_user.id]
        deployment_results = [d for d in deployment_results if d.deployed_by == current_user.id]
        incident_results = [i for i in incident_results if i.reported_by == current_user.id]
        asset_results = [a for a in asset_results if a.owner == current_user.id]
    
    return render_template('search_results.html', 
                         query=query,
                         tasks=task_results,
                         deployments=deployment_results,
                         incidents=incident_results,
                         assets=asset_results)

# Reports and Analytics
@app.route('/reports')
@login_required
def reports():
    return render_template('reports.html')

@app.route('/reports/generate', methods=['POST'])
@login_required
def generate_report():
    report_type = request.form['report_type']
    start_date = datetime.strptime(request.form['start_date'], '%Y-%m-%d') if request.form['start_date'] else None
    end_date = datetime.strptime(request.form['end_date'], '%Y-%m-%d') if request.form['end_date'] else None
    
    # Generate charts based on report type
    charts = []
    
    if report_type in ['tasks', 'all']:
        tasks = Task.query.all()
        if start_date:
            tasks = [t for t in tasks if t.added_date >= start_date]
        if end_date:
            tasks = [t for t in tasks if t.added_date <= end_date]
        
        # Task status chart
        status_counts = {'Pending': 0, 'Completed': 0, 'Overdue': 0}
        for task in tasks:
            task.update_status()
            status_counts[task.status] += 1
        
        plt.figure(figsize=(8, 6))
        plt.pie(status_counts.values(), labels=status_counts.keys(), autopct='%1.1f%%')
        plt.title('Task Status Distribution')
        
        img = BytesIO()
        plt.savefig(img, format='png', bbox_inches='tight')
        img.seek(0)
        chart_url = base64.b64encode(img.getvalue()).decode()
        charts.append({'title': 'Task Status Distribution', 'chart': chart_url})
        plt.close()
    
    if report_type in ['deployments', 'all']:
        deployments = Deployment.query.all()
        if start_date:
            deployments = [d for d in deployments if d.date >= start_date]
        if end_date:
            deployments = [d for d in deployments if d.date <= end_date]
        
        # Deployment status chart
        status_counts = {'Successful': 0, 'Pending': 0, 'Failed': 0}
        for deployment in deployments:
            status_counts[deployment.status] += 1
        
        plt.figure(figsize=(8, 6))
        plt.bar(status_counts.keys(), status_counts.values())
        plt.title('Deployment Status Distribution')
        plt.ylabel('Count')
        
        img = BytesIO()
        plt.savefig(img, format='png', bbox_inches='tight')
        img.seek(0)
        chart_url = base64.b64encode(img.getvalue()).decode()
        charts.append({'title': 'Deployment Status Distribution', 'chart': chart_url})
        plt.close()
    
    if report_type in ['incidents', 'all']:
        incidents = Incident.query.all()
        if start_date:
            incidents = [i for i in incidents if i.date >= start_date]
        if end_date:
            incidents = [i for i in incidents if i.date <= end_date]
        
        # Incident severity chart
        severity_counts = {'Critical': 0, 'High': 0, 'Medium': 0, 'Low': 0}
        for incident in incidents:
            severity_counts[incident.severity] += 1
        
        plt.figure(figsize=(8, 6))
        colors_map = {'Critical': 'red', 'High': 'orange', 'Medium': 'yellow', 'Low': 'green'}
        bars = plt.bar(severity_counts.keys(), severity_counts.values())
        for i, bar in enumerate(bars):
            bar.set_color(list(colors_map.values())[i])
        plt.title('Incident Severity Distribution')
        plt.ylabel('Count')
        
        img = BytesIO()
        plt.savefig(img, format='png', bbox_inches='tight')
        img.seek(0)
        chart_url = base64.b64encode(img.getvalue()).decode()
        charts.append({'title': 'Incident Severity Distribution', 'chart': chart_url})
        plt.close()
    
    if report_type in ['assets', 'all']:
        assets = Asset.query.all()
        
        # Asset criticality chart
        criticality_counts = {'Critical': 0, 'High': 0, 'Medium': 0, 'Low': 0}
        for asset in assets:
            if asset.criticality:
                criticality_counts[asset.criticality] += 1
        
        plt.figure(figsize=(8, 6))
        plt.pie([v for v in criticality_counts.values() if v > 0], 
                labels=[k for k, v in criticality_counts.items() if v > 0], 
                autopct='%1.1f%%')
        plt.title('Asset Criticality Distribution')
        
        img = BytesIO()
        plt.savefig(img, format='png', bbox_inches='tight')
        img.seek(0)
        chart_url = base64.b64encode(img.getvalue()).decode()
        charts.append({'title': 'Asset Criticality Distribution', 'chart': chart_url})
        plt.close()
    
    return render_template('report_results.html', charts=charts, report_type=report_type)

@app.route('/export/csv/<report_type>')
@login_required
def export_csv(report_type):
    output = io.StringIO()
    writer = csv.writer(output)
    
    if report_type == 'tasks':
        writer.writerow(['ID', 'Name', 'Description', 'Added Date', 'Due Date', 'Priority', 'Status', 'Created By', 'Assigned To'])
        tasks = Task.query.all()
        for task in tasks:
            writer.writerow([
                task.id, task.name, task.description, task.added_date,
                task.due_date, task.priority, task.status,
                task.creator.username if task.creator else '',
                task.assignee.username if task.assignee else ''
            ])
    
    elif report_type == 'deployments':
        writer.writerow(['ID', 'Name', 'Description', 'Date', 'Status', 'Deployed By', 'Environment', 'Version', 'Backup Location'])
        deployments = Deployment.query.all()
        for deployment in deployments:
            writer.writerow([
                deployment.id, deployment.name, deployment.description,
                deployment.date, deployment.status, deployment.deployer.username,
                deployment.environment, deployment.version, deployment.backup_location
            ])
    
    elif report_type == 'incidents':
        writer.writerow(['ID', 'Name', 'Description', 'Date', 'Severity', 'Status', 'Reported By', 'Assigned To'])
        incidents = Incident.query.all()
        for incident in incidents:
            writer.writerow([
                incident.id, incident.name, incident.description,
                incident.date, incident.severity, incident.status,
                incident.reporter.username,
                incident.assigned_to.username if incident.assigned_to else ''
            ])
    
    elif report_type == 'assets':
        writer.writerow(['ID', 'Server Name', 'Asset ID', 'Owner', 'IP Address', 'Criticality', 'Asset Type', 'Value'])
        assets = Asset.query.all()
        for asset in assets:
            writer.writerow([
                asset.id, asset.server_name, asset.asset_id,
                asset.owner_user.username, asset.ip_address,
                asset.criticality, asset.asset_type, asset.value
            ])
    
    response = make_response(output.getvalue())
    response.headers['Content-Disposition'] = f'attachment; filename={report_type}_report.csv'
    response.headers['Content-type'] = 'text/csv'
    
    return response

@app.route('/export/pdf/<report_type>')
@login_required
def export_pdf(report_type):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    
    # Create the PDF content
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title = Paragraph(f'{report_type.title()} Report', styles['Title'])
    elements.append(title)
    
    # Data table
    if report_type == 'tasks':
        data = [['ID', 'Name', 'Priority', 'Status', 'Due Date']]
        tasks = Task.query.all()
        for task in tasks:
            data.append([str(task.id), task.name, task.priority, task.status, str(task.due_date.date())])
    
    elif report_type == 'deployments':
        data = [['ID', 'Name', 'Status', 'Environment', 'Date']]
        deployments = Deployment.query.all()
        for deployment in deployments:
            data.append([str(deployment.id), deployment.name, deployment.status, deployment.environment, str(deployment.date.date())])
    
    elif report_type == 'incidents':
        data = [['ID', 'Name', 'Severity', 'Status', 'Date']]
        incidents = Incident.query.all()
        for incident in incidents:
            data.append([str(incident.id), incident.name, incident.severity, incident.status, str(incident.date.date())])
    
    elif report_type == 'assets':
        data = [['ID', 'Server Name', 'Asset ID', 'Criticality', 'Type']]
        assets = Asset.query.all()
        for asset in assets:
            data.append([str(asset.id), asset.server_name, asset.asset_id, asset.criticality or '', asset.asset_type or ''])
    
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    buffer.seek(0)
    
    response = make_response(buffer.getvalue())
    response.headers['Content-Disposition'] = f'attachment; filename={report_type}_report.pdf'
    response.headers['Content-Type'] = 'application/pdf'
    
    return response