"use client";

import { useEffect, useMemo, useState } from "react";

type Submission = {
  id: string;
  username: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  imageNames: string[];
  imageUrls: string[];
  imageCount: number;
  points: number;
};

function getPointsFromImageCount(count: number) {
  return Math.min(Math.floor(count / 2), 3);
}

export default function UploadPage() {
  const [username, setUsername] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const user = localStorage.getItem("manager_username");
    if (user) setUsername(user);
  }, []);

  const points = useMemo(() => getPointsFromImageCount(files.length), [files]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    setMessage("");
  };

  const handleSubmit = () => {
    if (!username.trim()) {
      setMessage("No username found.");
      return;
    }

    if (files.length === 0) {
      setMessage("Please select at least 1 image.");
      return;
    }

    const existingRaw = localStorage.getItem("manager_upload_submissions");
    const existing: Submission[] = existingRaw ? JSON.parse(existingRaw) : [];

    const submission: Submission = {
      id: crypto.randomUUID(),
      username: username.trim().toLowerCase(),
      status: "pending",
      createdAt: new Date().toISOString(),
      imageNames: files.map((file) => file.name),
      imageUrls: files.map((file) => URL.createObjectURL(file)),
      imageCount: files.length,
      points,
    };

    localStorage.setItem(
      "manager_upload_submissions",
      JSON.stringify([submission, ...existing])
    );

    setFiles([]);
    setMessage(
      `Upload submitted for approval. ${files.length} image${files.length === 1 ? "" : "s"} selected • ${points} point${points === 1 ? "" : "s"} pending.`
    );
  };

  return (
    <section className="manager-wrapper">
      <div className="manager-hero">
        <div className="manager-pill">Upload Portal</div>
        <h1 className="manager-title">Submit Proof</h1>
        <p className="manager-subtitle">
          Upload your proof images. Points are worked out automatically.
        </p>
      </div>

      <div className="manager-card">
        <div className="manager-form">
          <label className="manager-label manager-label-glow">
            Username
            <input value={username} readOnly className="manager-input" />
          </label>

          <div className="manager-upload-box">
            <div className="manager-upload-title">Upload Images</div>
            <input
              type="file"
              accept="image/*"
              multiple
              className="manager-file"
              onChange={handleFileChange}
            />
          </div>

          <div className="manager-card-sub">
            Selected: {files.length} image{files.length === 1 ? "" : "s"} • Points: {points}
          </div>

          {files.length > 0 ? (
            <div className="manager-submission-images">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="manager-submission-image-card"
                >
                  <div className="manager-submission-image-frame">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name || `Image ${index + 1}`}
                      className="manager-submission-image"
                    />
                  </div>
                  <div className="manager-small">{file.name}</div>
                </div>
              ))}
            </div>
          ) : null}

          {message ? <p className="manager-message">{message}</p> : null}

          <button type="button" className="manager-button" onClick={handleSubmit}>
            Upload Proof
          </button>
        </div>
      </div>
    </section>
  );
}