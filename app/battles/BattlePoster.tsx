"use client";

import type { RefCallback } from "react";

export type PosterElementKey =
  | "avatar1"
  | "avatar2"
  | "username1"
  | "username2"
  | "date"
  | "time";

export type PosterElement = {
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowX?: number;
  shadowY?: number;
  shadowBlur?: number;
  letterSpacing?: number;
  fontWeight?: number;
  uppercase?: boolean;
  gradientEnabled?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: string;
};

export type PosterTemplateJson = Record<PosterElementKey, PosterElement> & {
  backgroundUrl?: string;
};

export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1920;

export const DEFAULT_POSTER_TEMPLATE: PosterTemplateJson = {
  backgroundUrl: "/posters/aqua-battle/background.png",
  avatar1: { x: 82, y: 570, width: 346, height: 346 },
  avatar2: { x: 651, y: 570, width: 346, height: 346 },
  username1: {
    x: 17,
    y: 953,
    width: 480,
    height: 70,
    fontFamily: "Luckiest Guy",
    fontSize: 58,
    color: "#5CEEFF",
    strokeColor: "black",
    strokeWidth: 2,
    shadowColor: "#000000",
    shadowX: 2,
    shadowY: 2,
    shadowBlur: 0,
    letterSpacing: 1,
    fontWeight: 900,
    uppercase: true,
    gradientEnabled: false,
    gradientFrom: "#5CEEFF",
    gradientTo: "#0044FF",
    gradientDirection: "to bottom",
  },
  username2: {
    x: 585,
    y: 953,
    width: 480,
    height: 70,
    fontFamily: "Luckiest Guy",
    fontSize: 58,
    color: "#5CEEFF",
    strokeColor: "black",
    strokeWidth: 2,
    shadowColor: "#000000",
    shadowX: 2,
    shadowY: 2,
    shadowBlur: 0,
    letterSpacing: 1,
    fontWeight: 900,
    uppercase: true,
    gradientEnabled: false,
    gradientFrom: "#5CEEFF",
    gradientTo: "#0044FF",
    gradientDirection: "to bottom",
  },
  date: {
    x: 155,
    y: 1337,
    width: 560,
    height: 70,
    fontFamily: "Luckiest Guy",
    fontSize: 62,
    color: "#5CEEFF",
    strokeColor: "black",
    strokeWidth: 2,
    shadowColor: "#000000",
    shadowX: 3,
    shadowY: 3,
    shadowBlur: 0,
    letterSpacing: 1,
    fontWeight: 900,
    uppercase: true,
    gradientEnabled: false,
    gradientFrom: "#5CEEFF",
    gradientTo: "#0044FF",
    gradientDirection: "to bottom",
  },
  time: {
    x: 715,
    y: 1337,
    width: 210,
    height: 70,
    fontFamily: "Luckiest Guy",
    fontSize: 62,
    color: "#5CEEFF",
    strokeColor: "black",
    strokeWidth: 2,
    shadowColor: "#000000",
    shadowX: 3,
    shadowY: 3,
    shadowBlur: 0,
    letterSpacing: 1,
    fontWeight: 900,
    uppercase: true,
    gradientEnabled: false,
    gradientFrom: "#5CEEFF",
    gradientTo: "#0044FF",
    gradientDirection: "to bottom",
  },
};

export function normalizePosterTemplate(
  input: Partial<PosterTemplateJson> | null | undefined
): PosterTemplateJson {
  const incoming = input || {};
  const hasSeparateTimeElement = Object.prototype.hasOwnProperty.call(
    incoming,
    "time"
  );

  return {
    ...structuredClone(DEFAULT_POSTER_TEMPLATE),
    ...incoming,
    avatar1: {
      ...DEFAULT_POSTER_TEMPLATE.avatar1,
      ...(incoming.avatar1 || {}),
    },
    avatar2: {
      ...DEFAULT_POSTER_TEMPLATE.avatar2,
      ...(incoming.avatar2 || {}),
    },
    username1: {
      ...DEFAULT_POSTER_TEMPLATE.username1,
      ...(incoming.username1 || {}),
    },
    username2: {
      ...DEFAULT_POSTER_TEMPLATE.username2,
      ...(incoming.username2 || {}),
    },
    date: {
      ...DEFAULT_POSTER_TEMPLATE.date,
      ...(incoming.date || {}),
      ...(!hasSeparateTimeElement
        ? { width: DEFAULT_POSTER_TEMPLATE.date.width }
        : {}),
    },
    time: { ...DEFAULT_POSTER_TEMPLATE.time, ...(incoming.time || {}) },
    backgroundUrl: Object.prototype.hasOwnProperty.call(
      incoming,
      "backgroundUrl"
    )
      ? incoming.backgroundUrl
      : DEFAULT_POSTER_TEMPLATE.backgroundUrl,
  };
}

