import { createContext, useContext, ReactNode } from "react";
import { ResetPasswordPayload } from "@/types/auth";
import { UserState, useUserStore } from "@/auth/store";

interface UserContextType {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  isPending: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string | null>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<string | null>;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = useUserStore(
    (state: UserState) => state.isAuthenticated,
  );
  const userId = useUserStore((state: UserState) => state.userId);
  const email = useUserStore((state: UserState) => state.email);
  const isPending = useUserStore((state: UserState) => state.isPending);
  const login = useUserStore((state: UserState) => state.login);
  const register = useUserStore((state: UserState) => state.register);
  const logout = useUserStore((state: UserState) => state.logout);
  const forgotPassword = useUserStore(
    (state: UserState) => state.forgotPassword,
  );
  const resetPassword = useUserStore((state: UserState) => state.resetPassword);

  return (
    <UserContext.Provider
      value={{
        isAuthenticated,
        userId,
        email,
        isPending,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
