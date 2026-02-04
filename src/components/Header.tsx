import Link from "next/link";

type HeaderLink = {
  label: string;
  href: string;
};

type HeaderProps = {
  title: string;
  titleHref?: string;
  links?: HeaderLink[];
  activeHref?: string;
};

const DEFAULT_LINKS: HeaderLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
];

function isExternalLink(href: string) {
  return /^https?:\/\//i.test(href);
}

export function Header({ title, titleHref = "/", links = DEFAULT_LINKS, activeHref }: HeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <Link href={titleHref} className="font-semibold tracking-tight">
        {title}
      </Link>
      <nav className="flex items-center gap-4 uppercase tracking-wide">
        {links.map((link) => {
          const isActive = Boolean(activeHref && activeHref === link.href);
          const className = `transition hover:opacity-70 ${isActive ? "opacity-40" : ""}`;
          const ariaCurrent = isActive ? "page" : undefined;

          if (isExternalLink(link.href)) {
            return (
              <a
                key={link.href}
                href={link.href}
                className={className}
                aria-current={ariaCurrent}
              >
                {link.label}
              </a>
            );
          }

          return (
            <Link key={link.href} href={link.href} className={className} aria-current={ariaCurrent}>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

