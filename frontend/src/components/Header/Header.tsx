import { Link } from "react-router-dom";
import styles from "./Header.module.css";
import type { UserSummary } from "../../types";

// Usa o logo servido a partir de public/logo.png
const logoUrl = "/logo.png";

interface HeaderProps {
  onAuthClick: () => void;
  onSignOut?: () => void;
  onWishlistClick?: () => void;
  user?: UserSummary | null;
}

export function Header({ onAuthClick, onSignOut, onWishlistClick, user }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.leftSlot}>
        {user ? (
          <div className={styles.sessionControls}>
            <div className={styles.userChip}>
              <div className={styles.userInitial}>
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userEmail}>{user.email}</span>
              </div>
            </div>
            <button
              type="button"
              className={styles.signOutBtn}
              onClick={onSignOut}
            >
              Sign out
            </button>
          </div>
        ) : (
          <button type="button" className={styles.authBtn} onClick={onAuthClick}>
            Sign In / Login
          </button>
        )}
      </div>

      <Link to="/" className={styles.brand} aria-label="Go to homepage">
        <img className={styles.logoMark} src={logoUrl} alt="Mega Game Reviews" />
      </Link>

      <div className={styles.rightSlot}>
        {user && (user.role === "admin" || user.role === "owner") ? (
          <Link to="/games/new" className={styles.addGameBtn}>
            Add game
          </Link>
        ) : null}

        {user ? (
          <Link
            to="/wishlist"
            className={styles.wishlistBtn}
            onClick={onWishlistClick}
          >
            Wishlist
          </Link>
        ) : null}
      </div>
    </header>
  );
}
