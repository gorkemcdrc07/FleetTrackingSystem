import { useState } from "react";
import Login from "./pages/Login";
import Home from "./pages/Home";
import { clearSession, isAuthenticated } from "./services/sessionStorage";

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(
        isAuthenticated()
    );

    const handleLogin = () => {
        setIsLoggedIn(true);
    };

    const handleLogout = () => {
        clearSession();
        setIsLoggedIn(false);
    };

    return isLoggedIn ? <Home onLogout={handleLogout} /> : <Login onLogin={handleLogin} />;
}

export default App;
