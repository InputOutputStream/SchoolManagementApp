# app/models/Subject.py
from app import db
from datetime import datetime

class Subject(db.Model):
    __tablename__ = 'subjects'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    coefficient = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships - backrefs handled by other models
    assignments = db.relationship('TeacherAssignment', backref='subject', lazy=True)
    # evaluations backref created in Evaluation model
    # grades backref created in Grade model
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'coefficient': self.coefficient,
            'created_at': self.created_at.isoformat()
        }