function addCacheBustToImageUrl(url: string, key?: string | number) {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}avatarRefresh=${key || Date.now()}`;
}

function autoFontSize(value: string, element: PosterElement, fallback: number) {
  return Math.max(
    26,
    Math.min(element.fontSize || fallback, fallback - value.length * 0.9)
  );
}

function renderTextElement(
  template: PosterTemplateJson,
  key: "username1" | "username2" | "date" | "time",
  value: string,
  fallbackSize: number
) {
  if (!value) return null;

  const element = template[key];
  const fontSize =
    key === "date" || key === "time"
      ? element.fontSize || fallbackSize
      : autoFontSize(value, element, fallbackSize);

  return (
    <div
      className="absolute"
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
      }}
    >
      <div
        className="flex h-full w-full items-center justify-center"
        style={{
          fontFamily: `'${element.fontFamily || "Luckiest Guy"}', sans-serif`,
          WebkitTextStroke: `${element.strokeWidth ?? 2}px ${
            element.strokeColor || "black"
          }`,
          textShadow: `${element.shadowX ?? 2}px ${
            element.shadowY ?? 2
          }px ${element.shadowBlur ?? 0}px ${
            element.shadowColor || "#000000"
          }`,
          letterSpacing: `${element.letterSpacing ?? 1}px`,
          fontSize,
          fontWeight: element.fontWeight || 900,
          textTransform: element.uppercase === false ? "none" : "uppercase",
        }}
      >
        <span
          className="whitespace-nowrap text-center leading-none"
          style={{
            background: element.gradientEnabled
              ? `linear-gradient(
                  ${element.gradientDirection || "to bottom"},
                  ${element.gradientFrom || "#5CEEFF"},
                  ${element.gradientTo || "#0044FF"}
                )`
              : undefined,
            WebkitBackgroundClip: element.gradientEnabled ? "text" : undefined,
            backgroundClip: element.gradientEnabled ? "text" : undefined,
            WebkitTextFillColor: element.gradientEnabled
              ? "transparent"
              : element.color || "#5CEEFF",
            color: element.gradientEnabled
              ? "transparent"
              : element.color || "#5CEEFF",
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function renderAvatarElement(
  template: PosterTemplateJson,
  key: "avatar1" | "avatar2",
  image: string,
  nameKey: string,
  battleId: string
) {
  if (!image) return null;

  const element = template[key];

  return (
    <div
      className="absolute overflow-hidden rounded-full"
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
      }}
    >
      <img
        crossOrigin="anonymous"
        src={addCacheBustToImageUrl(image, `${battleId}-${key}-${nameKey}`)}
        className="h-full w-full rounded-full object-cover"
        alt=""
      />
    </div>
  );
}

export function BattlePoster({
  battleId,
  template,
  name1,
  name2,
  image1,
  image2,
  date,
  time,
  scale = 0.194,
  posterRef,
}: {
  battleId: string;
  template: PosterTemplateJson;
  name1: string;
  name2: string;
  image1: string;
  image2: string;
  date: string;
  time: string;
  scale?: number;
  posterRef?: RefCallback<HTMLDivElement>;
}) {
  const activeTemplate = normalizePosterTemplate(template);
  const backgroundUrl =
    activeTemplate.backgroundUrl || DEFAULT_POSTER_TEMPLATE.backgroundUrl;

  return (
    <div
      className="mx-auto overflow-hidden rounded-lg bg-black"
      style={{
        width: POSTER_WIDTH * scale,
        height: POSTER_HEIGHT * scale,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <div
          ref={posterRef}
          className="relative h-[1920px] w-[1080px] overflow-hidden bg-black"
        >
          {backgroundUrl ? (
            <img
              src={backgroundUrl}
              className="absolute inset-0 h-full w-full object-cover"
              alt=""
            />
          ) : null}

          {renderAvatarElement(activeTemplate, "avatar1", image1, name1, battleId)}
          {renderAvatarElement(activeTemplate, "avatar2", image2, name2, battleId)}
          {renderTextElement(activeTemplate, "username1", name1, 58)}
          {renderTextElement(activeTemplate, "username2", name2, 58)}
          {renderTextElement(activeTemplate, "date", date, 62)}
          {renderTextElement(activeTemplate, "time", time, 62)}
        </div>
      </div>
    </div>
  );
}
