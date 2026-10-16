"use client";

import Link from "next/link";
import { ChevronLeft } from "@/components/icons";

interface FavoritesBackLinkProps {
  href: string;
  label: string;
}

export function FavoritesBackLink({ href, label }: FavoritesBackLinkProps) {
  return (
    <Link
      href={href}
      className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-taupe transition-colors duration-150 hover:text-off-black active:scale-[0.98]"
    >
      <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
      {label}
    </Link>
  );
}
