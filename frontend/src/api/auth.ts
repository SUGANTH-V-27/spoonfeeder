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

export interface SignupInitPayload { email: string; }
export interface SignupVerifyPayload { email: string; otp: string; }
export interface SignupCompletePayload { email: string; signupToken: string; password: string; }

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

// Forgot password
export const forgotPassword = async (email: string) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data;
};

// Reset password
export const resetPassword = async (token: string, password: string) => {
  const response = await api.post(`/auth/reset-password/${token}`, { password });
  return response.data;
};

export const signupInit = async (data: SignupInitPayload) => {
  const response = await api.post("/auth/signup/init", data);
  return response.data as { message: string };
};

export const signupVerify = async (data: SignupVerifyPayload) => {
  const response = await api.post("/auth/signup/verify", data);
  return response.data as { message: string; signupToken: string };
};

export const signupComplete = async (data: SignupCompletePayload): Promise<AuthResponse> => {
  const response = await api.post("/auth/signup/complete", data);
  return response.data;
};
