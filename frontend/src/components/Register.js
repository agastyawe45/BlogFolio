import React, { useState } from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import axios from "axios";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    mobileNumber: "",
    country: "",
    state: "",
    city: "",
    zipCode: "",
    password: "",
    confirmPassword: "",
    accountType: "Regular",
  });

  const [profileImage, setProfileImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to validate the selected image
  const validateImage = (file) => {
    if (!file) {
      setMessage("Please select a profile image.");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("Image size exceeds 10 MB.");
      return false;
    }
    if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
      setMessage("Invalid image type. Allowed types: jpeg, png, gif.");
      return false;
    }
    return true;
  };

  // Function to handle profile image upload to S3 via pre-signed URL
  const handleImageUpload = async () => {
    console.log("Starting image upload...");
    if (!profileImage || !validateImage(profileImage)) return null;

    try {
      console.log("Requesting pre-signed URL for image upload...");
      const response = await axios.post("/api/get-presigned-url", {
        filename: profileImage.name,
        contentType: profileImage.type,
      });

      console.log("Pre-signed URL received:", response.data.url);

      return await uploadToS3(response.data.url, profileImage);
    } catch (error) {
      console.error("Error during image upload:", error.message);
      setMessage("Failed to upload profile image.");
      return null;
    }
  };

  // Function to upload an image to S3 using a pre-signed URL
  const uploadToS3 = async (preSignedUrl, file) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", preSignedUrl, true);
      xhr.setRequestHeader("Content-Type", file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          console.log("Image uploaded successfully.");
          resolve(preSignedUrl.split("?")[0]); // Return the public URL of the uploaded file
        } else {
          console.error("Image upload to S3 failed.");
          reject(new Error("Failed to upload file to S3."));
        }
      };

      xhr.onerror = () => {
        console.error("An error occurred during the upload.");
        reject(new Error("Upload error."));
      };

      xhr.send(file);
    });
  };

  // Handle form submission for user registration
  const handleSubmit = async () => {
    console.log("Form submission started with data:", formData);

    setIsSubmitting(true);
    setMessage("");

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    // Upload the profile image to S3
    const s3ImageUrl = await handleImageUpload();
    if (!s3ImageUrl) {
      setIsSubmitting(false);
      return;
    }

    try {
      console.log("Sending registration data to backend...");
      const response = await axios.post("/api/register", {
        ...formData,
        profileImage: s3ImageUrl,
      });

      if (response.data.success) {
        setMessage("User registered successfully!");
        console.log("User registered successfully:", response.data);

        // Reset form and image state
        setFormData({
          username: "",
          mobileNumber: "",
          country: "",
          state: "",
          city: "",
          zipCode: "",
          password: "",
          confirmPassword: "",
          accountType: "Regular",
        });
        setProfileImage(null);
        setUploadProgress(0);
      } else {
        setMessage(response.data.message || "Registration failed.");
        console.warn("Registration failed:", response.data.message);
      }
    } catch (error) {
      console.error("Error during registration:", error.message);
      setMessage("Failed to register user.");
    } finally {
      setIsSubmitting(false);
      console.log("Form submission completed.");
    }
  };

  return (
    <Container maxWidth="md">
      <Box mt={5} p={4} boxShadow={3} borderRadius={2}>
        <Typography variant="h4" gutterBottom>
          Create a New User
        </Typography>
        {message && (
          <Typography color={message.includes("successfully") ? "green" : "error"}>
            {message}
          </Typography>
        )}
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
          <Box>
            <Typography>Upload Photo</Typography>
            <input
              type="file"
              accept=".jpeg, .jpg, .png, .gif"
              onChange={(e) => {
                setProfileImage(e.target.files[0]);
                setUploadProgress(0);
                console.log("Selected profile image:", e.target.files[0]);
              }}
            />
            <Typography variant="body2">
              Allowed: *.jpeg, *.jpg, *.png, *.gif - max size of 10 MB
            </Typography>
          </Box>
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.accountType === "Premium"}
                  onChange={(e) =>
                    setFormData({ ...formData, accountType: e.target.checked ? "Premium" : "Regular" })
                  }
                />
              }
              label="Premium"
            />
          </Box>
        </Box>
        {uploadProgress > 0 && <LinearProgress variant="determinate" value={uploadProgress} />}
        <Box mt={3} display="grid" gap={2} gridTemplateColumns="repeat(2, 1fr)">
          <TextField
            label="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
          <PhoneInput
            country={"us"}
            value={formData.mobileNumber}
            onChange={(phone) => setFormData({ ...formData, mobileNumber: phone })}
          />
          <TextField
            label="Country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          />
          <TextField
            label="State"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          />
          <TextField
            label="City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          <TextField
            label="Zip Code"
            value={formData.zipCode}
            onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
          />
          <TextField
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <TextField
            label="Re-enter Password"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          />
        </Box>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleSubmit}
          sx={{ mt: 3 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? <CircularProgress size={24} /> : "Create User"}
        </Button>
      </Box>
    </Container>
  );
};

export default Register;
