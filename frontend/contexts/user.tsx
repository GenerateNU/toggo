import { useUserStore } from "@/auth/store";
import type { CurrentUser } from "@/auth/service";
import { PhoneAuth } from "@/types/auth";
import { createContext, ReactNode, useContext } from "react";

interface UserContextType {
  isAuthenticated: boolean;
  userId: string | null;
  isPending: boolean;
  error: string | null;
  signupData: {
    name: string | null;
    username: string | null;
    phone: string | null;
  };
  currentUser: CurrentUser | null | undefined;

  sendOTP: (phoneNo: string) => Promise<void>;
  verifyOTP: (payload: PhoneAuth) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  logout: () => Promise<void>;
  setSignupData: (name: string, username: string, phone: string) => void;
  clearSignupData: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // State
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const userId = useUserStore((state) => state.userId);
  const isPending = useUserStore((state) => state.isPending);
  const error = useUserStore((state) => state.error);
  const signupData = useUserStore((state) => state.signupData);
  const currentUser = useUserStore((state) => state.currentUser);

  // Methods
  const logout = useUserStore((state) => state.logout);
  const sendOTP = useUserStore((state) => state.sendOTP);
  const verifyOTP = useUserStore((state) => state.verifyOTP);
  const refreshCurrentUser = useUserStore((state) => state.refreshCurrentUser);
  const setSignupData = useUserStore((state) => state.setSignupData);
  const clearSignupData = useUserStore((state) => state.clearSignupData);

  return (
    <UserContext.Provider
      value={{
        isAuthenticated,
        userId,
        isPending,
        error,
        signupData,
        currentUser,
        logout,
        sendOTP,
        verifyOTP,
        refreshCurrentUser,
        setSignupData,
        clearSignupData,
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
