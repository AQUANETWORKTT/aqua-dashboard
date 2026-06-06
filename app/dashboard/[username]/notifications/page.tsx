"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type ReminderScope = "mine" | "all";
type ReminderMinutes = "5" | "10" | "15" | "30";

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
  const manager = String(params.username || "").trim().toLowerCase();

  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [scope, setScope] = useState<ReminderScope>("mine");
  const [minutes, setMinutes] = useState<ReminderMinutes>("5");
  const [status, setStatus] = useState("Checking notification support...");
  const [saving, setSaving] = useState(false);

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

        const settingsResponse = await fetch(
          `/api/notifications/settings?manager=${encodeURIComponent(manager)}`,
          { cache: "no-store" }
        );

        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();

          if (settings?.settings) {
            setEnabled(Boolean(settings.settings.enabled && existingSubscription));
            setScope(settings.settings.scope === "all" ? "all" : "mine");
            setMinutes(String(settings.settings.minutes_before || "5") as ReminderMinutes);
          }
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not check notifications.");
      }
    }

    if (manager) {
      checkNotifications();
    }
  }, [manager]);

  async function saveSettings(nextEnabled: boolean) {
    const response = await fetch("/api/notifications/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        manager,
        enabled: nextEnabled,
        scope,
        minutes_before: Number(minutes),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to save notification settings.");
    }
  }

  async function enableNotifications() {
    try {
      setSaving(true);
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

      await saveSettings(true);

      setEnabled(true);
      setStatus("Notifications and settings are saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to turn notifications on.");
    } finally {
      setSaving(false);
    }
  }

  async function disableNotifications() {
    try {
      setSaving(true);
      setStatus("Turning notifications off...");

      const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
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

      await saveSettings(false);

      setEnabled(false);
      setStatus("Notifications are turned off.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to turn notifications off.");
    } finally {
      setSaving(false);
    }
  }

  async function saveOnlySettings() {
    try {
      setSaving(true);
      setStatus("Saving notification settings...");

      await saveSettings(enabled);

      setStatus("Notification settings saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      setSaving(false);
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
          maxWidth: "720px",
          margin: "0 auto",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.16)",
          borderRadius: "22px",
          padding: "24px",
          boxShadow: "0 18px 60px rgba(0,0,0,0.28)",
        }}
      >
        <Link
          href="/manager/portal"
          style={{
            display: "inline-block",
            marginBottom: "16px",
            color: "#67e8f9",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Back to Dashboard
        </Link>

        <h1 style={{ margin: "0 0 8px", fontSize: "30px", lineHeight: 1.1 }}>
          Aqua Battle Notifications
        </h1>

        <p
          style={{
            margin: "0 0 22px",
            color: "rgba(255,255,255,0.78)",
            lineHeight: 1.5,
          }}
        >
          Turn notifications on, choose which battles you want, and set how long before each battle
          you want the reminder.
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

        <div style={{ display: "grid", gap: "18px" }}>
          <section
            style={{
              padding: "16px",
              borderRadius: "16px",
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: "20px" }}>Reminder Type</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setScope("mine")}
                style={{
                  border: scope === "mine" ? "1px solid #22d3ee" : "1px solid rgba(255,255,255,0.14)",
                  borderRadius: "14px",
                  padding: "14px",
                  background: scope === "mine" ? "rgba(34,211,238,0.22)" : "rgba(0,0,0,0.25)",
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                My Battles Only
                <span style={{ display: "block", opacity: 0.7, fontWeight: 500, marginTop: "6px" }}>
                  Only battles assigned to me.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope("all")}
                style={{
                  border: scope === "all" ? "1px solid #22d3ee" : "1px solid rgba(255,255,255,0.14)",
                  borderRadius: "14px",
                  padding: "14px",
                  background: scope === "all" ? "rgba(34,211,238,0.22)" : "rgba(0,0,0,0.25)",
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                All Battles
                <span style={{ display: "block", opacity: 0.7, fontWeight: 500, marginTop: "6px" }}>
                  Every battle uploaded.
                </span>
              </button>
            </div>
          </section>

          <section
            style={{
              padding: "16px",
              borderRadius: "16px",
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: "20px" }}>Reminder Time</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
              {(["5", "10", "15", "30"] as ReminderMinutes[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMinutes(option)}
                  style={{
                    border: minutes === option ? "1px solid #22d3ee" : "1px solid rgba(255,255,255,0.14)",
                    borderRadius: "14px",
                    padding: "14px 8px",
                    background: minutes === option ? "rgba(34,211,238,0.22)" : "rgba(0,0,0,0.25)",
                    color: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {option} mins
                </button>
              ))}
            </div>
          </section>

          <section
            style={{
              padding: "16px",
              borderRadius: "16px",
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: "20px" }}>Current Setup</h2>

            <p style={{ margin: "0 0 6px" }}>
              <strong>Status:</strong> {enabled ? "Enabled" : "Disabled"}
            </p>
            <p style={{ margin: "0 0 6px" }}>
              <strong>Notifications:</strong>{" "}
              {scope === "mine" ? "My Battles Only" : "All Battles"}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Reminder:</strong> {minutes} minutes before
            </p>
          </section>

          {!supported ? (
            <p style={{ color: "#fecaca" }}>
              This browser or device does not support push notifications.
            </p>
          ) : enabled ? (
            <button
              type="button"
              onClick={disableNotifications}
              disabled={saving}
              style={{
                width: "100%",
                border: 0,
                borderRadius: "15px",
                padding: "15px 18px",
                background: "#ef4444",
                color: "white",
                fontWeight: 900,
                fontSize: "16px",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.65 : 1,
              }}
            >
              {saving ? "Saving..." : "Turn Notifications Off"}
            </button>
          ) : (
            <button
              type="button"
              onClick={enableNotifications}
              disabled={saving}
              style={{
                width: "100%",
                border: 0,
                borderRadius: "15px",
                padding: "15px 18px",
                background: "#22c55e",
                color: "#052e16",
                fontWeight: 900,
                fontSize: "16px",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.65 : 1,
              }}
            >
              {saving ? "Saving..." : "Enable Notifications"}
            </button>
          )}

          <button
            type="button"
            onClick={saveOnlySettings}
            disabled={saving}
            style={{
              width: "100%",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: "15px",
              padding: "15px 18px",
              background: "rgba(255,255,255,0.08)",
              color: "white",
              fontWeight: 900,
              fontSize: "16px",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.65 : 1,
            }}
          >
            Save Settings
          </button>
        </div>
      </section>
    </main>
  );
}