import React, { useEffect, useState } from "react";
import { Container, Typography, Box, Button, CircularProgress } from "@mui/material";
import axios from "axios";

const Home = ({ user }) => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch files from the backend based on the user's account type
  useEffect(() => {
    const fetchFiles = async () => {
      console.log("Fetching accessible files for user:", user);

      setIsLoading(true);
      setError("");

      try {
        console.log("Sending request to fetch signed URLs for account type:", user.accountType);
        const response = await axios.post("/api/get-signed-urls", {
          accountType: user.accountType,
        });

        if (response.data.success) {
          console.log("Files fetched successfully:", response.data.files);
          setFiles(response.data.files);
        } else {
          console.warn("Failed to fetch files:", response.data.message);
          setError(response.data.message || "Failed to fetch files.");
        }
      } catch (err) {
        console.error("Error while fetching files:", err.response?.data || err.message);
        setError("Error fetching files. Please try again later.");
      } finally {
        setIsLoading(false);
        console.log("File fetching process completed.");
      }
    };

    fetchFiles();
  }, [user.accountType]);

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        mt={10}
        p={3}
        boxShadow={3}
        borderRadius={2}
      >
        <Typography variant="h4" gutterBottom>
          Welcome, {user.username}!
        </Typography>

        <Typography>Email: {user.email}</Typography>
        <Typography>Account Type: {user.accountType}</Typography>

        <Box mt={5} width="100%">
          <Typography variant="h6" gutterBottom>
            Accessible Files:
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" mt={3}>
              <CircularProgress />
              <Typography>Loading files...</Typography>
            </Box>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : files.length > 0 ? (
            files.map((file, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
                p={1}
                border={1}
                borderRadius={2}
              >
                <Typography>{file.name}</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => console.log(`File clicked: ${file.name} (URL: ${file.url})`)}
                >
                  View
                </Button>
              </Box>
            ))
          ) : (
            <Typography>No files available at the moment.</Typography>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default Home;
