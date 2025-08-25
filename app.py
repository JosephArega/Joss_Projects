from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
import os
import matplotlib
matplotlib.use('Agg')

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///task_management.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.query.get(int(user_id))

# Import routes after app configuration
from routes import *

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Create super admin if it doesn't exist
        from models import User
        if not User.query.filter_by(role='Super Admin').first():
            super_admin = User(
                username='superadmin',
                email='admin@example.com',
                role='Super Admin'
            )
            super_admin.set_password('admin123')
            db.session.add(super_admin)
            db.session.commit()
            print("Super Admin created with username: superadmin, password: admin123")
    
    app.run(debug=True, host='0.0.0.0', port=5000)