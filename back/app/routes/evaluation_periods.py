# app/routes/evaluation_periods.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.EvaluationPeriod import EvaluationPeriod
from app.models.User import UserRole
from app.utils.decorators import role_required, log_action
from app import db
from datetime import datetime

evaluation_periods_bp = Blueprint('evaluation_periods', __name__)

@evaluation_periods_bp.route('/', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_evaluation_periods(current_user):
    """Get all evaluation periods"""
    periods = EvaluationPeriod.query.filter_by(is_active=True).order_by(EvaluationPeriod.start_date).all()
    return jsonify([period.to_dict() for period in periods])

@evaluation_periods_bp.route('/', methods=['POST'])
@jwt_required()
@role_required('admin')
@log_action('CREATE_EVALUATION_PERIOD', 'evaluation_periods')
def create_evaluation_period(current_user):
    """Create a new evaluation period"""
    data = request.get_json()
    
    required_fields = ['name', 'start_date', 'end_date', 'academic_year']
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return jsonify({'message': f'Missing required fields: {", ".join(missing_fields)}'}), 400
    
    try:
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        
        if start_date >= end_date:
            return jsonify({'message': 'Start date must be before end date'}), 400
        
        # Check for overlapping periods
        overlapping = EvaluationPeriod.query.filter(
            EvaluationPeriod.academic_year == data['academic_year'],
            EvaluationPeriod.is_active == True,
            db.or_(
                db.and_(EvaluationPeriod.start_date <= start_date, EvaluationPeriod.end_date >= start_date),
                db.and_(EvaluationPeriod.start_date <= end_date, EvaluationPeriod.end_date >= end_date),
                db.and_(EvaluationPeriod.start_date >= start_date, EvaluationPeriod.end_date <= end_date)
            )
        ).first()
        
        if overlapping:
            return jsonify({'message': 'Evaluation period overlaps with existing period'}), 400
        
        period = EvaluationPeriod(
            name=data['name'],
            start_date=start_date,
            end_date=end_date,
            academic_year=data['academic_year'],
            description=data.get('description', ''),
            created_by=current_user.id
        )
        
        db.session.add(period)
        db.session.commit()
        
        return jsonify({
            'message': 'Evaluation period created successfully',
            'period': period.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@evaluation_periods_bp.route('/<int:period_id>', methods=['PUT'])
@jwt_required()
@role_required('admin')
@log_action('UPDATE_EVALUATION_PERIOD', 'evaluation_periods')
def update_evaluation_period(current_user, period_id):
    """Update an evaluation period"""
    period = EvaluationPeriod.query.get_or_404(period_id)
    data = request.get_json()
    
    try:
        # Update basic fields
        for field in ['name', 'description']:
            if field in data:
                setattr(period, field, data[field])
        
        # Update dates if provided
        if 'start_date' in data:
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
            period.start_date = start_date
        
        if 'end_date' in data:
            end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            period.end_date = end_date
        
        # Validate dates
        if period.start_date >= period.end_date:
            return jsonify({'message': 'Start date must be before end date'}), 400
        
        period.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Evaluation period updated successfully',
            'period': period.to_dict()
        })
        
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@evaluation_periods_bp.route('/<int:period_id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
@log_action('DELETE_EVALUATION_PERIOD', 'evaluation_periods')
def delete_evaluation_period(current_user, period_id):
    """Deactivate an evaluation period"""
    period = EvaluationPeriod.query.get_or_404(period_id)
    
    # Check if period has associated grades or reports
    from app.models.Grade import Grade
    from app.models.ReportCard import ReportCard
    
    grade_count = Grade.query.filter_by(evaluation_period_id=period_id).count()
    report_count = ReportCard.query.filter_by(evaluation_period_id=period_id).count()
    
    if grade_count > 0 or report_count > 0:
        return jsonify({'message': 'Cannot delete period with associated grades or reports'}), 400
    
    period.is_active = False
    db.session.commit()
    
    return jsonify({'message': 'Evaluation period deactivated successfully'})

@evaluation_periods_bp.route('/current', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_current_period(current_user):
    """Get the current active evaluation period"""
    today = datetime.now().date()
    
    current_period = EvaluationPeriod.query.filter(
        EvaluationPeriod.is_active == True,
        EvaluationPeriod.start_date <= today,
        EvaluationPeriod.end_date >= today
    ).first()
    
    if not current_period:
        return jsonify({'message': 'No current evaluation period found'}), 404
    
    return jsonify(current_period.to_dict())

@evaluation_periods_bp.route('/academic-year/<string:academic_year>', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_periods_by_academic_year(current_user, academic_year):
    """Get evaluation periods for a specific academic year"""
    periods = EvaluationPeriod.query.filter_by(
        academic_year=academic_year,
        is_active=True
    ).order_by(EvaluationPeriod.start_date).all()
    
    return jsonify([period.to_dict() for period in periods])