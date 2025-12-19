import { type ChangeEvent, type FormEvent, type MouseEvent, useEffect, useId, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
	createUserWithEmailAndPassword,
	sendEmailVerification,
	signInWithEmailAndPassword,
	updateProfile,
} from "firebase/auth";
import type { User } from "firebase/auth";
import styles from "./ModalAuth.module.css";
import { exchangeFirebaseToken } from "../../lib/api";
import { firebaseAuth } from "../../lib/firebase";
import type { AuthResponse } from "../../types";

export type AuthMode = "login" | "register";

interface ModalAuthProps {
	open: boolean;
	defaultMode?: AuthMode;
	onClose: () => void;
	onSuccess?: (payload: AuthResponse) => void;
}

// Valores iniciais do formulário de registo
const REGISTER_TEMPLATE = {
	name: "",
	email: "",
	password: "",
	confirmPassword: "",
};

type RegisterFormState = typeof REGISTER_TEMPLATE;

// Valores iniciais do formulário de login
const LOGIN_TEMPLATE = {
	email: "",
	password: "",
};

type LoginFormState = typeof LOGIN_TEMPLATE;

// Helpers para clonar estado inicial
const createRegisterState = (): RegisterFormState => ({ ...REGISTER_TEMPLATE });
const createLoginState = (): LoginFormState => ({ ...LOGIN_TEMPLATE });

