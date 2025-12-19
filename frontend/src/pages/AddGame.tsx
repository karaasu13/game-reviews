import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./AddGame.module.css";
import { Header } from "../components/Header/Header";
import { useAuth } from "../state/auth";
import { createGame, type CreateGamePayload, uploadCover } from "../lib/api";
import { buildAssetUrl } from "../lib/env";

// Estado inicial do formulário
const emptyForm = {
  title: "",
  genre: "",
  platform: "",
  release_year: "",
  description: "",
  cover_url: "",
};

// Apenas admin/owner podem gerir jogos
const canManage = (role?: string | null) => role === "admin" || role === "owner";

export default function AddGamePage() {
	// Contexto de auth e navegação
  const { user, token, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const allowManage = useMemo(() => canManage(user?.role), [user?.role]);
  const hasCover = form.cover_url.trim().length > 4;
  const coverPreview = hasCover ? buildAssetUrl(form.cover_url) ?? form.cover_url : null;

  // Atualiza campos genéricos do formulário
  const handleChange = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  // Sobe a capa para o backend
  const handleCoverFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user || !token) {
      setError("You must be signed in to upload a cover.");
      return;
    }

    if (!allowManage) {
      setError("Only admins or the owner can upload covers.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const { url } = await uploadCover(file, token, form.title);
      setForm((prev) => ({ ...prev, cover_url: url }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not upload cover.";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  // Valida e cria o jogo
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!user || !token) {
      setError("You need to sign in to create a game.");
      return;
    }

    if (!allowManage) {
      setError("You don't have permission to add games.");
      return;
    }

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    const parsedYear = form.release_year.trim()
      ? Number.parseInt(form.release_year.trim(), 10)
      : undefined;

    if (form.release_year.trim() && Number.isNaN(parsedYear)) {
      setError("Invalid year.");
      return;
    }

    const payload: CreateGamePayload = {
      title: form.title.trim(),
      genre: form.genre.trim() || undefined,
      platform: form.platform.trim() || undefined,
      release_year: parsedYear,
      description: form.description.trim() || undefined,
      cover_url: form.cover_url.trim() || undefined,
    };

    setSubmitting(true);
    try {
      const created = await createGame(payload, token);
      navigate(`/games/${created.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create the game.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Header onAuthClick={() => navigate("/signin")} user={user} onSignOut={logout} />
        <div className={styles.fallback}>Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.page}>
        <Header onAuthClick={() => navigate("/signin")} user={user} onSignOut={logout} />
        <div className={styles.guardCard}>
          <p className={styles.guardTitle}>You need to sign in.</p>
          <div className={styles.guardActions}>
            <Link to="/signin" className={styles.primaryBtn}>Go to login</Link>
            <button type="button" className={styles.secondaryBtn} onClick={() => navigate(-1)}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (!allowManage) {
    return (
      <div className={styles.page}>
        <Header onAuthClick={() => navigate("/signin")} user={user} onSignOut={logout} />
        <div className={styles.guardCard}>
          <p className={styles.guardTitle}>Only admins or the owner can add games.</p>
          <div className={styles.guardActions}>
            <button type="button" className={styles.secondaryBtn} onClick={() => navigate(-1)}>Back</button>
            <button type="button" className={styles.secondaryBtn} onClick={() => navigate("/")}>Go home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header onAuthClick={() => navigate("/signin")} user={user} onSignOut={logout} />

      <main className={styles.main}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
          {"<- Back"}
        </button>

        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <div>
              <p className={styles.eyebrow}>Admin / Owner</p>
              <h1 className={styles.title}>Add new game</h1>
              <p className={styles.subtitle}>Fill the fields to create a new game in the catalog.</p>
            </div>
            {hasCover ? (
              <div className={styles.coverPreviewWrap}>
                <img src={coverPreview ?? undefined} alt="Cover preview" className={styles.coverPreview} />
              </div>
            ) : null}
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <span className={styles.label}>Title *</span>
                <input
                  required
                  type="text"
                  className={styles.input}
                  value={form.title}
                  onChange={handleChange("title")}
                  placeholder="e.g. Elden Ring"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Year</span>
                <input
                  type="number"
                  min="1970"
                  max="2099"
                  className={styles.input}
                  value={form.release_year}
                  onChange={handleChange("release_year")}
                  placeholder="2025"
                />
              </label>
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <span className={styles.label}>Genre</span>
                <input
                  type="text"
                  className={styles.input}
                  value={form.genre}
                  onChange={handleChange("genre")}
                  placeholder="RPG / Action"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Platforms</span>
                <input
                  type="text"
                  className={styles.input}
                  value={form.platform}
                  onChange={handleChange("platform")}
                  placeholder="PC / PS5 / Xbox"
                />
              </label>
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <span className={styles.label}>Upload cover</span>
                <input
                  type="file"
                  accept="image/*"
                  className={styles.fileInput}
                  onChange={handleCoverFile}
                  disabled={uploading || submitting}
                />
                <span className={styles.hint}>
                  {uploading ? "Uploading cover..." : hasCover ? "Cover uploaded" : "Max 5 MB • JPG, PNG or WEBP"}
                </span>
                {hasCover && <span className={styles.hint}>{form.cover_url}</span>}
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Description</span>
              <textarea
                className={styles.textarea}
                rows={8}
                value={form.description}
                onChange={handleChange("description")}
                placeholder="Summary, story, highlights..."
              />
            </label>

            {error ? <div className={styles.error}>{error}</div> : null}

            <div className={styles.actions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setForm(emptyForm)} disabled={submitting}>
                Clear
              </button>
              <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                {submitting ? "Saving..." : "Save game"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
