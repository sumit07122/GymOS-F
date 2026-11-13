"use client";

import { Button } from "./ui";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return <Button type="button" variant="ghost" onClick={() => window.print()}>{label}</Button>;
}