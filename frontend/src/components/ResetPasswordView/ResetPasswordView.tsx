import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { resetPassword } from "../../api/auth";
import "./ResetPasswordView.css";

export function ResetPasswordView({
                                      token,
                                      onComplete,
                                  }: {
    token: string;
    onComplete: (email?: string) => void;
}) {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const passwordsMatch = useMemo(
        () => confirm.length > 0 && password === confirm,
        [password, confirm]
    );
    const passwordsMismatch = useMemo(
        () => confirm.length > 0 && password !== confirm,
        [password, confirm]
    );

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setErr(null);
        setMsg(null);
        if (!password || password.length < 8) {
            setErr("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirm) {
            setErr("Passwords do not match.");
            return;
        }
        try {
            setLoading(true);
            const response = await resetPassword(token, password);
            setMsg("Password reset successful. Redirecting to login...");
            setTimeout(() => {
                window.history.replaceState({}, "", "/");
                onComplete(response?.user?.email);
            }, 1300);
        } catch (e: any) {
            setErr(e?.response?.data?.error || e?.message || "Server error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.form
            className="login-card reset-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={submit}
        >
            <h2>Reset Password</h2>
            <p className="subtitle">Set a new secure password for your account</p>
            <div className="input-group">
                <input
                    aria-label="New password"
                    type={showConfirm ? "text" : "password"}
                    name="password"
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                />
                <button
                    type="button"
                    className="icon-button toggle"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    onClick={() => setShowConfirm((v) => !v)}
                >
                    {showConfirm ? "HIDE" : "SHOW"}
                </button>
            </div>

            <div className="input-group">
                <input
                    aria-label="Confirm new password"
                    type={showConfirm ? "text" : "password"}
                    name="confirm"
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                />
                {passwordsMatch && <span className="status-icon success">✔</span>}
                {passwordsMismatch && <span className="status-icon error">✖</span>}
            </div>

            <button type="submit" disabled={loading}>
                {loading ? (
                    <span className="spinner" aria-hidden="true"></span>
                ) : (
                    "Set new password"
                )}
            </button>

            {err && (
                <div className="error-message" role="alert">
                    {err}
                </div>
            )}
            {msg && (
                <div className="success-message" role="status">
                    {msg}
                </div>
            )}
        </motion.form>
    );
}
