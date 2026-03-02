import { useUser } from "@/contexts/user";
import { Redirect, Slot } from "expo-router";

export default function AuthLayout() {
  const { isAuthenticated, currentUser } = useUser();

  if (isAuthenticated && currentUser?.username) {
    return <Redirect href="/(app)" />;
  }

  return <Slot />;
}
