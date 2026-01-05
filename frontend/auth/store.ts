import { AuthService, SupabaseAuth } from "@/auth/service";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Session, User } from "@supabase/supabase-js";
import { ResetPasswordPayload } from "@/types/auth";

export interface UserState {
  isAuthenticated: boolean;
  userId: string | null;
  isPending: boolean;
  email: string | null;

  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string | null>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<string | null>;
}

const authService: AuthService = new SupabaseAuth();

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userId: null,
      isPending: false,
      email: null,

      login: async (
        email: string,
        password: string,
      ): Promise<string | null> => {
        try {
          set({ isPending: true });
          const session: Session = await authService.login({ email, password });
          set({
            isAuthenticated: true,
            userId: session.user.id,
            email,
            isPending: false,
          });
          return null;
        } catch (err) {
          set({ isPending: false });
          return parseError(err);
        }
      },

      register: async (
        email: string,
        password: string,
      ): Promise<string | null> => {
        try {
          set({ isPending: true });
          const user: User = await authService.signUp({ email, password });
          set({
            isAuthenticated: true,
            userId: user.id,
            email,
            isPending: false,
          });
          return null;
        } catch (err) {
          set({ isPending: false });
          return parseError(err);
        }
      },

      forgotPassword: async (email: string): Promise<string | null> => {
        try {
          set({ isPending: true });
          await authService.forgotPassword({ email });
          set({ email, isPending: false });
          return null;
        } catch (err) {
          set({ isPending: false });
          return parseError(err);
        }
      },

      resetPassword: async (
        payload: ResetPasswordPayload,
      ): Promise<string | null> => {
        try {
          set({ isPending: true });
          await authService.resetPassword(payload);
          set({ isPending: false });
          return null;
        } catch (err) {
          set({ isPending: false });
          return parseError(err);
        }
      },

      logout: async (): Promise<void> => {
        await authService.logout();
        set({
          isAuthenticated: false,
          userId: null,
          email: null,
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
        email: state.email,
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
