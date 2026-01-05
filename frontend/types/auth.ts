export interface AuthRequest {
  email: string;
  password: string;
}

export interface PhoneAuth {
  phone: string;
  token: string;
}

export interface TokenPayload {
  accessToken: string;
  refreshToken: string;
}

export interface ResetPasswordPayload extends TokenPayload {
  password: string;
}
