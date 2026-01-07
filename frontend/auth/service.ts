import { PhoneAuth } from "@/types/auth";
import { Session } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { supabase } from "./client";

export interface AuthService {
  signInWithPhoneNumber(phoneNo: string): Promise<void>;
  verifyPhoneOTP(payload: PhoneAuth): Promise<Session>;
  logout(): Promise<void>;
}

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
}

// allow for auto-refresh token in the background
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
