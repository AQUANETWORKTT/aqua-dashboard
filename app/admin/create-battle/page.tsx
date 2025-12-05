"use client";

import { useState } from "react";

export default function CreateBattlePage() {
  const [leftName, setLeftName] = useState("");
  const [leftHandle, setLeftHandle] = useState("");
  const [rightName, setRightName] = useState("");
  const [rightHandle, setRightHandle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [leftImage, setLeftImage] = useState<File | null>(null);
  const [rightImage, setRightImage] = useState<File | null>(null);

  async function submitBattle() {
    const form = new FormData();
    form.append("leftName", leftName);
    form.append("leftHandle", leftHandle);
    form.append("rightName", rightName);
    form.append("rightHandle", rightHandle);
    form.append("date", date);
    form.append("time", time);
    if (leftImage) form.append("leftImage", leftImage);
    if (rightImage) form.append("rightImage", rightImage);

    await fetch("/api/create-battle", {
      method: "POST",
      body: form,
    });

    alert("Created battle!");
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl mb-4">Create Battle</h1>

      <input placeholder="Left Name" onChange={(e)=>setLeftName(e.target.value)} />
      <input placeholder="Left Handle" onChange={(e)=>setLeftHandle(e.target.value)} />

      <input placeholder="Right Name" onChange={(e)=>setRightName(e.target.value)} />
      <input placeholder="Right Handle" onChange={(e)=>setRightHandle(e.target.value)} />

      <input placeholder="Date" onChange={(e)=>setDate(e.target.value)} />
      <input placeholder="Time" onChange={(e)=>setTime(e.target.value)} />

      <label>Left Image</label>
      <input type="file" onChange={(e)=>setLeftImage(e.target.files?.[0] || null)} />

      <label>Right Image</label>
      <input type="file" onChange={(e)=>setRightImage(e.target.files?.[0] || null)} />

      <button onClick={submitBattle} className="mt-4 p-2 bg-cyan-500">Create</button>
    </div>
  );
}
