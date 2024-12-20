from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
import boto3

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for cross-origin requests
CORS(app)

# SQLite Database Configuration
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///users.db"  # Creates users.db in the current directory
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False  # Suppress deprecation warnings

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# AWS S3 Configuration
S3_BUCKET = "blogfolio143"  # Your actual bucket name
AWS_ACCESS_KEY = "AKIA2AUOOXJAJ4T6XU7J"  # Your actual access key
AWS_SECRET_KEY = "eE9kqntEJcHeBJnRMWY5bRR7OCQELVVZJ5xIybQ6"  # Your actual secret key
AWS_REGION = "us-west-2"  # Your actual region

# Initialize boto3 client with the correct region
s3 = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=AWS_REGION  # Specify the correct region here
)

try:
    response = s3.list_buckets()
    print("Buckets:", [bucket["Name"] for bucket in response["Buckets"]])
except Exception as e:
    print("Error initializing S3:", e)

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    account_type = db.Column(db.String(10), nullable=False)
    profile_image = db.Column(db.String(255), nullable=True)  # URL of the uploaded profile image

# Register Endpoint
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
            account_type=data["accountType"],  # Either "Premium" or "Regular"
            profile_image=data["profileImage"],  # S3 URL of the uploaded profile image
        )
        db.session.add(new_user)
        db.session.commit()

        return jsonify({"success": True, "message": "User registered successfully."}), 201
    except Exception as e:
        app.logger.error(f"Error in /register: {e}")
        return jsonify({"success": False, "message": "Internal Server Error"}), 500

# Login Endpoint
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
                "Bucket": S3_BUCKET,
                "Key": filename,
                "ContentType": "application/octet-stream",  # Adjust as needed for file types
            },
            ExpiresIn=3600,  # URL expiration time in seconds
        )
        app.logger.info(f"Generated pre-signed URL: {presigned_url}")
        return jsonify({"url": presigned_url}), 200
    except Exception as e:
        app.logger.error(f"Error generating pre-signed URL: {e}")
        if "region" in str(e).lower():
            return jsonify({"success": False, "message": "Region mismatch detected. Check bucket region."}), 500
        elif "signature" in str(e).lower():
            return jsonify({"success": False, "message": "Signature mismatch. Check AWS credentials and bucket region."}), 500
        return jsonify({"success": False, "message": "Failed to generate pre-signed URL"}), 500

if __name__ == "__main__":
    # Create the database tables before running the server
    with app.app_context():
        db.create_all()

    # Run the Flask app
    app.run(port=5000, debug=True)
