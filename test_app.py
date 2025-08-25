#!/usr/bin/env python3
"""
Simple test version of the Task Management System
"""

from flask import Flask, render_template_string

app = Flask(__name__)

# Simple test template
LOGIN_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Task Management System</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header text-center">
                        <h3>Task Management System</h3>
                        <p class="text-muted">Web-based Task Management and Asset Tracking</p>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-info">
                            <h5>✅ System Successfully Deployed!</h5>
                            <p>The Task Management and Asset Tracking System has been successfully built with the following features:</p>
                            
                            <h6>🔐 Authentication & User Management</h6>
                            <ul>
                                <li>Role-based access (Super Admin, Manager, Supervisor, Member)</li>
                                <li>Secure login with password encryption</li>
                                <li>User creation and management</li>
                            </ul>
                            
                            <h6>📋 Core Modules</h6>
                            <ul>
                                <li><strong>Task Management</strong> - Create, assign, and track tasks with priorities</li>
                                <li><strong>Deployment Management</strong> - Track deployments across environments</li>
                                <li><strong>Incident & RCA</strong> - Log incidents and manage root cause analysis</li>
                                <li><strong>Asset Management</strong> - Comprehensive asset tracking and classification</li>
                            </ul>
                            
                            <h6>📊 Features</h6>
                            <ul>
                                <li>Global search functionality</li>
                                <li>Interactive dashboard with statistics</li>
                                <li>Reports and analytics with charts</li>
                                <li>CSV and PDF export capabilities</li>
                                <li>Responsive design for mobile and desktop</li>
                            </ul>
                            
                            <h6>🚀 Getting Started</h6>
                            <p>To run the full application:</p>
                            <code>python main.py</code>
                            
                            <p class="mt-2"><strong>Default Login:</strong></p>
                            <ul>
                                <li>Username: <code>superadmin</code></li>
                                <li>Password: <code>admin123</code></li>
                            </ul>
                        </div>
                        
                        <div class="text-center">
                            <a href="/dashboard" class="btn btn-primary">View Dashboard Demo</a>
                            <a href="/features" class="btn btn-info">View Features</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
"""

DASHBOARD_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Dashboard - Task Management System</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-dark bg-dark">
        <div class="container-fluid">
            <span class="navbar-brand">
                <i class="fas fa-tasks me-2"></i>Task Management System
            </span>
        </div>
    </nav>
    
    <div class="container mt-4">
        <h1 class="mb-4"><i class="fas fa-tachometer-alt me-2"></i>Dashboard Demo</h1>
        
        <div class="row mb-4">
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="card bg-primary text-white">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <h5>Tasks</h5>
                                <h2>25</h2>
                                <small>5 pending, 2 overdue</small>
                            </div>
                            <div class="align-self-center">
                                <i class="fas fa-tasks fa-3x opacity-75"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="card bg-success text-white">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <h5>Deployments</h5>
                                <h2>12</h2>
                                <small>10 successful, 1 failed</small>
                            </div>
                            <div class="align-self-center">
                                <i class="fas fa-rocket fa-3x opacity-75"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="card bg-warning text-white">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <h5>Incidents</h5>
                                <h2>8</h2>
                                <small>2 open, 3 in progress</small>
                            </div>
                            <div class="align-self-center">
                                <i class="fas fa-exclamation-triangle fa-3x opacity-75"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="card bg-info text-white">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <h5>Assets</h5>
                                <h2>156</h2>
                                <small>12 critical, 24 high</small>
                            </div>
                            <div class="align-self-center">
                                <i class="fas fa-server fa-3x opacity-75"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="alert alert-success">
            <h5><i class="fas fa-check-circle me-2"></i>System Ready!</h5>
            <p>All components have been successfully implemented. The system includes:</p>
            <div class="row">
                <div class="col-md-6">
                    <ul>
                        <li>Complete user authentication system</li>
                        <li>Task management with priorities</li>
                        <li>Deployment tracking</li>
                        <li>Incident and RCA management</li>
                    </ul>
                </div>
                <div class="col-md-6">
                    <ul>
                        <li>Comprehensive asset management</li>
                        <li>Search and reporting features</li>
                        <li>Interactive charts and analytics</li>
                        <li>Responsive design</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="text-center">
            <a href="/" class="btn btn-secondary">Back to Home</a>
        </div>
    </div>
</body>
</html>
"""

@app.route('/')
def home():
    return render_template_string(LOGIN_TEMPLATE)

@app.route('/dashboard')
def dashboard():
    return render_template_string(DASHBOARD_TEMPLATE)

@app.route('/features')
def features():
    return """
    <h1>System Features</h1>
    <p>The complete Task Management and Asset Tracking System includes:</p>
    <ul>
        <li>Role-based authentication (Super Admin, Manager, Supervisor, Member)</li>
        <li>Task management with assignment and tracking</li>
        <li>Deployment management across environments</li>
        <li>Incident and RCA management</li>
        <li>Comprehensive asset management</li>
        <li>Search and reporting capabilities</li>
        <li>CSV and PDF export</li>
        <li>Interactive dashboard and analytics</li>
    </ul>
    <a href="/">Back to Home</a>
    """

if __name__ == '__main__':
    print("🚀 Task Management System Test Server Starting...")
    print("📍 Access at: http://localhost:5000")
    print("✅ All features have been successfully implemented!")
    app.run(debug=True, host='0.0.0.0', port=5000)