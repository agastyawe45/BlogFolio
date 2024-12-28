from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
import boto3
import os
import rsa
import time
import json
from base64 import b64encode
import logging

# Initialize Flask app
app = Flask(__name__, static_folder="frontend/build")

# Enable CORS
CORS(app)

# Configure logging
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# SQLite Database Configuration
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///users.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# Load configuration from config.json
CONFIG_PATH = "/home/ubuntu/app/config.json"

def load_config(config_path):
    try:
        with open(config_path, "r") as file:
            config = json.load(file)
        logger.info("Configuration loaded successfully.")
        return config
    except FileNotFoundError:
        logger.error(f"Configuration file not found at {config_path}")
        raise RuntimeError("Configuration file not found.")
    except Exception as e:
        logger.error(f"Error loading configuration: {e}")
        raise RuntimeError("Failed to load configuration.")

config = load_config(CONFIG_PATH)

UPLOADS_BUCKET = config.get("uploads_bucket_name")
CONTENT_BUCKET = config.get("content_bucket_name")
CLOUDFRONT_DOMAIN = config.get("cloudfront_domain")
CLOUDFRONT_KEY_PAIR_ID = config.get("cloudfront_key_pair_id")
PRIVATE_KEY_PATH = config.get("cloudfront_private_key_path")

# Initialize boto3 client
s3 = boto3.client("s3", region_name="us-west-2")

# Utility functions for case conversion
def snake_to_camel(snake_str):
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

def camel_to_snake(camel_str):
    return ''.join(['_' + c.lower() if c.isupper() else c for c in camel_str]).lstrip('_')

def convert_keys(data, convert_func):
    if isinstance(data, dict):
        return {convert_func(k): convert_keys(v, convert_func) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_keys(item, convert_func) for item in data]
    else:
        return data

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    phone_number = db.Column(db.String(20), nullable=False)
    country = db.Column(db.String(50), nullable=False)
    state = db.Column(db.String(50), nullable=False)
    city = db.Column(db.String(50), nullable=False)
    zip_code = db.Column(db.String(20), nullable=False)
    account_type = db.Column(db.String(10), nullable=False)
    profile_image = db.Column(db.String(255), nullable=True)

# Serve React App
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react_app(path):
    try:
        if path != "" and os.path.exists(app.static_folder + "/" + path):
            logger.info(f"Serving file: {path}")
            return send_from_directory(app.static_folder, path)
        else:
            logger.info("Serving React index.html")
            return send_from_directory(app.static_folder, "index.html")
    except Exception as e:
        logger.error(f"Error serving React app: {e}")
        return jsonify({"success": False, "message": "Error serving React app"}), 500

# Login API
@app.route("/api/login", methods=["POST"])
def login_page():
    try:
        data = request.json
        logger.info(f"Login request received for username: {data.get('username')}")
        user = User.query.filter_by(username=data.get("username")).first()
        if user and check_password_hash(user.password, data.get("password")):
            logger.info("User authenticated successfully.")
            user_dict = {
                "username": user.username,
                "phone_number": user.phone_number,
                "country": user.country,
                "state": user.state,
                "city": user.city,
                "zip_code": user.zip_code,
                "account_type": user.account_type,
                "profile_image": user.profile_image,
            }
            response = convert_keys(user_dict, snake_to_camel)
            return jsonify({"success": True, "user": response})
        logger.warning("Invalid username or password.")
        return jsonify({"success": False, "message": "Invalid username or password."}), 401
    except Exception as e:
        logger.error(f"Error in login endpoint: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500

# Registration API
@app.route("/api/register", methods=["POST"])
def register():
    try:
        data = request.json
        logger.info(f"Registration request received: {data}")
        data = convert_keys(data, camel_to_snake)
        required_fields = ["username", "password", "phone_number", "country", "state", "city", "zip_code", "account_type"]
        if not all(field in data for field in required_fields):
            logger.error("Missing required fields in registration data.")
            return jsonify({"success": False, "message": "Missing required fields"}), 400

        if User.query.filter_by(username=data["username"]).first():
            logger.warning(f"Username already exists: {data['username']}")
            return jsonify({"success": False, "message": "Username already exists."}), 409

        hashed_password = generate_password_hash(data["password"], method="pbkdf2:sha256")
        new_user = User(
            username=data["username"],
            password=hashed_password,
            phone_number=data["phone_number"],
            country=data["country"],
            state=data["state"],
            city=data["city"],
            zip_code=data["zip_code"],
            account_type=data["account_type"],
            profile_image=data.get("profile_image"),
        )
        db.session.add(new_user)
        db.session.commit()
        logger.info("User registered successfully.")
        return jsonify({"success": True, "message": "User registered successfully."}), 201
    except Exception as e:
        logger.error(f"Error in registration endpoint: {e}")
        return jsonify({"success": False, "message": "Internal Server Error"}), 500

# Pre-signed URL API
@app.route("/api/get-presigned-url", methods=["POST"])
def get_presigned_url():
    try:
        data = request.json
        logger.info(f"Pre-signed URL request received: {data}")
        filename = data.get("filename")
        content_type = data.get("contentType", "application/octet-stream")
        if not filename:
            logger.error("Filename is required but not provided.")
            return jsonify({"success": False, "message": "Filename is required"}), 400

        presigned_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": UPLOADS_BUCKET,
                "Key": filename,
                "ContentType": content_type,
            },
            ExpiresIn=3600,
        )
        logger.info(f"Pre-signed URL generated: {presigned_url}")
        return jsonify({"url": presigned_url}), 200
    except Exception as e:
        logger.error(f"Error generating pre-signed URL: {e}")
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

        logger.info(f"Generated signed URL: {signed_url}")
        return signed_url
    except Exception as e:
        logger.error(f"Error generating signed URL: {e}")
        return None

# CloudFront Signed URLs API
@app.route("/api/get-signed-urls", methods=["POST"])
def get_signed_urls():
    try:
        data = request.json
        logger.info(f"Signed URLs request received for account type: {data.get('accountType')}")
        account_type = data.get("accountType")

        if not account_type:
            logger.error("Account type is required but not provided.")
            return jsonify({"success": False, "message": "Account type is required"}), 400

        files = []

        # Regular content access without signed URLs
        regular_objects = s3.list_objects_v2(Bucket=CONTENT_BUCKET, Prefix="regular/").get("Contents", [])
        for obj in regular_objects:
            files.append({
                "name": obj["Key"].split("/")[-1],
                "url": f"https://{CLOUDFRONT_DOMAIN}/{obj['Key']}"
            })

        # Premium content with signed URLs if the user is premium
        if account_type == "Premium":
            premium_objects = s3.list_objects_v2(Bucket=CONTENT_BUCKET, Prefix="premium/").get("Contents", [])
            for obj in premium_objects:
                signed_url = generate_signed_url(obj["Key"])
                if signed_url:
                    files.append({
                        "name": obj["Key"].split("/")[-1],
                        "url": signed_url
                    })

        logger.info(f"Generated file list for account type {account_type}: {files}")
        return jsonify({"success": True, "files": files}), 200
    except Exception as e:
        logger.error(f"Error generating signed URLs: {e}")
        return jsonify({"success": False, "message": "Failed to fetch files."}), 500

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    logger.info("Starting Flask application...")
    app.run(host="0.0.0.0", port=5000, debug=True)
