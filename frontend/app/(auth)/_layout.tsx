import { Redirect, Slot } from "expo-router";
import { useUser } from "@/contexts/user";

export default function AuthLayout() {
  const { isAuthenticated } = useUser();

  if (isAuthenticated) {
    return <Redirect href="/(app)" />;
  }

  return <Slot />;
}
