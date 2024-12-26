// src/App.js
import React, { useState } from "react";
import LoginMaterial from "./components/LoginMaterial";
import Register from "./components/Register";
import Home from "./components/Home";

function App() {
  const [user, setUser] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Handle login action
  const handleLogin = (loggedInUser) => {
    if (loggedInUser) {
      console.log("User logged in:", loggedInUser); // Debugging log
      setUser(loggedInUser); // Set the logged-in user
    } else {
      console.log("Redirecting to registration page.");
      setIsRegistering(true); // Redirect to the register page
    }
  };

  // Handle logout action
  const handleLogout = () => {
    console.log("User logged out.");
    setUser(null); // Clear the user state
    setIsRegistering(false); // Redirect to login
  };

  // Handle successful registration
  const handleRegistration = () => {
    console.log("Registration successful. Redirecting to login.");
    setIsRegistering(false); // Redirect to login page after registration
  };

  return (
    <div>
      {user ? (
        <Home user={user} onLogout={handleLogout} />
      ) : isRegistering ? (
        <Register onRegister={handleRegistration} />
      ) : (
        <LoginMaterial onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
