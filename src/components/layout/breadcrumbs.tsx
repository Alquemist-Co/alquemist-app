"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getModuleByHref } from "@/lib/nav/navigation";

export function Breadcrumbs() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  // Build crumbs from path segments
  const crumbs: { label: string; href: string }[] = [
    { label: "Inicio", href: "/" },
  ];

  if (segments.length > 0) {
    const moduleHref = `/${segments[0]}`;
    const mod = getModuleByHref(moduleHref);
    if (mod) {
      crumbs.push({ label: mod.label, href: mod.href });
    }
  }

  // For future: deeper segments like /batches/LOT-001
  for (let i = 1; i < segments.length; i++) {
    const href = `/${segments.slice(0, i + 1).join("/")}`;
    crumbs.push({ label: segments[i], href });
  }

  return (
    <ol className="flex items-center gap-1 text-sm">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <li key={crumb.href} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="size-3.5 text-text-secondary" />
            )}
            {isLast ? (
              <span className="font-medium text-text-primary">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-text-secondary hover:text-text-primary transition-colors duration-150"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}
