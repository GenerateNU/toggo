import { useUser } from "@/contexts/user";
import { SplashScreen } from "@/design-system/components/brand/splash-screen";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function Index() {
  const { isAuthenticated } = useUser();
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isAuthenticated) {
        router.replace("/(app)");
      } else {
        router.replace("/(auth)/login");
      }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [isAuthenticated, router]);

  return (
    <SplashScreen />
  );
}