export function ModalAuth({
	open,
	defaultMode = "login",
	onClose,
	onSuccess,
}: ModalAuthProps) {
	// Estado do modal e formulários
	const [mode, setMode] = useState<AuthMode>(defaultMode);
	const [registerForm, setRegisterForm] = useState<RegisterFormState>(() =>
		createRegisterState()
	);
	const [loginForm, setLoginForm] = useState<LoginFormState>(() => createLoginState());
	const [error, setError] = useState<string | null>(null);
	const [info, setInfo] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [pendingVerificationUser, setPendingVerificationUser] = useState<User | null>(null);

	const modalId = useId();
	const titleId = `${modalId}-title`;
	const descriptionId = `${modalId}-desc`;
	const registerNameId = `${modalId}-register-name`;
	const registerEmailId = `${modalId}-register-email`;
	const registerPasswordId = `${modalId}-register-password`;
	const registerConfirmId = `${modalId}-register-confirm`;
	const loginIdentifierId = `${modalId}-login-email`;
	const loginPasswordId = `${modalId}-login-password`;

	useEffect(() => {
		if (!open) {
			setRegisterForm(createRegisterState());
			setLoginForm(createLoginState());
			setSubmitting(false);
			setError(null);
			setInfo(null);
			setSuccess(null);
			return;
		}

		setMode(defaultMode);
		setError(null);
	}, [open, defaultMode]);

	useEffect(() => {
		if (!open) return;
		setError(null);
		setInfo(null);
		setSuccess(null);
	}, [mode, open]);

	useEffect(() => {
		if (!open) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, onClose]);

	const handleRegisterChange = (field: keyof RegisterFormState) => (
		event: ChangeEvent<HTMLInputElement>
	) => {
		const { value } = event.target;
		setRegisterForm((current) => ({ ...current, [field]: value }));
	};

	const handleLoginChange = (field: keyof LoginFormState) => (
		event: ChangeEvent<HTMLInputElement>
	) => {
		const { value } = event.target;
		setLoginForm((current) => ({ ...current, [field]: value }));
	};

	const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
		if (event.target === event.currentTarget) {
			onClose();
		}
	};

	const friendlyFirebaseError = (error: unknown): string => {
		if (error instanceof FirebaseError) {
			const code = error.code;
			switch (code) {
				case "auth/invalid-credential":
				case "auth/invalid-login-credentials":
				case "auth/wrong-password":
					return "Incorrect email or password.";
				case "auth/user-not-found":
					return "Account not found. Check the email or create one.";
				case "auth/email-already-in-use":
					return "There is already an account with this email.";
				case "auth/too-many-requests":
					return "Too many attempts. Please try again in a moment.";
				default:
					return error.message || "Authentication failed.";
			}
		}

		if (error instanceof Error) {
			if (error.message.toLowerCase().includes("nao verificado")) {
				return "Please verify your email before continuing.";
			}
			return error.message;
		}

		return "Something went wrong. Please try again.";
	};

	const verifyPendingAccount = async () => {
		if (!pendingVerificationUser) return;
		setSubmitting(true);
		setError(null);
		setInfo(null);
		setSuccess(null);
		try {
			await pendingVerificationUser.reload();
			const freshUser = firebaseAuth.currentUser ?? pendingVerificationUser;

			if (!freshUser.emailVerified) {
				setError("Please verify your email before continuing.");
				return;
			}

			const idToken = await freshUser.getIdToken(true);
			const payload = await exchangeFirebaseToken(
				idToken,
				freshUser.displayName || undefined
			);
			setSuccess("Account verified successfully. Signing you in...");
			onSuccess?.(payload);
		} catch (err) {
			setError(friendlyFirebaseError(err));
		} finally {
			setSubmitting(false);
		}
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (mode === "register" && pendingVerificationUser) {
			await verifyPendingAccount();
			return;
		}

		if (mode === "register") {
			const trimmedName = registerForm.name.trim();
			const trimmedEmail = registerForm.email.trim();
			const password = registerForm.password.trim();
			const confirmPassword = registerForm.confirmPassword.trim();

			if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
				setError("Please fill all fields to create your account.");
				return;
			}

			if (password !== confirmPassword) {
				setError("Passwords do not match.");
				return;
			}

			if (password.length < 6) {
				setError("Password needs at least 6 characters.");
				return;
			}
		} else {
			if (!loginForm.email.trim() || !loginForm.password.trim()) {
				setError("Enter your email and password to continue.");
				return;
			}
		}

		setSubmitting(true);
		setError(null);
		setInfo(null);
		setSuccess(null);

		try {
			if (mode === "register") {
				const cred = await createUserWithEmailAndPassword(
					firebaseAuth,
					registerForm.email.trim().toLowerCase(),
					registerForm.password.trim()
				);

				if (registerForm.name.trim()) {
					await updateProfile(cred.user, { displayName: registerForm.name.trim() });
				}

				await sendEmailVerification(cred.user);
				setPendingVerificationUser(cred.user);
				setInfo("We sent a verification email. After confirming, click Verify your account to finish.");
			} else {
				const cred = await signInWithEmailAndPassword(
					firebaseAuth,
					loginForm.email.trim().toLowerCase(),
					loginForm.password.trim()
				);
				const idToken = await cred.user.getIdToken(true);
				const payload = await exchangeFirebaseToken(
					idToken,
					cred.user.displayName || undefined
				);
				onSuccess?.(payload);
			}
		} catch (err) {
			const friendly = friendlyFirebaseError(err);
			setError(friendly);
		} finally {
			setSubmitting(false);
		}
	};

	const resendVerification = async () => {
		if (!pendingVerificationUser) return;
		setSubmitting(true);
		setError(null);
		setInfo(null);
		setSuccess(null);
		try {
			await sendEmailVerification(pendingVerificationUser);
			setInfo("Verification email re-sent. Check your inbox.");
		} catch (err) {
			setError(friendlyFirebaseError(err));
		} finally {
			setSubmitting(false);
		}
	};

	if (!open) {
		return null;
	}

	const helperText =
		mode === "register"
			? "Create an account to save your reviews and wishlist."
			: "Sign in to pick up where you left off.";

	const submitLabel = mode === "register" ? "Create account" : "Log in";
	const registerTabClass = mode === "register"
		? `${styles.tabBtn} ${styles.tabActive}`
		: styles.tabBtn;
	const loginTabClass = mode === "login"
		? `${styles.tabBtn} ${styles.tabActive}`
		: styles.tabBtn;

	return (
		<div className={styles.backdrop} onMouseDown={handleBackdropClick}>
			<div
				className={styles.dialog}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
			>
				<button
					type="button"
					className={styles.closeBtn}
					onClick={onClose}
					aria-label="Close authentication modal"
				>
					X
				</button>

				<div className={styles.tabs} role="tablist" aria-label="Authentication">
					<button
						type="button"
						role="tab"
						aria-selected={mode === "register"}
						className={registerTabClass}
						onClick={() => setMode("register")}
					>
						Sign up
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={mode === "login"}
						className={loginTabClass}
						onClick={() => setMode("login")}
					>
						Log in
					</button>
				</div>

				<div className={styles.copy}>
					<h2 className={styles.title} id={titleId}>
						{mode === "register" ? "Create your account" : "Welcome back"}
					</h2>
					<p className={styles.description} id={descriptionId}>
						{helperText}
					</p>
				</div>

				<form className={styles.form} onSubmit={handleSubmit} aria-busy={submitting}>
					{mode === "register" ? (
						<>
							<div className={styles.field}>
								<label htmlFor={registerNameId}>Name / Nickname</label>
								<input
									id={registerNameId}
									type="text"
									name="name"
									value={registerForm.name}
									onChange={handleRegisterChange("name")}
									autoComplete="nickname"
									placeholder="MegaPlayer"
									required
								/>
							</div>

							<div className={styles.field}>
								<label htmlFor={registerEmailId}>Email</label>
								<input
									id={registerEmailId}
									type="email"
									name="email"
									value={registerForm.email}
									onChange={handleRegisterChange("email")}
									autoComplete="email"
									placeholder="name@email.com"
									required
								/>
							</div>

							<div className={styles.field}>
								<label htmlFor={registerPasswordId}>Password</label>
								<input
									id={registerPasswordId}
									type="password"
									name="password"
									value={registerForm.password}
									onChange={handleRegisterChange("password")}
									autoComplete="new-password"
									placeholder="At least 6 characters"
									required
								/>
							</div>

							<div className={styles.field}>
								<label htmlFor={registerConfirmId}>Repeat password</label>
								<input
									id={registerConfirmId}
									type="password"
									name="confirmPassword"
									value={registerForm.confirmPassword}
									onChange={handleRegisterChange("confirmPassword")}
									autoComplete="new-password"
									placeholder="Repeat your password"
									required
								/>
							</div>
						</>
					) : (
						<>
							<div className={styles.field}>
								<label htmlFor={loginIdentifierId}>Email</label>
								<input
									id={loginIdentifierId}
									type="email"
									name="email"
									value={loginForm.email}
									onChange={handleLoginChange("email")}
									autoComplete="email"
									placeholder="name@email.com"
									required
								/>
							</div>

							<div className={styles.field}>
								<label htmlFor={loginPasswordId}>Password</label>
								<input
									id={loginPasswordId}
									type="password"
									name="password"
									value={loginForm.password}
									onChange={handleLoginChange("password")}
									autoComplete="current-password"
									placeholder="Your password"
									required
								/>
							</div>
						</>
					)}

					{success && (
						<div className={styles.success} role="status">
							{success}
						</div>
					)}

					{info && (
						<div className={styles.info} role="status">
							{info}
						</div>
					)}

					{error && (
						<div className={styles.error} role="alert">
							{error}
						</div>
					)}

					<button type="submit" className={styles.submitBtn} disabled={submitting}>
						{submitting ? "Working..." : submitLabel}
					</button>

					{mode === "register" && pendingVerificationUser && (
						<div className={styles.secondaryAction}>
							<button
								type="button"
								className={styles.secondaryLink}
								onClick={resendVerification}
								disabled={submitting}
							>
								Resend verification email
							</button>
							<button
								type="button"
								className={`${styles.secondaryLink} ${styles.secondaryLinkSpace}`}
								onClick={verifyPendingAccount}
								disabled={submitting}
							>
								Verify your account
							</button>
						</div>
					)}

					<div className={styles.secondaryAction}>
						{mode === "register" ? (
							<>
								<span>Already have an account?</span>
								<button
									type="button"
									className={styles.secondaryLink}
									onClick={() => setMode("login")}
								>
									Log in
								</button>
							</>
						) : (
							<>
								<span>Don't have an account?</span>
								<button
									type="button"
									className={styles.secondaryLink}
									onClick={() => setMode("register")}
								>
									Create one
								</button>
							</>
						)}
					</div>
				</form>
			</div>
		</div>
	);
}
