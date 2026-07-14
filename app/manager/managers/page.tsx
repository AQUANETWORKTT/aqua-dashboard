"use client";

import Link from "next/link";
import { useState } from "react";

type ManagerProfile = {
  name: string;
  displayName: string;
  focus: string;
  imageNames?: string[];
};

const managers: ManagerProfile[] = [
  { name: "james", displayName: "James", focus: "Team management and creator intelligence" },
  { name: "dylan", displayName: "Dylan", focus: "Creator support and team growth" },
  { name: "mavis", displayName: "Mavis", focus: "Creator support and team growth" },
  { name: "chris", displayName: "Chris", focus: "Creator support and team growth" },
  { name: "ellie", displayName: "Ellie", focus: "Creator support and team growth" },
  { name: "teddie", displayName: "Teddie", focus: "Creator support and team growth", imageNames: ["teddie-new"] },
  { name: "millie", displayName: "Millie", focus: "Creator support and team growth" },
  { name: "vitali", displayName: "Vitaly", focus: "Creator support and team growth" },
  { name: "harry", displayName: "Harry", focus: "Creator support and team growth" },
  { name: "luke", displayName: "Luke", focus: "Creator support and team growth" },
];

function ManagerImage({ manager }: { manager: ManagerProfile }) {
  const imageName = manager.imageNames?.[0] || manager.name;
  const jpgSrc = `/creators/${encodeURIComponent(imageName)}.jpg`;
  const pngSrc = `/creators/${encodeURIComponent(imageName)}.png`;
  const [src, setSrc] = useState(jpgSrc);

  return (
    <img
      src={src}
      alt={manager.displayName}
      onError={() => {
        if (src === jpgSrc) setSrc(pngSrc);
        else setSrc("/creators/default.jpg");
      }}
      className="manager-image-real"
    />
  );
}

export default function ManagerDirectoryPage() {
  return (
    <section className="manager-page">
      <style>{`
        .manager-page {
          min-height: 100vh;
          padding: 28px 12px 42px;
          background:
            radial-gradient(circle at top left, rgba(14, 165, 233, 0.28), transparent 34%),
            radial-gradient(circle at top right, rgba(6, 182, 212, 0.22), transparent 32%),
            linear-gradient(135deg, #020617 0%, #062033 48%, #030712 100%);
          color: white;
        }

        .manager-shell {
          max-width: 1120px;
          margin: 0 auto;
        }

        .manager-hero {
          text-align: center;
          margin-bottom: 24px;
        }

        .manager-pill {
          display: inline-flex;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(125, 211, 252, 0.24);
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #bae6fd;
          margin-bottom: 12px;
        }

        .manager-title {
          font-size: clamp(36px, 9vw, 78px);
          line-height: 0.95;
          margin: 0;
          font-weight: 950;
          text-transform: uppercase;
          text-shadow: 0 0 28px rgba(56, 189, 248, 0.34);
        }

        .manager-subtitle {
          max-width: 760px;
          margin: 14px auto 0;
          color: #cbd5e1;
          font-size: 15px;
          line-height: 1.6;
        }

        .manager-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .manager-row {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: 146px 1fr;
          gap: 16px;
          min-height: 164px;
          padding: 16px;
          border-radius: 24px;
          background:
            linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04)),
            rgba(2, 6, 23, 0.7);
          border: 1px solid rgba(125, 211, 252, 0.18);
          box-shadow: 0 14px 34px rgba(0,0,0,0.24), 0 0 24px rgba(56,189,248,.1) inset;
        }

        .manager-image-wrap {
          position: relative;
          width: 130px;
          height: 130px;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid rgba(125, 211, 252, 0.32);
          background: rgba(15, 23, 42, 0.72);
          box-shadow: 0 0 22px rgba(56,189,248,.18);
        }

        .manager-image-real {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .row-main {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }

        .row-name {
          font-size: clamp(24px, 3.5vw, 36px);
          font-weight: 950;
          line-height: 1;
          color: #f8fafc;
        }

        .row-focus {
          margin-top: 8px;
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.45;
        }

        .row-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 16px;
        }

        .row-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          border: 1px solid rgba(125, 211, 252, 0.28);
          background: rgba(14, 165, 233, 0.14);
          padding: 10px 12px;
          color: #e0f2fe;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .row-link:hover {
          background: rgba(14, 165, 233, 0.24);
        }

        @media (max-width: 820px) {
          .manager-list {
            grid-template-columns: 1fr;
          }

          .manager-row {
            grid-template-columns: 112px 1fr;
            padding: 12px;
            border-radius: 20px;
          }

          .manager-image-wrap {
            width: 100px;
            height: 120px;
          }
        }

        @media (max-width: 420px) {
          .manager-row {
            grid-template-columns: 1fr;
          }

          .manager-image-wrap {
            width: 100%;
            height: 180px;
          }
        }
      `}</style>

      <div className="manager-shell">
        <div className="manager-hero">
          <div className="manager-pill">Aqua Management</div>
          <h1 className="manager-title">Managers</h1>
          <p className="manager-subtitle">
            A simple overview of the Aqua management team with quick access to the tools managers still use.
          </p>
        </div>

        <div className="manager-list">
          {managers.map((manager) => (
            <div key={manager.name} className="manager-row">
              <div className="manager-image-wrap">
                <ManagerImage manager={manager} />
              </div>

              <div className="row-main">
                <div className="row-name">{manager.displayName}</div>
                <div className="row-focus">{manager.focus}</div>

                <div className="row-actions">
                  <Link href="/manager/portal" className="row-link">
                    Open Portal
                  </Link>
                  <Link href="/manager/battle-generator" className="row-link">
                    Poster Generator
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
