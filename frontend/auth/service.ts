import { AppState } from "react-native";
import { supabase } from "./client";
import { Session, User } from "@supabase/supabase-js";
import { AuthRequest, PhoneAuth, ResetPasswordPayload } from "@/types/auth";
import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";

export interface AuthService {
  signUp({ email, password }: AuthRequest): Promise<User>;
  login({ email, password }: AuthRequest): Promise<Session>;
  logout(): Promise<void>;
  forgotPassword({ email }: { email: string }): Promise<void>;
  resetPassword(payload: ResetPasswordPayload): Promise<User>;
}

export class SupabaseAuth implements AuthService {
  async storeLocalSessionToDevice(email: string, password: string) {
    SecureStore.setItem("email", email);
    SecureStore.setItem("password", password);
  }

  async signUp({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error("Unable to create user");
    }

    return data.user;
  }

  async login({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<Session> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session) {
      throw new Error("Unable to login");
    }

    return data.session;
  }

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }

  async forgotPassword({ email }: { email: string }): Promise<void> {
    const redirectTo = Linking.createURL(`(auth)/login/reset-password`);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async resetPassword({
    password,
    accessToken,
    refreshToken,
  }: ResetPasswordPayload): Promise<User> {
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (setSessionError) {
      throw new Error(setSessionError.message);
    }

    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.user;
  }
}

// allow for auto-refresh token in the background
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
