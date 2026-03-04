import type { CurrentUser } from "@/auth/service";
import { useUserStore } from "@/auth/store";
import { PhoneAuth } from "@/types/auth";
import { createContext, ReactNode, useContext } from "react";

interface UserContextType {
  isAuthenticated: boolean;
  userId: string | null;
  isPending: boolean;
  currentUser: CurrentUser | null | undefined;
  phoneNumber: string | null;
  pendingTripCode: string | null;

  sendOTP: (phoneNo: string) => Promise<void>;
  verifyOTP: (payload: PhoneAuth) => Promise<void>;
  refreshCurrentUser: () => Promise<CurrentUser>;
  setPendingTripCode: (code: string | null) => void;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // State
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const userId = useUserStore((state) => state.userId);
  const isPending = useUserStore((state) => state.isPending);
  const currentUser = useUserStore((state) => state.currentUser);
  const phoneNumber = useUserStore((state) => state.phoneNumber);
  const pendingTripCode = useUserStore((state) => state.pendingTripCode);

  // Methods
  const logout = useUserStore((state) => state.logout);
  const sendOTP = useUserStore((state) => state.sendOTP);
  const verifyOTP = useUserStore((state) => state.verifyOTP);
  const refreshCurrentUser = useUserStore((state) => state.refreshCurrentUser);
  const setPendingTripCode = useUserStore((state) => state.setPendingTripCode);

  return (
    <UserContext.Provider
      value={{
        isAuthenticated,
        userId,
        isPending,
        currentUser,
        phoneNumber,
        pendingTripCode,
        logout,
        sendOTP,
        verifyOTP,
        refreshCurrentUser,
        setPendingTripCode,
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
