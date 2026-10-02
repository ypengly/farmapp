import jwt
import datetime
from functools import wraps
from flask import request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash

SECRET = "farm-management-dev-secret-change-in-production"
ALGO = "HS256"


def hash_password(pw):
    return generate_password_hash(pw)


def verify_password(pw, pw_hash):
    return check_password_hash(pw_hash, pw)


def issue_token(user):
    payload = {
        "user_id": user["id"],
        "farm_id": user["farm_id"],
        "role": user["role"],
        "name": user["name"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)


def decode_token(token):
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGO])
    except jwt.PyJWTError:
        return None


def get_token_from_request():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth.split(" ", 1)[1]
    return None


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = get_token_from_request()
        payload = decode_token(token) if token else None
        if not payload:
            return jsonify({"error": "Unauthorized"}), 401
        request.user = payload
        return fn(*args, **kwargs)
    return wrapper


def roles_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        @login_required
        def wrapper(*args, **kwargs):
            if request.user["role"] not in allowed_roles:
                return jsonify({"error": "Forbidden: insufficient role"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
