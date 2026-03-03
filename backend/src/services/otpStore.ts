import pool from "../db/connection";

export type OtpPurpose = "signup" | "password-reset" | "password-reset-verified";

export interface OtpRecord {
  purpose: OtpPurpose;
  otpHash: string;
  expiresAt: number; // epoch ms
  attempts: number;
  maxAttempts: number;
  metadata?: Record<string, any>;
}

let ensured = false;
const ensureOtpTable = async () => {
  if (ensured) return;
  ensured = true;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.otp_challenges (
        token uuid PRIMARY KEY,
        purpose text NOT NULL,
        otp_hash text NOT NULL DEFAULT '',
        expires_at timestamptz NOT NULL,
        attempts integer NOT NULL DEFAULT 0,
        max_attempts integer NOT NULL DEFAULT 5,
        email text,
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS otp_challenges_expires_at_idx ON public.otp_challenges (expires_at);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS otp_challenges_email_purpose_idx ON public.otp_challenges (email, purpose);`);
  } catch (err) {
    // Don't crash the app if the DB user can't create tables.
    // In that case, the table must be created manually in the DB.
    console.error("Failed to ensure otp_challenges table exists:", err);
  }
};

class DbOtpStore {
  async set(token: string, record: OtpRecord) {
    await ensureOtpTable();
    const email = record.metadata?.email ?? null;
    const metadataJson = record.metadata ? JSON.stringify(record.metadata) : null;
    await pool.query(
      `
        INSERT INTO public.otp_challenges
          (token, purpose, otp_hash, expires_at, attempts, max_attempts, email, metadata)
        VALUES
          ($1::uuid, $2, $3, to_timestamp($4 / 1000.0), $5, $6, $7, $8::jsonb)
        ON CONFLICT (token)
        DO UPDATE SET
          purpose = EXCLUDED.purpose,
          otp_hash = EXCLUDED.otp_hash,
          expires_at = EXCLUDED.expires_at,
          attempts = EXCLUDED.attempts,
          max_attempts = EXCLUDED.max_attempts,
          email = EXCLUDED.email,
          metadata = EXCLUDED.metadata
      `,
      [token, record.purpose, record.otpHash ?? "", record.expiresAt, record.attempts, record.maxAttempts, email, metadataJson]
    );
  }

  async get(token: string): Promise<OtpRecord | undefined> {
    await ensureOtpTable();
    const res = await pool.query(
      `
        SELECT purpose, otp_hash, expires_at, attempts, max_attempts, metadata
        FROM public.otp_challenges
        WHERE token = $1::uuid
        LIMIT 1
      `,
      [token]
    );

    if (res.rows.length === 0) return undefined;
    const row = res.rows[0];
    const expiresAt = new Date(row.expires_at).getTime();
    if (Date.now() > expiresAt) {
      await this.delete(token);
      return undefined;
    }

    return {
      purpose: row.purpose,
      otpHash: row.otp_hash ?? "",
      expiresAt,
      attempts: row.attempts ?? 0,
      maxAttempts: row.max_attempts ?? 5,
      metadata: row.metadata ?? undefined,
    };
  }

  async delete(token: string) {
    await ensureOtpTable();
    await pool.query(`DELETE FROM public.otp_challenges WHERE token = $1::uuid`, [token]);
  }

  async clearByEmail(email: string, purpose: OtpPurpose) {
    await ensureOtpTable();
    await pool.query(
      `DELETE FROM public.otp_challenges WHERE email = $1 AND purpose = $2`,
      [email, purpose]
    );
  }

  async incrementAttempts(token: string) {
    await ensureOtpTable();
    await pool.query(
      `UPDATE public.otp_challenges SET attempts = attempts + 1 WHERE token = $1::uuid`,
      [token]
    );
  }
}

const otpStore = new DbOtpStore();
export default otpStore;

