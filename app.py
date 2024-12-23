from flask import Flask, request, jsonify, redirect, url_for, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
import boto3
import os
import rsa
import time
import json
from base64 import b64encode

# Initialize Flask app
app = Flask(__name__, static_folder="frontend/build")

# Enable CORS
CORS(app)

# SQLite Database Configuration
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///users.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# AWS S3 and CloudFront Configuration
UPLOADS_BUCKET = os.getenv("UPLOADS_BUCKET_NAME", "ase-uploads")
CONTENT_BUCKET = os.getenv("CONTENT_BUCKET_NAME", "ase-content")
CLOUDFRONT_DOMAIN = os.getenv("CLOUDFRONT_DOMAIN")
CLOUDFRONT_KEY_PAIR_ID = os.getenv("CLOUDFRONT_KEY_PAIR_ID")
PRIVATE_KEY_PATH = os.getenv("PRIVATE_KEY_PATH")

# Initialize boto3 client
s3 = boto3.client("s3")

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    account_type = db.Column(db.String(10), nullable=False)
    profile_image = db.Column(db.String(255), nullable=True)

# Serve React App
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react_app(path):
    if path != "" and os.path.exists(app.static_folder + "/" + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")

# Login API
@app.route("/api/login", methods=["POST"])
def login_page():
    data = request.json
    user = User.query.filter_by(username=data.get("username")).first()
    if user and check_password_hash(user.password, data.get("password")):
        return jsonify({
            "success": True,
            "user": {
                "username": user.username,
                "email": user.email,
                "accountType": user.account_type,
                "profileImage": user.profile_image,
            },
        })
    return jsonify({"success": False, "message": "Invalid username or password."}), 401

# Registration API
@app.route("/api/register", methods=["POST"])
def register():
    try:
        data = request.json
        required_fields = ["username", "password", "email", "accountType", "profileImage"]
        if not all(field in data for field in required_fields):
            return jsonify({"success": False, "message": "Missing required fields"}), 400

        if User.query.filter_by(username=data["username"]).first():
            return jsonify({"success": False, "message": "Username already exists."}), 409

        hashed_password = generate_password_hash(data["password"], method="pbkdf2:sha256")

        new_user = User(
            username=data["username"],
            password=hashed_password,
            email=data["email"],
            account_type=data["accountType"],
            profile_image=data["profileImage"],
        )
        db.session.add(new_user)
        db.session.commit()

        return jsonify({"success": True, "message": "User registered successfully."}), 201
    except Exception as e:
        app.logger.error(f"Error in /api/register: {e}")
        return jsonify({"success": False, "message": "Internal Server Error"}), 500

# Pre-signed URL API
@app.route("/api/get-presigned-url", methods=["POST"])
def get_presigned_url():
    data = request.json
    filename = data.get("filename")
    content_type = data.get("contentType", "application/octet-stream")

    if not filename:
        return jsonify({"success": False, "message": "Filename is required"}), 400

    try:
        presigned_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": UPLOADS_BUCKET,
                "Key": filename,
                "ContentType": content_type,
            },
            ExpiresIn=3600,
        )
        return jsonify({"url": presigned_url}), 200
    except Exception as e:
        app.logger.error(f"Error generating pre-signed URL: {e}")
        return jsonify({"success": False, "message": "Failed to generate pre-signed URL"}), 500

# Function: Generate CloudFront Signed URL
def generate_signed_url(file_path):
    try:
        expires = int(time.time()) + 3600
        url = f"https://{CLOUDFRONT_DOMAIN}/{file_path}"
        policy = {
            "Statement": [
                {
                    "Resource": url,
                    "Condition": {
                        "DateLessThan": {"AWS:EpochTime": expires}
                    }
                }
            ]
        }

        policy_json = json.dumps(policy)
        with open(PRIVATE_KEY_PATH, "rb") as key_file:
            private_key = rsa.PrivateKey.load_pkcs1(key_file.read())

        signature = rsa.sign(policy_json.encode("utf-8"), private_key, "SHA-1")
        encoded_signature = b64encode(signature).decode("utf-8")

        signed_url = (
            f"{url}?Policy={b64encode(policy_json.encode('utf-8')).decode('utf-8')}"
            f"&Signature={encoded_signature}&Key-Pair-Id={CLOUDFRONT_KEY_PAIR_ID}"
        )

        return signed_url
    except Exception as e:
        app.logger.error(f"Error generating signed URL: {e}")
        return None

# CloudFront Signed URLs API
@app.route("/api/get-signed-urls", methods=["POST"])
def get_signed_urls():
    data = request.json
    account_type = data.get("accountType")

    if not account_type:
        return jsonify({"success": False, "message": "Account type is required"}), 400

    try:
        folders = ["regular"]
        if account_type == "Premium":
            folders.append("premium")

        files = []
        for folder in folders:
            objects = s3.list_objects_v2(Bucket=CONTENT_BUCKET, Prefix=f"{folder}/").get("Contents", [])
            for obj in objects:
                file_name = obj["Key"].split("/")[-1]
                file_path = obj["Key"]

                signed_url = generate_signed_url(file_path)
                if signed_url:
                    files.append({"name": file_name, "url": signed_url})

        return jsonify({"success": True, "files": files}), 200
    except Exception as e:
        app.logger.error(f"Error generating signed URLs: {e}")
        return jsonify({"success": False, "message": "Failed to fetch files."}), 500

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)
