import Link from "next/link";

interface ModeSelectButtonProps {
  href: string;
  emoji: string;
  label: string;
  colorScheme: "blue" | "green";
}

const colorMap = {
  blue: "bg-blue-500 hover:bg-blue-600 shadow-blue-200",
  green: "bg-green-500 hover:bg-green-600 shadow-green-200",
};

export function ModeSelectButton({
  href,
  emoji,
  label,
  colorScheme,
}: ModeSelectButtonProps) {
  return (
    <Link
      href={href}
      className={`
        flex flex-col items-center justify-center gap-3
        w-full py-8 sm:py-0 sm:aspect-square sm:w-52
        rounded-2xl text-white font-bold
        shadow-lg hover:shadow-xl
        transition-all duration-200 hover:scale-105
        ${colorMap[colorScheme]}
      `}
    >
      <span className="text-5xl">{emoji}</span>
      <span className="text-lg leading-snug text-center whitespace-pre-line">
        {label}
      </span>
    </Link>
  );
}
