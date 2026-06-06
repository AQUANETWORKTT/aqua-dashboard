"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default function ManagerNotificationsPage() {
  const params = useParams();
  const manager = String(params.manager || "").trim().toLowerCase();

  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("Checking notification support...");

  useEffect(() => {
    async function checkNotifications() {
      try {
        const isSupported =
          typeof window !== "undefined" &&
          "serviceWorker" in navigator &&
          "PushManager" in window &&
          "Notification" in window;

        setSupported(isSupported);

        if (!isSupported) {
          setStatus("This browser does not support push notifications.");
          return;
        }

        setPermission(Notification.permission);

        const registration = await navigator.serviceWorker.register("/push-sw.js");
        const existingSubscription = await registration.pushManager.getSubscription();

        setEnabled(Boolean(existingSubscription));
        setStatus(
          existingSubscription
            ? "Notifications are already turned on."
            : "Notifications are not turned on yet."
        );
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not check notifications.");
      }
    }

    checkNotifications();
  }, []);

  async function enableNotifications() {
    try {
      setStatus("Requesting notification permission...");

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        setStatus("Notification permission was blocked or dismissed.");
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;

      if (!vapidKey) {
        setStatus("Missing NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/push-sw.js");

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          manager,
          subscription: subscription.toJSON(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save notification subscription.");
      }

      setEnabled(true);
      setStatus("Notifications are now turned on.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to turn notifications on.");
    }
  }

  async function disableNotifications() {
    try {
      setStatus("Turning notifications off...");

      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/notifications/unsubscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });

        await subscription.unsubscribe();
      }

      setEnabled(false);
      setStatus("Notifications are turned off.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to turn notifications off.");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        background:
          "radial-gradient(circle at top, rgba(34,211,238,0.22), transparent 34%), #061923",
        color: "white",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "620px",
          margin: "0 auto",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.16)",
          borderRadius: "22px",
          padding: "24px",
          boxShadow: "0 18px 60px rgba(0,0,0,0.28)",
        }}
      >
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "30px",
            lineHeight: 1.1,
          }}
        >
          Aqua Battle Notifications
        </h1>

        <p
          style={{
            margin: "0 0 22px",
            color: "rgba(255,255,255,0.78)",
            lineHeight: 1.5,
          }}
        >
          Turn these on to receive browser reminders before your scheduled Aqua battles.
        </p>

        <div
          style={{
            display: "grid",
            gap: "10px",
            padding: "16px",
            borderRadius: "16px",
            background: "rgba(0,0,0,0.24)",
            border: "1px solid rgba(255,255,255,0.1)",
            marginBottom: "20px",
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>Manager:</strong> {manager || "unknown"}
          </p>

          <p style={{ margin: 0 }}>
            <strong>Browser permission:</strong> {permission}
          </p>

          <p style={{ margin: 0 }}>
            <strong>Status:</strong> {status}
          </p>
        </div>

        {!supported ? (
          <p style={{ color: "#fecaca" }}>
            This browser or device does not support push notifications.
          </p>
        ) : enabled ? (
          <button
            type="button"
            onClick={disableNotifications}
            style={{
              width: "100%",
              border: 0,
              borderRadius: "15px",
              padding: "15px 18px",
              background: "#ef4444",
              color: "white",
              fontWeight: 900,
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Turn Notifications Off
          </button>
        ) : (
          <button
            type="button"
            onClick={enableNotifications}
            style={{
              width: "100%",
              border: 0,
              borderRadius: "15px",
              padding: "15px 18px",
              background: "#22c55e",
              color: "#052e16",
              fontWeight: 900,
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Turn Notifications On
          </button>
        )}
      </section>
    </main>
  );
}