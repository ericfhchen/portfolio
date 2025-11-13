type FooterProps = {
  domain: string;
};

export function Footer({ domain }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 pt-6">
      <p>
        © {year} {domain}. All rights reserved.
      </p>
    </footer>
  );
}

