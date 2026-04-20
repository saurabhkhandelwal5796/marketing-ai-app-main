"use client";

import { useState } from "react";

const COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-teal-500",
  "bg-orange-400",
  "bg-emerald-500",
  "bg-amber-500",
];

function getInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function getColorFromName(name) {
  if (!name) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
}

const SIZE_CLASSES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
  xl: "h-12 w-12 text-base",
};

export default function Avatar({ name, size = "md", imageUrl, className = "" }) {
  const [imageError, setImageError] = useState(false);
  
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);
  
  const showImage = imageUrl && !imageError;
  
  if (showImage) {
    return (
      <img
        src={imageUrl}
        alt={name || "Avatar"}
        className={`rounded-full object-cover ${sizeClass} ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }
  
  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white ${bgColor} ${sizeClass} ${className}`}
      title={name || ""}
    >
      {initials}
    </div>
  );
}
