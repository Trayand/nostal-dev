// Small inline icon set (no icon library dependency). Paths are 24x24 strokes.
const paths = {
  today: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  practice: "M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16",
  cards: "M4 7h12v13H4zM8 4h12v13",
  progress: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  settings:
    "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-2.7-1.1l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 003 15.4 1.6 1.6 0 001.6 14H1.5a2 2 0 110-4h.1A1.6 1.6 0 003 8.6a1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H7.4A1.6 1.6 0 009 2.8V2.5a2 2 0 114 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8v.1A1.6 1.6 0 0021.2 10h.3a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z",
  close: "M6 6l12 12M18 6L6 18",
  check: "M5 12l5 5 9-10",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M18 13l-6 6-6-6",
  download: "M12 3v12M7 10l5 5 5-5M4 21h16",
  flame: "M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-5 5-4 9-2-1-3-3-3-3-2 3-2 4-2 6 0 4 3 7 7 7z",
  laptop: "M4 5h16v11H4zM2 19h20",
  back: "M15 18l-6-6 6-6",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = "h-6 w-6" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
