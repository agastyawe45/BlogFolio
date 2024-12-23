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
    fullName: "",
    email: "",
    phoneNumber: "",
    country: "",
    stateRegion: "",
    city: "",
    address: "",
    zipCode: "",
    company: "",
    role: "",
    accountType: "Regular",
  });

  const [profileImage, setProfileImage] = useState(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API base URL from environment variables
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

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
      // Request a pre-signed URL from the backend
      const response = await axios.post(`${apiBaseUrl}/api/get-presigned-url`, {
        filename: profileImage.name,
        contentType: profileImage.type,
      });
      const { url } = response.data;

      // Upload the file directly to S3 using the pre-signed URL
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

      // Return the S3 URL of the uploaded file (without query parameters)
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

    // Upload the profile image and get the S3 URL
    const s3ImageUrl = await handleImageUpload();
    if (!s3ImageUrl) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Submit the registration form to the backend
      const response = await axios.post(`${apiBaseUrl}/api/register`, {
        ...formData,
        profileImage: s3ImageUrl,
      });

      if (response.data.success) {
        setMessage("User registered successfully!");
        // Reset form fields
        setFormData({
          fullName: "",
          email: "",
          phoneNumber: "",
          country: "",
          stateRegion: "",
          city: "",
          address: "",
          zipCode: "",
          company: "",
          role: "",
          accountType: "Regular",
        });
        setProfileImage(null);
      } else {
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
            label="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          />
          <TextField
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <PhoneInput
            country={"us"}
            value={formData.phoneNumber}
            onChange={(phone) => setFormData({ ...formData, phoneNumber: phone })}
          />
          <TextField
            label="Country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          />
          <TextField
            label="State/Region"
            value={formData.stateRegion}
            onChange={(e) => setFormData({ ...formData, stateRegion: e.target.value })}
          />
          <TextField
            label="City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          <TextField
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <TextField
            label="Zip/Code"
            value={formData.zipCode}
            onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
          />
          <TextField
            label="Company"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />
          <TextField
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
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
