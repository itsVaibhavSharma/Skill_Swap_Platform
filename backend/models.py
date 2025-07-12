import sqlite3
import hashlib
import uuid
from datetime import datetime
import os

DATABASE = 'skill_swap.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.executescript('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                location TEXT,
                profile_photo TEXT,
                bio TEXT,
                availability TEXT,
                is_public BOOLEAN DEFAULT 1,
                is_admin BOOLEAN DEFAULT 0,
                is_banned BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reset_token TEXT
            );

            CREATE TABLE IF NOT EXISTS skills_offered (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                skill_name TEXT NOT NULL,
                description TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            CREATE TABLE IF NOT EXISTS skills_wanted (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                skill_name TEXT NOT NULL,
                description TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            CREATE TABLE IF NOT EXISTS swap_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                requester_id INTEGER,
                provider_id INTEGER,
                skill_offered TEXT NOT NULL,
                skill_wanted TEXT NOT NULL,
                message TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (requester_id) REFERENCES users (id),
                FOREIGN KEY (provider_id) REFERENCES users (id)
            );

            CREATE TABLE IF NOT EXISTS ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                swap_request_id INTEGER,
                rater_id INTEGER,
                rated_id INTEGER,
                rating INTEGER CHECK(rating >= 1 AND rating <= 5),
                feedback TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (swap_request_id) REFERENCES swap_requests (id),
                FOREIGN KEY (rater_id) REFERENCES users (id),
                FOREIGN KEY (rated_id) REFERENCES users (id)
            );

            CREATE TABLE IF NOT EXISTS admin_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''')

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def generate_reset_token():
    return str(uuid.uuid4())

class UserModel:
    @staticmethod
    def create_user(username, email, password, name, location=None):
        password_hash = hash_password(password)
        with get_db() as conn:
            try:
                cursor = conn.execute(
                    'INSERT INTO users (username, email, password_hash, name, location) VALUES (?, ?, ?, ?, ?)',
                    (username, email, password_hash, name, location)
                )
                return cursor.lastrowid
            except sqlite3.IntegrityError:
                return None

    @staticmethod
    def authenticate(username, password):
        password_hash = hash_password(password)
        with get_db() as conn:
            user = conn.execute(
                'SELECT * FROM users WHERE username = ? AND password_hash = ? AND is_banned = 0',
                (username, password_hash)
            ).fetchone()
            return dict(user) if user else None

    @staticmethod
    def get_user(user_id):
        with get_db() as conn:
            user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
            return dict(user) if user else None

    @staticmethod
    def update_user(user_id, **kwargs):
        fields = []
        values = []
        for key, value in kwargs.items():
            if value is not None:
                fields.append(f"{key} = ?")
                values.append(value)
        
        if not fields:
            return False
            
        values.append(user_id)
        query = f"UPDATE users SET {', '.join(fields)} WHERE id = ?"
        
        with get_db() as conn:
            conn.execute(query, values)
            return True

    @staticmethod
    def search_users(query, page=1, per_page=10):
        offset = (page - 1) * per_page
        with get_db() as conn:
            users = conn.execute('''
                SELECT DISTINCT u.id, u.username, u.name, u.location, u.profile_photo, u.bio
                FROM users u
                LEFT JOIN skills_offered so ON u.id = so.user_id
                LEFT JOIN skills_wanted sw ON u.id = sw.user_id
                WHERE u.is_public = 1 AND u.is_banned = 0 AND (
                    u.name LIKE ? OR u.location LIKE ? OR 
                    so.skill_name LIKE ? OR sw.skill_name LIKE ?
                )
                LIMIT ? OFFSET ?
            ''', (f'%{query}%', f'%{query}%', f'%{query}%', f'%{query}%', per_page, offset)).fetchall()
            return [dict(user) for user in users]

class SkillModel:
    @staticmethod
    def add_skill_offered(user_id, skill_name, description):
        with get_db() as conn:
            cursor = conn.execute(
                'INSERT INTO skills_offered (user_id, skill_name, description) VALUES (?, ?, ?)',
                (user_id, skill_name, description)
            )
            return cursor.lastrowid

    @staticmethod
    def add_skill_wanted(user_id, skill_name, description):
        with get_db() as conn:
            cursor = conn.execute(
                'INSERT INTO skills_wanted (user_id, skill_name, description) VALUES (?, ?, ?)',
                (user_id, skill_name, description)
            )
            return cursor.lastrowid

    @staticmethod
    def get_user_skills(user_id):
        with get_db() as conn:
            offered = conn.execute(
                'SELECT * FROM skills_offered WHERE user_id = ?', (user_id,)
            ).fetchall()
            wanted = conn.execute(
                'SELECT * FROM skills_wanted WHERE user_id = ?', (user_id,)
            ).fetchall()
            return {
                'offered': [dict(skill) for skill in offered],
                'wanted': [dict(skill) for skill in wanted]
            }

    @staticmethod
    def delete_skill_offered(skill_id, user_id):
        with get_db() as conn:
            conn.execute('DELETE FROM skills_offered WHERE id = ? AND user_id = ?', (skill_id, user_id))

    @staticmethod
    def delete_skill_wanted(skill_id, user_id):
        with get_db() as conn:
            conn.execute('DELETE FROM skills_wanted WHERE id = ? AND user_id = ?', (skill_id, user_id))

class SwapModel:
    @staticmethod
    def create_swap_request(requester_id, provider_id, skill_offered, skill_wanted, message):
        with get_db() as conn:
            cursor = conn.execute('''
                INSERT INTO swap_requests (requester_id, provider_id, skill_offered, skill_wanted, message)
                VALUES (?, ?, ?, ?, ?)
            ''', (requester_id, provider_id, skill_offered, skill_wanted, message))
            return cursor.lastrowid

    @staticmethod
    def get_user_swaps(user_id):
        with get_db() as conn:
            sent = conn.execute('''
                SELECT sr.*, u.name as provider_name, u.username as provider_username
                FROM swap_requests sr
                JOIN users u ON sr.provider_id = u.id
                WHERE sr.requester_id = ?
                ORDER BY sr.created_at DESC
            ''', (user_id,)).fetchall()
            
            received = conn.execute('''
                SELECT sr.*, u.name as requester_name, u.username as requester_username
                FROM swap_requests sr
                JOIN users u ON sr.requester_id = u.id
                WHERE sr.provider_id = ?
                ORDER BY sr.created_at DESC
            ''', (user_id,)).fetchall()
            
            return {
                'sent': [dict(swap) for swap in sent],
                'received': [dict(swap) for swap in received]
            }

    @staticmethod
    def update_swap_status(swap_id, status, user_id):
        with get_db() as conn:
            conn.execute('''
                UPDATE swap_requests 
                SET status = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND provider_id = ?
            ''', (status, swap_id, user_id))

    @staticmethod
    def delete_swap_request(swap_id, user_id):
        with get_db() as conn:
            conn.execute('''
                DELETE FROM swap_requests 
                WHERE id = ? AND requester_id = ? AND status = 'pending'
            ''', (swap_id, user_id))

class RatingModel:
    @staticmethod
    def add_rating(swap_request_id, rater_id, rated_id, rating, feedback):
        with get_db() as conn:
            cursor = conn.execute('''
                INSERT INTO ratings (swap_request_id, rater_id, rated_id, rating, feedback)
                VALUES (?, ?, ?, ?, ?)
            ''', (swap_request_id, rater_id, rated_id, rating, feedback))
            return cursor.lastrowid

    @staticmethod
    def get_user_ratings(user_id):
        with get_db() as conn:
            ratings = conn.execute('''
                SELECT r.*, u.name as rater_name
                FROM ratings r
                JOIN users u ON r.rater_id = u.id
                WHERE r.rated_id = ?
                ORDER BY r.created_at DESC
            ''', (user_id,)).fetchall()
            return [dict(rating) for rating in ratings]

    @staticmethod
    def get_average_rating(user_id):
        with get_db() as conn:
            result = conn.execute(
                'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM ratings WHERE rated_id = ?',
                (user_id,)
            ).fetchone()
            return dict(result) if result else {'avg_rating': 0, 'count': 0}