import type { LucideIcon } from "lucide-react";

function MenuItem({
  icon: Icon,
  label,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      className={`w-full px-3 py-2 flex items-center gap-2 text-sm
        ${
          danger
            ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
        }
      `}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

export default MenuItem;
