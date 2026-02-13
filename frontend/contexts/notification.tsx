import { useUpdateUser } from "@/api";
import { useUser } from "@/contexts/user";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

type NotificationData = {
  title?: string;
  body?: string;
  data?: {
    postId?: string;
    id?: string;
    [key: string]: any;
  };
};

type NotificationContextType = {
  expoPushToken: string | null;
  lastNotification: NotificationData | null;
  clearLastNotification: () => void;
};

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: null,
  lastNotification: null,
  clearLastNotification: () => {},
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [lastNotification, setLastNotification] =
    useState<NotificationData | null>(null);
  const notificationListener = useRef<Notifications.Subscription | undefined>(
    undefined,
  );
  const responseListener = useRef<Notifications.Subscription | undefined>(
    undefined,
  );

  const { userId, isAuthenticated } = useUser();
  const updateUser = useUpdateUser();

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);

        updateUser.mutate({
          userID: userId,
          data: { device_token: token },
        });
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        const title: string | undefined =
          notification.request.content.title ?? undefined;
        const body: string | undefined =
          notification.request.content.body ?? undefined;
        const data = notification.request.content.data ?? undefined;
        setLastNotification({ title, body, data });
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        const postId = data?.postId;
        const id = data?.id;

        if (postId) {
          router.push(`/(app)/view-post/${postId}`);
          return;
        }

        if (id) {
          router.push(`/(app)/view-post/${id}`);
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [userId, isAuthenticated, updateUser]);

  const clearLastNotification = () => {
    setLastNotification(null);
  };

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        lastNotification,
        clearLastNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
};

async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      if (!projectId) {
        return null;
      }

      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      console.warn(e);
      return null;
    }
  }

  return token;
}
