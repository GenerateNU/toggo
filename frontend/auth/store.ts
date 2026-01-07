import AsyncStorage from "@react-native-async-storage/async-storage";
import { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { AuthService, SupabaseAuth } from "@/auth/service";
import { PhoneAuth } from "@/types/auth";

const authService: AuthService = new SupabaseAuth();

export interface UserState {
  isAuthenticated: boolean;
  userId: string | null;
  isPending: boolean;
  error: string | null;

  sendOTP: (phoneNo: string) => Promise<void>;
  verifyOTP: (payload: PhoneAuth) => Promise<void>;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userId: null,
      isPending: false,
      error: null,

      sendOTP: async (phoneNo: string) => {
        try {
          set({ isPending: true, error: null });
          await authService.signInWithPhoneNumber(phoneNo);
          set({ isPending: false });
        } catch (err) {
          set({
            isPending: false,
            error: parseError(err),
          });
        }
      },

      verifyOTP: async (payload: PhoneAuth) => {
        try {
          set({ isPending: true, error: null });

          const session: Session = await authService.verifyPhoneOTP(payload);

          set({
            isAuthenticated: true,
            userId: session.user.id,
            isPending: false,
          });
        } catch (err) {
          set({
            isPending: false,
            error: parseError(err),
          });
        }
      },

      logout: async () => {
        await authService.logout();
        set({
          isAuthenticated: false,
          userId: null,
          isPending: false,
          error: null,
        });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
      }),
    },
  ),
);

const parseError = (err: unknown): string => {
  if (!(err instanceof Error)) {
    return "Something went wrong";
  }

  if (err.message.includes("User already registered")) {
    return "An account with this email already exists";
  }
  if (err.message.includes("Invalid login credentials")) {
    return "Invalid email or password";
  }
  if (err.message.includes("Email not confirmed")) {
    return "Please verify your email before logging in";
  }

  return err.message;
};
