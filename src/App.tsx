import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Home from "./pages/Home";
import { TrackedVehiclesProvider } from "./context/TrackedVehiclesContext";
import { AUTH_MODES, getAuthMode, getSupabaseAuthSession, signOutAuth } from "./services/authService";
import { clearSession, isAuthenticated } from "./services/sessionStorage";

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(
        isAuthenticated()
    );
    const [authChecked, setAuthChecked] = useState(getAuthMode() !== AUTH_MODES.SUPABASE);

    useEffect(() => {
        if (getAuthMode() !== AUTH_MODES.SUPABASE) return;
        getSupabaseAuthSession()
            .then((session) => {
                const authenticated = Boolean(session) && isAuthenticated();
                if (!authenticated) clearSession();
                setIsLoggedIn(authenticated);
            })
            .catch(() => {
                clearSession();
                setIsLoggedIn(false);
            })
            .finally(() => setAuthChecked(true));
    }, []);

    const handleLogin = () => {
        setIsLoggedIn(true);
    };

    const handleLogout = async () => {
        try {
            await signOutAuth();
        } catch (error) {
            console.error("Güvenli çıkış tamamlanamadı:", error);
        }
        clearSession();
        setIsLoggedIn(false);
    };

    return (
        <TrackedVehiclesProvider>
            {isLoggedIn ? (
                <Home onLogout={handleLogout} />
            ) : (
                <Login onLogin={handleLogin} />
            )}
        </TrackedVehiclesProvider>
    );
}

export default App;
