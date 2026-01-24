import { PhoneAuth } from "@/types/auth";
import { Session } from "@supabase/supabase-js";
import { AppState } from "react-native";

import request from "@/api/client";
import { supabase } from "./client";

export interface AuthService {
  signInWithPhoneNumber(phoneNo: string): Promise<void>;
  verifyPhoneOTP(payload: PhoneAuth): Promise<Session>;
  getCurrentUser(): Promise<CurrentUser>;
  logout(): Promise<void>;
}

export type CurrentUser = {
  id: string;
  name: string;
  username: string;
};

export class SupabaseAuth implements AuthService {
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }

  async signInWithPhoneNumber(phoneNo: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneNo,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async verifyPhoneOTP(payload: PhoneAuth): Promise<Session> {
    const { data, error } = await supabase.auth.verifyOtp({
      ...payload,
      type: "sms",
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.session!;
  }

  async getCurrentUser(): Promise<CurrentUser> {
    const res = await request<CurrentUser>({
      method: "GET",
      url: "/api/v1/users/me",
    });

    return res.data;
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
