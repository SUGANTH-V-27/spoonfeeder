import api from "./api";

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
  };
}

export interface SignupInitPayload { email: string; password: string; confirmPassword: string; }
export interface SignupVerifyPayload { otp: string; challengeToken: string; }
export interface PasswordResetInitPayload { email: string; }
export interface PasswordResetVerifyPayload { otp: string; challengeToken: string; newPassword: string; confirmPassword: string; }

// Login user
export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await api.post("/auth/login", data);
  return response.data;
};

// Register new user
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await api.post("/auth/register", data);
  return response.data;
};

export const signupInit = async (data: SignupInitPayload) => {
  const response = await api.post("/auth/signup/init", data);
  return response.data as { message: string; challengeToken: string; expiresInMinutes: number };
};

export const signupVerify = async (data: SignupVerifyPayload): Promise<AuthResponse> => {
  const response = await api.post("/auth/signup/verify", data);
  return response.data;
};

export const passwordResetInit = async (data: PasswordResetInitPayload) => {
  const response = await api.post("/auth/password/otp-init", data);
  return response.data as { message: string; challengeToken: string; expiresInMinutes: number };
};

export const passwordResetVerify = async (data: PasswordResetVerifyPayload): Promise<AuthResponse> => {
  const response = await api.post("/auth/password/otp-verify", data);
  return response.data;
};
