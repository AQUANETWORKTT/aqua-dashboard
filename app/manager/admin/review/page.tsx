"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

type ManagerRow = {
  name: string;
  recruitPoints: number;
  submissionPoints: number;
};

const defaultManagers: ManagerRow[] = [
  { name: "james", recruitPoints: 0, submissionPoints: 0 },
  { name: "alfie", recruitPoints: 0, submissionPoints: 0 },
  { name: "dylan", recruitPoints: 0, submissionPoints: 0 },
  { name: "jay", recruitPoints: 0, submissionPoints: 0 },
  { name: "ellie", recruitPoints: 0, submissionPoints: 0 },
  { name: "lewis", recruitPoints: 0, submissionPoints: 0 },
  { name: "vitali", recruitPoints: 0, submissionPoints: 0 },
  { name: "mavis", recruitPoints: 0, submissionPoints: 0 },
  { name: "harry", recruitPoints: 0, submissionPoints: 0 },
  { name: "chloe", recruitPoints: 0, submissionPoints: 0 },
  { name: "joe", recruitPoints: 0, submissionPoints: 0 },
];

function formatSubmissionDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ManagerAdminReviewPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [checkedAccess, setCheckedAccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const hasAccess = localStorage.getItem("manager_admin_access");

    if (hasAccess !== "true") {
      router.push("/manager/admin");
      return;
    }

    const savedSubs = localStorage.getItem("manager_upload_submissions");
    const savedPoints = localStorage.getItem("manager_points_v2");

    if (savedSubs) {
      setSubmissions(JSON.parse(savedSubs));
    }

    if (!savedPoints) {
      localStorage.setItem("manager_points_v2", JSON.stringify(defaultManagers));
    }

    setCheckedAccess(true);
  }, [router]);

  const persistSubs = (next: Submission[]) => {
    setSubmissions(next);
    localStorage.setItem("manager_upload_submissions", JSON.stringify(next));
  };

  const approveSubmission = (submissionId: string) => {
    const target = submissions.find((item) => item.id === submissionId);

    if (!target || target.status !== "pending") {
      return;
    }

    const savedPoints = localStorage.getItem("manager_points_v2");
    const managerPoints: ManagerRow[] = savedPoints
      ? JSON.parse(savedPoints)
      : defaultManagers;

    const nextPoints = defaultManagers.map((manager) => {
      const existing = managerPoints.find((item) => item.name === manager.name) || manager;

      if (manager.name === target.username) {
        return {
          ...existing,
          submissionPoints: existing.submissionPoints + target.points,
        };
      }

      return existing;
    });

    localStorage.setItem("manager_points_v2", JSON.stringify(nextPoints));

    const nextSubs = submissions.filter((item) => item.id !== submissionId);
    persistSubs(nextSubs);
  };

  const rejectSubmission = (submissionId: string) => {
    const nextSubs = submissions.filter((item) => item.id !== submissionId);
    persistSubs(nextSubs);
  };

  const pendingSubmissions = useMemo(() => {
    return submissions
      .filter((submission) => submission.status === "pending")
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [submissions]);

  if (!checkedAccess) return null;

  return (
    <section className="manager-wrapper">
      <div className="manager-hero">
        <div className="manager-pill">Admin Approval</div>
        <h1 className="manager-title">Review Submissions</h1>
        <p className="manager-subtitle">
          Approve submissions to award points. Rejected submissions add nothing.
        </p>

        <div style={{ marginTop: "16px" }}>
          <button
            type="button"
            className="manager-button-secondary"
            onClick={() => router.push("/manager/admin/points")}
          >
            Points
          </button>
        </div>
      </div>

      {pendingSubmissions.length === 0 ? (
        <div className="manager-card">
          <p className="manager-card-sub">No submissions yet.</p>
        </div>
      ) : (
        <div className="manager-form">
          {pendingSubmissions.map((submission) => (
            <div key={submission.id} className="manager-submission">
              <div className="manager-submission-head">
                <div>
                  <div className="manager-card-title">
                    {submission.username.toUpperCase()}
                  </div>
                  <div className="manager-small">
                    Submitted: {formatSubmissionDate(submission.createdAt)}
                  </div>
                  <div className="manager-small">
                    Images: {submission.imageCount} · Points: {submission.points}
                  </div>
                  <div className="manager-small">Status: pending</div>
                </div>

                <div className="manager-form" style={{ gap: 10 }}>
                  <button
                    type="button"
                    className="manager-button"
                    onClick={() => approveSubmission(submission.id)}
                  >
                    Approve (+{submission.points})
                  </button>
                  <button
                    type="button"
                    className="manager-button-secondary"
                    onClick={() => rejectSubmission(submission.id)}
                  >
                    Reject
                  </button>
                </div>
              </div>

              {submission.imageUrls.length > 0 ? (
                <div className="manager-submission-images">
                  {submission.imageUrls.map((imageUrl, index) => (
                    <div
                      key={`${submission.id}-${index}`}
                      className="manager-submission-image-card"
                    >
                      <img
                        src={imageUrl}
                        alt={
                          submission.imageNames[index] || `Submission ${index + 1}`
                        }
                        className="manager-submission-image"
                      />
                      <div className="manager-small">
                        {submission.imageNames[index] || `Image ${index + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}