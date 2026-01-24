import AsyncStorage from "@react-native-async-storage/async-storage";
import { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { AuthService, CurrentUser, SupabaseAuth } from "@/auth/service";
import { PhoneAuth } from "@/types/auth";

const authService: AuthService = new SupabaseAuth();

export interface UserState {
  isAuthenticated: boolean;
  userId: string | null;
  isPending: boolean;
  currentUser?: CurrentUser | null;

  sendOTP: (phoneNo: string) => Promise<void>;
  verifyOTP: (payload: PhoneAuth) => Promise<void>;
  refreshCurrentUser: () => Promise<CurrentUser>;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userId: null,
      isPending: false,
      error: null,
      currentUser: null,

      sendOTP: async (phoneNo: string) => {
        try {
          set({ isPending: true });
          await authService.signInWithPhoneNumber(phoneNo);
          set({ isPending: false });
        } catch (err) {
          throw new Error(parseError(err));
        }
      },

      verifyOTP: async (payload: PhoneAuth) => {
        try {
          set({ isPending: true });

          const session: Session = await authService.verifyPhoneOTP(payload);
          let currentUser: CurrentUser | null = null;
          let found = false;

          try {
            currentUser = await authService.getCurrentUser();
            found = true;
          } catch (err: any) {
            const status =
              err?.status ?? err?.data?.status ?? err?.response?.status;
            if (status !== 404) {
              throw err;
            }
            currentUser = null;
            found = false;
          }

          set({
            isAuthenticated: found,
            userId: currentUser?.id ?? session.user.id,
            currentUser,
            isPending: false,
          });
        } catch (err) {
          throw new Error(parseError(err));
        }
      },

      refreshCurrentUser: async () => {
        try {
          const currentUser = await authService.getCurrentUser();

          // If the backend returns null or similar, treat as not found so the caller can route to signup
          if (!currentUser) {
            const err: any = new Error("User not found");
            err.status = 404;
            throw err;
          }

          set({
            currentUser,
            userId: currentUser.id,
            isAuthenticated: true,
          });

          return currentUser;
        } catch (err) {
          // Propagate so caller (verify-form) can redirect to complete-profile on 404
          throw err;
        }
      },

      logout: async () => {
        await authService.logout();
        set({
          isAuthenticated: false,
          userId: null,
          currentUser: null,
          isPending: false,
        });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        currentUser: state.currentUser,
      }),
    },
  ),
);

const parseError = (err: unknown): string => {
  if (!(err instanceof Error)) {
    return "Something went wrong";
  }

  const msg = err.message.toLowerCase();

  if (
    msg.includes("error sending confirmation") ||
    msg.includes("otp provider")
  ) {
    return "Failed to send verification code. Please try again.";
  }

  if (msg.includes("user already registered")) {
    return "An account with this email already exists";
  }
  if (msg.includes("invalid login credentials")) {
    return "Invalid email or password";
  }
  if (msg.includes("email not confirmed")) {
    return "Please verify your email before logging in";
  }

  return err.message;
};
