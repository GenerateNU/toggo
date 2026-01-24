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
  signupData: {
    name: string | null;
    username: string | null;
  };
  currentUser?: CurrentUser | null;

  setSignupData: (name: string, username: string) => void;
  clearSignupData: () => void;
  sendOTP: (phoneNo: string) => Promise<void>;
  verifyOTP: (payload: PhoneAuth) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      userId: null,
      isPending: false,
      error: null,
      signupData: {
        name: null,
        username: null,
      },
      currentUser: null,

      setSignupData: (name: string, username: string) => {
        set({
          signupData: { name, username },
        });
      },

      clearSignupData: () => {
        set({
          signupData: { name: null, username: null },
        });
      },

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

          try {
            currentUser = await authService.getCurrentUser();
          } catch (err: any) {
            // If not found, allow signup flow to create user; otherwise bubble up
            if (!(err && typeof err === "object" && "status" in err && (err as any).status === 404)) {
              throw err;
            }
            currentUser = null;
          }

          set({
            isAuthenticated: true,
            userId: currentUser?.id ?? session.user.id,
            currentUser,
            isPending: false,
            signupData: currentUser
              ? { name: null, username: null }
              : { ...get().signupData },
          });
        } catch (err) {
          throw new Error(parseError(err));
        }
      },

      refreshCurrentUser: async () => {
        const currentUser = await authService.getCurrentUser();
        set({
          currentUser,
          userId: currentUser.id,
          isAuthenticated: true,
        });
      },

      logout: async () => {
        await authService.logout();
        set({
          isAuthenticated: false,
          userId: null,
          signupData: { name: null, username: null },
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
        signupData: state.signupData,
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

  if (msg.includes("error sending confirmation") || msg.includes("otp provider")) {
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
