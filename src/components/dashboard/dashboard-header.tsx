"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type DashboardHeaderProps = {
  firstName: string;
  facilityName: string | null;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function formatDate(): string {
  const str = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function DashboardHeader({ firstName, facilityName }: DashboardHeaderProps) {
  const [greeting] = useState(() => getGreeting());
  const [date] = useState(() => formatDate());

  return (
    <header className="mb-5">
      <h1 className="text-[28px] font-extrabold leading-tight text-text-primary">
        {greeting}, {firstName}
      </h1>
      <p className="mt-1 text-sm text-text-secondary">{date}</p>
      <div className="mt-2">
        {facilityName ? (
          <Badge variant="filled">{facilityName}</Badge>
        ) : (
          <Badge variant="warning">Sin facility asignada</Badge>
        )}
      </div>
    </header>
  );
}
