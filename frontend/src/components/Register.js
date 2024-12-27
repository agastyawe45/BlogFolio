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
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to handle profile image upload to S3 via pre-signed URL
  const handleImageUpload = async () => {
    if (!profileImage) {
      setMessage("Please select a profile image.");
      return null;
    }

    // Validate file size and type
    if (profileImage.size > 10 * 1024 * 1024) {
      setMessage("Image size exceeds 10 MB.");
      return null;
    }
    if (!["image/jpeg", "image/png", "image/gif"].includes(profileImage.type)) {
      setMessage("Invalid image type. Allowed types: jpeg, png, gif.");
      return null;
    }

    try {
      console.log("Sending request for pre-signed URL...");
      const response = await axios.post(`/api/get-presigned-url`, {
        filename: profileImage.name,
        contentType: profileImage.type,
      });
      const { url } = response.data;
      console.log("Received pre-signed URL:", url);

      console.log("Uploading file to S3...");
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: profileImage,
        headers: {
          "Content-Type": profileImage.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to S3.");
      }
      console.log("File uploaded successfully.");
      return url.split("?")[0];
    } catch (error) {
      console.error("Error uploading image:", error);
      setMessage("Failed to upload profile image.");
      return null;
    }
  };

  // Handle form submission for user registration
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setMessage("");

    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    const s3ImageUrl = await handleImageUpload();
    if (!s3ImageUrl) {
      setIsSubmitting(false);
      return;
    }

    try {
      console.log("Submitting registration form...");
      const response = await axios.post(`/api/register`, {
        ...formData,
        profileImage: s3ImageUrl,
      });

      if (response.data.success) {
        console.log("Registration successful:", response.data);
        setMessage("User registered successfully!");
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
      } else {
        console.log("Registration failed:", response.data.message);
        setMessage(response.data.message || "Registration failed.");
      }
    } catch (error) {
      console.error("Error during registration:", error);
      setMessage("Failed to register user.");
    } finally {
      setIsSubmitting(false);
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
              onChange={(e) => setProfileImage(e.target.files[0])}
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
                    setFormData({
                      ...formData,
                      accountType: e.target.checked ? "Premium" : "Regular",
                    })
                  }
                />
              }
              label="Premium"
            />
          </Box>
        </Box>
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
