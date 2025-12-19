import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./SignIn.module.css";
import { ModalAuth, type AuthMode } from "../components/ModalAuth/ModalAuth";
import { useAuth } from "../state/auth";
import type { AuthResponse } from "../types";
import { Header } from "../components/Header/Header";

export default function SignInPage() {
	// Estado de auth e destino de redirecionamento
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>("login");

  const redirectTo =
    (location.state as { redirect?: string } | undefined)?.redirect || "/";

  useEffect(() => {
		// Se já autenticado, segue para o destino
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, redirectTo, navigate]);

  const handleClose = () => {
    navigate("/", { replace: true });
  };

  // Guarda sessão após sucesso de login/registro
  const handleSuccess = (payload: AuthResponse) => {
    login(payload);
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className={styles.page}>
      <Header onAuthClick={() => setMode("login")} user={user} onSignOut={logout} />

      <div className={styles.copyBlock}>
        <p className={styles.eyebrow}>Session required</p>
        <h1 className={styles.h1}>Sign in to save your wishlist</h1>
        <p className={styles.p}>
          Log in or create an account to add games and return to your previous screen.
        </p>
      </div>

      <ModalAuth
        open
        defaultMode={mode}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
