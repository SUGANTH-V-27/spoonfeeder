import crypto from "crypto";

export type OtpPurpose = "signup" | "password-reset" | "password-reset-verified";

interface OtpRecord {
  purpose: OtpPurpose;
  otpHash: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  metadata?: Record<string, any>;
}

class InMemoryOtpStore {
  private store: Map<string, OtpRecord> = new Map();

  set(token: string, record: OtpRecord) {
    this.store.set(token, record);
  }

  get(token: string): OtpRecord | undefined {
    const record = this.store.get(token);
    if (!record) return undefined;
    if (Date.now() > record.expiresAt) {
      this.store.delete(token);
      return undefined;
    }
    return record;
  }

  delete(token: string) {
    this.store.delete(token);
  }

  clearByEmail(email: string, purpose: OtpPurpose) {
    for (const [key, record] of this.store.entries()) {
      if (record.purpose === purpose && record.metadata?.email === email) {
        this.store.delete(key);
      }
    }
  }

  incrementAttempts(token: string) {
    const record = this.store.get(token);
    if (!record) return;
    record.attempts += 1;
    this.store.set(token, record);
  }
}

const otpStore = new InMemoryOtpStore();
export default otpStore;

