import type { CurrentUser } from "@/auth/service";
import { useUserStore } from "@/auth/store";
import { PhoneAuth } from "@/types/auth";
import { createContext, ReactNode, useContext } from "react";

interface UserContextType {
  isAuthenticated: boolean;
  userId: string | null;
  isPending: boolean;
  currentUser: CurrentUser | null | undefined;

  sendOTP: (phoneNo: string) => Promise<void>;
  verifyOTP: (payload: PhoneAuth) => Promise<void>;
  refreshCurrentUser: () => Promise<CurrentUser>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // State
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const userId = useUserStore((state) => state.userId);
  const isPending = useUserStore((state) => state.isPending);
  const currentUser = useUserStore((state) => state.currentUser);

  // Methods
  const logout = useUserStore((state) => state.logout);
  const sendOTP = useUserStore((state) => state.sendOTP);
  const verifyOTP = useUserStore((state) => state.verifyOTP);
  const refreshCurrentUser = useUserStore((state) => state.refreshCurrentUser);

  return (
    <UserContext.Provider
      value={{
        isAuthenticated,
        userId,
        isPending,
        currentUser,
        logout,
        sendOTP,
        verifyOTP,
        refreshCurrentUser,
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
