"use client";

import { useEffect, useMemo, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

function getPointsFromImageCount(count: number) {
  return Math.min(Math.floor(count / 2), 3);
}

type ExistingSubmissionRow = {
  created_at: string;
  image_names: string[] | null;
};

function toDateKey(dateString: string) {
  return new Date(dateString).toISOString().slice(0, 10);
}

export default function UploadPage() {
  const [username, setUsername] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("manager_username");
    if (user) setUsername(user);
  }, []);

  const points = useMemo(() => getPointsFromImageCount(files.length), [files]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).slice(0, 4);
    setFiles(selectedFiles);
    setMessage("");
  };

  const handleSubmit = async () => {
    if (!username.trim()) {
      setMessage("No username found.");
      return;
    }

    if (files.length === 0) {
      setMessage("Please select at least 1 image.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const cleanUsername = username.trim().toLowerCase();
      const todayKey = new Date().toISOString().slice(0, 10);

      const { data: existingSubmissions, error: existingError } =
        await submissionsSupabase
          .from("submissions")
          .select("created_at, image_names")
          .eq("username", cleanUsername);

      if (existingError) {
        throw new Error(existingError.message);
      }

      const previousFileNames = new Set<string>();

      ((existingSubmissions || []) as ExistingSubmissionRow[]).forEach((row) => {
        const rowDateKey = toDateKey(row.created_at);

        if (rowDateKey !== todayKey) {
          (row.image_names || []).forEach((name) => previousFileNames.add(name));
        }
      });

      const duplicateFileNames = files
        .map((file) => file.name)
        .filter((name) => previousFileNames.has(name));

      const possibleDuplicate = duplicateFileNames.length > 0;

      const uploadedUrls: string[] = [];
      const uploadedNames: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const safeName = file.name.replace(/\s+/g, "-");
        const filePath = `${cleanUsername}/${Date.now()}-${i}-${safeName}`;

        const { error: uploadError } = await submissionsSupabase.storage
          .from("submission-images")
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data: publicUrlData } = submissionsSupabase.storage
          .from("submission-images")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrlData.publicUrl);
        uploadedNames.push(file.name);
      }

      const { error: insertError } = await submissionsSupabase
        .from("submissions")
        .insert({
          username: cleanUsername,
          status: "pending",
          created_at: new Date().toISOString(),
          image_names: uploadedNames,
          image_urls: uploadedUrls,
          image_count: files.length,
          points,
          possible_duplicate: possibleDuplicate,
          duplicate_file_names: duplicateFileNames,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setFiles([]);

      if (possibleDuplicate) {
        setMessage(
          `Upload submitted for approval. ${files.length} image${files.length === 1 ? "" : "s"} selected • ${points} point${points === 1 ? "" : "s"} pending. Possible duplicate flagged for admin review.`
        );
      } else {
        setMessage(
          `Upload submitted for approval. ${files.length} image${files.length === 1 ? "" : "s"} selected • ${points} point${points === 1 ? "" : "s"} pending.`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed.";
      setMessage(errorMessage);
    } finally {
      setSubmitting(false);
    }
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

          <button
            type="button"
            className="manager-button"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Uploading..." : "Upload Proof"}
          </button>
        </div>
      </div>
    </section>
  );
}