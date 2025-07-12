from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import jwt
import os
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
from models import init_db, UserModel, SkillModel, SwapModel, RatingModel
import uuid

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def create_admin():
    admin_id = UserModel.create_user(
        username='admin',
        email='admin@skillswap.com', 
        password='admin123',
        name='Administrator'
    )
    if admin_id:
        UserModel.update_user(admin_id, is_admin=True)
        print("Admin user created: admin/admin123")

def create_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def verify_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(f):
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'error': 'Invalid token'}), 401
        
        request.user_id = user_id
        return f(*args, **kwargs)
    
    decorated.__name__ = f.__name__
    return decorated

def require_admin(f):
    def decorated(*args, **kwargs):
        user = UserModel.get_user(request.user_id)
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    
    decorated.__name__ = f.__name__
    return decorated

# Authentication Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    required_fields = ['username', 'email', 'password', 'name']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    user_id = UserModel.create_user(
        data['username'], 
        data['email'], 
        data['password'], 
        data['name'],
        data.get('location')
    )
    
    if not user_id:
        return jsonify({'error': 'Username or email already exists'}), 400
    
    token = create_token(user_id)
    user = UserModel.get_user(user_id)
    
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'name': user['name'],
            'email': user['email'],
            'is_admin': user['is_admin']
        }
    })

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 400
    
    user = UserModel.authenticate(data['username'], data['password'])
    if not user:
        return jsonify({'error': 'Invalid credentials or banned user'}), 401
    
    token = create_token(user['id'])
    
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'name': user['name'],
            'email': user['email'],
            'is_admin': user['is_admin']
        }
    })

# Profile Routes
@app.route('/api/profile', methods=['GET'])
@require_auth
def get_profile():
    user = UserModel.get_user(request.user_id)
    skills = SkillModel.get_user_skills(request.user_id)
    ratings = RatingModel.get_user_ratings(request.user_id)
    avg_rating = RatingModel.get_average_rating(request.user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'user': user,
        'skills': skills,
        'ratings': ratings,
        'average_rating': avg_rating
    })

@app.route('/api/profile', methods=['PUT'])
@require_auth
def update_profile():
    data = request.get_json()
    
    allowed_fields = ['name', 'location', 'bio', 'availability', 'is_public']
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if update_data:
        UserModel.update_user(request.user_id, **update_data)
    
    return jsonify({'message': 'Profile updated successfully'})

@app.route('/api/upload-profile-photo', methods=['POST'])
@require_auth
def upload_profile_photo():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(f"{request.user_id}_{str(uuid.uuid4())}.{file.filename.rsplit('.', 1)[1].lower()}")
        
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        UserModel.update_user(request.user_id, profile_photo=filename)
        
        return jsonify({'filename': filename})
    
    return jsonify({'error': 'Invalid file type'}), 400

# Add this BEFORE your API routes (around line 50):
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
# @app.route('/api/uploads/<filename>')
# def uploaded_file(filename):
#     return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Skills Routes
@app.route('/api/skills/offered', methods=['POST'])
@require_auth
def add_skill_offered():
    data = request.get_json()
    
    if not data.get('skill_name'):
        return jsonify({'error': 'Skill name required'}), 400
    
    skill_id = SkillModel.add_skill_offered(
        request.user_id, 
        data['skill_name'], 
        data.get('description', '')
    )
    
    return jsonify({'id': skill_id, 'message': 'Skill added successfully'})

@app.route('/api/skills/wanted', methods=['POST'])
@require_auth
def add_skill_wanted():
    data = request.get_json()
    
    if not data.get('skill_name'):
        return jsonify({'error': 'Skill name required'}), 400
    
    skill_id = SkillModel.add_skill_wanted(
        request.user_id, 
        data['skill_name'], 
        data.get('description', '')
    )
    
    return jsonify({'id': skill_id, 'message': 'Skill added successfully'})

@app.route('/api/skills/offered/<int:skill_id>', methods=['DELETE'])
@require_auth
def delete_skill_offered(skill_id):
    SkillModel.delete_skill_offered(skill_id, request.user_id)
    return jsonify({'message': 'Skill removed successfully'})

@app.route('/api/skills/wanted/<int:skill_id>', methods=['DELETE'])
@require_auth
def delete_skill_wanted(skill_id):
    SkillModel.delete_skill_wanted(skill_id, request.user_id)
    return jsonify({'message': 'Skill removed successfully'})

# User Search Routes
@app.route('/api/users/search', methods=['GET'])
@require_auth
def search_users():
    query = request.args.get('q', '')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    
    users = UserModel.search_users(query, page, per_page)
    
    # Add skills and ratings for each user
    for user in users:
        user['skills'] = SkillModel.get_user_skills(user['id'])
        user['average_rating'] = RatingModel.get_average_rating(user['id'])
    
    return jsonify({'users': users})

# Swap Routes
@app.route('/api/swaps', methods=['POST'])
@require_auth
def create_swap_request():
    data = request.get_json()
    
    required_fields = ['provider_id', 'skill_offered', 'skill_wanted']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    swap_id = SwapModel.create_swap_request(
        request.user_id,
        data['provider_id'],
        data['skill_offered'],
        data['skill_wanted'],
        data.get('message', '')
    )
    
    return jsonify({'id': swap_id, 'message': 'Swap request created successfully'})

@app.route('/api/swaps', methods=['GET'])
@require_auth
def get_user_swaps():
    swaps = SwapModel.get_user_swaps(request.user_id)
    return jsonify(swaps)

@app.route('/api/swaps/<int:swap_id>/status', methods=['PUT'])
@require_auth
def update_swap_status(swap_id):
    data = request.get_json()
    status = data.get('status')
    
    if status not in ['accepted', 'rejected']:
        return jsonify({'error': 'Invalid status'}), 400
    
    SwapModel.update_swap_status(swap_id, status, request.user_id)
    return jsonify({'message': 'Swap status updated successfully'})

@app.route('/api/swaps/<int:swap_id>', methods=['DELETE'])
@require_auth
def delete_swap_request(swap_id):
    SwapModel.delete_swap_request(swap_id, request.user_id)
    return jsonify({'message': 'Swap request deleted successfully'})

# Rating Routes
@app.route('/api/ratings', methods=['POST'])
@require_auth
def add_rating():
    data = request.get_json()
    
    required_fields = ['swap_request_id', 'rated_id', 'rating']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    rating_id = RatingModel.add_rating(
        data['swap_request_id'],
        request.user_id,
        data['rated_id'],
        data['rating'],
        data.get('feedback', '')
    )
    
    return jsonify({'id': rating_id, 'message': 'Rating added successfully'})

# Admin Routes
@app.route('/api/admin/users', methods=['GET'])
@require_auth
@require_admin
def admin_get_users():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    
    with get_db() as conn:
        offset = (page - 1) * per_page
        users = conn.execute('''
            SELECT id, username, name, email, location, is_banned, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ''', (per_page, offset)).fetchall()
        
        total = conn.execute('SELECT COUNT(*) as count FROM users').fetchone()
    
    return jsonify({
        'users': [dict(user) for user in users],
        'total': total['count'],
        'page': page,
        'per_page': per_page
    })

@app.route('/api/admin/users/<int:user_id>/ban', methods=['PUT'])
@require_auth
@require_admin
def admin_ban_user(user_id):
    data = request.get_json()
    is_banned = data.get('is_banned', True)
    
    UserModel.update_user(user_id, is_banned=is_banned)
    return jsonify({'message': 'User ban status updated successfully'})

if __name__ == '__main__':
    init_db()
    create_admin()
    app.run(debug=True)