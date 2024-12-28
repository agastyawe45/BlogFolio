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
    console.log("Starting image upload...");

    if (!profileImage) {
      console.warn("No profile image selected.");
      setMessage("Please select a profile image.");
      return null;
    }

    // Validate file size and type
    if (profileImage.size > 10 * 1024 * 1024) {
      console.error("Image size exceeds the limit of 10 MB.");
      setMessage("Image size exceeds 10 MB.");
      return null;
    }
    if (!["image/jpeg", "image/png", "image/gif"].includes(profileImage.type)) {
      console.error("Invalid image type selected.");
      setMessage("Invalid image type. Allowed types: jpeg, png, gif.");
      return null;
    }

    try {
      console.log("Requesting pre-signed URL for image upload...");
      const response = await axios.post("/api/get-presigned-url", {
        filename: profileImage.name,
        contentType: profileImage.type,
      });

      console.log("Pre-signed URL received:", response.data.url);

      console.log("Uploading image to S3...");
      const uploadResponse = await fetch(response.data.url, {
        method: "PUT",
        body: profileImage,
        headers: {
          "Content-Type": profileImage.type,
        },
      });

      if (!uploadResponse.ok) {
        console.error("Image upload to S3 failed.");
        throw new Error("Failed to upload file to S3.");
      }

      console.log("Image uploaded successfully.");
      return response.data.url.split("?")[0];
    } catch (error) {
      console.error("Error during image upload:", error.message);
      setMessage("Failed to upload profile image.");
      return null;
    }
  };

  // Handle form submission for user registration
  const handleSubmit = async () => {
    console.log("Form submission started with data:", formData);

    setIsSubmitting(true);
    setMessage("");

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      console.error("Passwords do not match.");
      setMessage("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    // Upload the profile image to S3
    const s3ImageUrl = await handleImageUpload();
    if (!s3ImageUrl) {
      console.error("Image upload failed. Aborting registration.");
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
        console.log("User registered successfully:", response.data);
        setMessage("User registered successfully!");

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
      } else {
        console.warn("Registration failed:", response.data.message);
        setMessage(response.data.message || "Registration failed.");
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
                console.log("Selected profile image:", e.target.files[0]);
                setProfileImage(e.target.files[0]);
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
                  onChange={(e) => {
                    const accountType = e.target.checked ? "Premium" : "Regular";
                    console.log("Account type changed to:", accountType);
                    setFormData({ ...formData, accountType });
                  }}
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
            onChange={(e) => {
              console.log("Username changed to:", e.target.value);
              setFormData({ ...formData, username: e.target.value });
            }}
          />
          <PhoneInput
            country={"us"}
            value={formData.mobileNumber}
            onChange={(phone) => {
              console.log("Mobile number changed to:", phone);
              setFormData({ ...formData, mobileNumber: phone });
            }}
          />
          <TextField
            label="Country"
            value={formData.country}
            onChange={(e) => {
              console.log("Country changed to:", e.target.value);
              setFormData({ ...formData, country: e.target.value });
            }}
          />
          <TextField
            label="State"
            value={formData.state}
            onChange={(e) => {
              console.log("State changed to:", e.target.value);
              setFormData({ ...formData, state: e.target.value });
            }}
          />
          <TextField
            label="City"
            value={formData.city}
            onChange={(e) => {
              console.log("City changed to:", e.target.value);
              setFormData({ ...formData, city: e.target.value });
            }}
          />
          <TextField
            label="Zip Code"
            value={formData.zipCode}
            onChange={(e) => {
              console.log("Zip Code changed to:", e.target.value);
              setFormData({ ...formData, zipCode: e.target.value });
            }}
          />
          <TextField
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => {
              console.log("Password updated.");
              setFormData({ ...formData, password: e.target.value });
            }}
          />
          <TextField
            label="Re-enter Password"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => {
              console.log("Confirm password updated.");
              setFormData({ ...formData, confirmPassword: e.target.value });
            }}
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
