from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.models.User import User
from app.models.AuditLog import AuditLog
from app import db

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
                current_user_id = get_jwt_identity()
                user = User.query.get(current_user_id)
                
                if not user or not user.is_active:
                    return jsonify({'message': 'Invalid or inactive user'}), 401
                
                # Handle both single string and tuple/list of roles
                if len(allowed_roles) == 1 and isinstance(allowed_roles[0], (list, tuple)):
                    # Called as @role_required(['admin', 'teacher'])
                    allowed_roles_list = allowed_roles[0]
                elif len(allowed_roles) == 1 and isinstance(allowed_roles[0], str):
                    # Called as @role_required('admin')
                    allowed_roles_list = [allowed_roles[0]]
                else:
                    # Called as @role_required('admin', 'teacher')
                    allowed_roles_list = list(allowed_roles)
                
                if user.role not in allowed_roles_list:
                    return jsonify({'message': 'Insufficient permissions'}), 403
                
                return f(user, *args, **kwargs)
            except Exception as e:
                return jsonify({'message': 'Authentication required'}), 401
        return decorated_function
    return decorator

def log_action(action, table_name=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                result = f(*args, **kwargs)
                
                current_user_id = None
                try:
                    verify_jwt_in_request()
                    current_user_id = get_jwt_identity()
                except:
                    pass
                
                audit_log = AuditLog(
                    user_id=current_user_id,
                    action=action,
                    table_name=table_name,
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent')
                )
                db.session.add(audit_log)
                db.session.commit()
                
                return result
            except Exception as e:
                db.session.rollback()
                raise e
        return decorated_function
    return decorator