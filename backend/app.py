from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
import boto3
import os
import rsa
import time
from base64 import b64encode

# Initialize Flask app
app = Flask(__name__)

# Enable CORS
CORS(app)

# SQLite Database Configuration
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///users.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# AWS S3 and CloudFront Configuration
UPLOADS_BUCKET = os.getenv("UPLOADS_BUCKET_NAME", "ase-uploads")  # Bucket for uploaded images
CONTENT_BUCKET = os.getenv("CONTENT_BUCKET_NAME", "ase-content")  # Bucket with 'regular' and 'premium' folders
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
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
    profile_image = db.Column(db.String(255), nullable=True)  # S3 URL of the uploaded profile image

# Endpoint: Register
@app.route("/register", methods=["POST"])
def register():
    try:
        data = request.json

        # Validate required fields
        required_fields = ["username", "password", "email", "accountType", "profileImage"]
        if not all(field in data for field in required_fields):
            return jsonify({"success": False, "message": "Missing required fields"}), 400

        # Check if the username already exists
        if User.query.filter_by(username=data["username"]).first():
            return jsonify({"success": False, "message": "Username already exists."}), 409

        # Hash the password using pbkdf2:sha256
        hashed_password = generate_password_hash(data["password"], method="pbkdf2:sha256")

        # Save user to the database
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
        app.logger.error(f"Error in /register: {e}")
        return jsonify({"success": False, "message": "Internal Server Error"}), 500

# Endpoint: Login
@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.json

        # Check if the username exists
        user = User.query.filter_by(username=data["username"]).first()
        if user and check_password_hash(user.password, data["password"]):
            return jsonify(
                {
                    "success": True,
                    "user": {
                        "username": user.username,
                        "email": user.email,
                        "accountType": user.account_type,
                        "profileImage": user.profile_image,
                    },
                }
            )
        return jsonify({"success": False, "message": "Invalid username or password."}), 401
    except Exception as e:
        app.logger.error(f"Error in /login: {e}")
        return jsonify({"success": False, "message": "Internal Server Error"}), 500

# Endpoint: Generate S3 Pre-Signed URL for Uploads Bucket
@app.route("/get-presigned-url", methods=["POST"])
def get_presigned_url():
    data = request.json
    filename = data.get("filename")

    if not filename:
        return jsonify({"success": False, "message": "Filename is required"}), 400

    try:
        # Generate pre-signed URL for PUT operation
        presigned_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": UPLOADS_BUCKET,
                "Key": filename,
                "ContentType": "application/octet-stream",
            },
            ExpiresIn=3600,
        )
        return jsonify({"url": presigned_url}), 200
    except Exception as e:
        app.logger.error(f"Error generating pre-signed URL: {e}")
        return jsonify({"success": False, "message": "Failed to generate pre-signed URL"}), 500

# Endpoint: Generate CloudFront Signed URLs for Content Bucket
@app.route("/get-signed-urls", methods=["POST"])
def get_signed_urls():
    data = request.json
    account_type = data.get("accountType")

    if not account_type:
        return jsonify({"success": False, "message": "Account type is required"}), 400

    try:
        # Define folders based on account type
        folders = ["regular"]
        if account_type == "Premium":
            folders.append("premium")

        files = []
        for folder in folders:
            objects = s3.list_objects_v2(Bucket=CONTENT_BUCKET, Prefix=f"{folder}/").get("Contents", [])
            for obj in objects:
                file_name = obj["Key"].split("/")[-1]
                file_path = obj["Key"]

                # Generate signed URL using CloudFront
                with open(PRIVATE_KEY_PATH, "rb") as key_file:
                    private_key = rsa.PrivateKey.load_pkcs1(key_file.read())

                expires = int(time.time()) + 3600
                url = f"https://{CLOUDFRONT_DOMAIN}/{file_path}"
                policy = f'{{"Statement":[{{"Resource":"{url}","Condition":{{"DateLessThan":{{"AWS:EpochTime":{expires}}}}}}}]}}'

                signature = rsa.sign(policy.encode("utf-8"), private_key, "SHA-1")
                encoded_signature = b64encode(signature).decode("utf-8")

                signed_url = (
                    f"{url}?Policy={b64encode(policy.encode('utf-8')).decode('utf-8')}"
                    f"&Signature={encoded_signature}&Key-Pair-Id={CLOUDFRONT_KEY_PAIR_ID}"
                )

                files.append({"name": file_name, "url": signed_url})

        return jsonify({"success": True, "files": files}), 200
    except Exception as e:
        app.logger.error(f"Error generating signed URLs: {e}")
        return jsonify({"success": False, "message": "Failed to fetch files."}), 500

if __name__ == "__main__":
    # Create the database tables before running the server
    with app.app_context():
        db.create_all()

    # Run the Flask app
    app.run(port=5000, debug=True)
