import Link from "next/link";

type HeaderProps = {
  title: string;
};

export function Header({ title }: HeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <Link href="/" className="font-semibold tracking-tight">
        {title}
      </Link>
      <nav className="flex items-center gap-4 uppercase tracking-wide">
        <Link href="/" className="transition hover:opacity-70">
          Home
        </Link>
        <Link href="/about" className="transition hover:opacity-70">
          About
        </Link>
      </nav>
    </header>
  );
}

