// src/App.js
import React, { useState } from "react";
import LoginMaterial from "./components/LoginMaterial";
import Register from "./components/Register";
import Home from "./components/Home";

function App() {
  const [user, setUser] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  return (
    <div>
      {user ? (
        <Home user={user} />
      ) : isRegistering ? (
        <Register onRegister={() => setIsRegistering(false)} />
      ) : (
        <LoginMaterial
          onLogin={(user) => (user ? setUser(user) : setIsRegistering(true))}
        />
      )}
    </div>
  );
}

export default App;
