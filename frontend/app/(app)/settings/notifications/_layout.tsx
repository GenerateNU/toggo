import { useUser } from "@/contexts/user";
import { Redirect, Slot } from "expo-router";

const Layout = () => {
  const { isAuthenticated } = useUser();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Slot />;
};

export default Layout;
