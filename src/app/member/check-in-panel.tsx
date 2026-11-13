"use client";

import { useState } from "react";
import { Button, Field } from "@/components/ui";
import { QrScanner } from "@/components/qr-scanner";
import { checkInAction } from "./actions";

export function CheckInPanel() {
  const [token, setToken] = useState("");
  return (
    <div className="grid max-w-lg gap-5">
      <QrScanner onScan={setToken} />
      <form action={checkInAction} className="grid gap-3">
        <Field label="Gym QR code" name="token" value={token} onChange={(event) => setToken(event.target.value)} required maxLength={100} autoComplete="off" />
        <Button type="submit" disabled={!token.trim()}>Check in</Button>
      </form>
    </div>
  );
}