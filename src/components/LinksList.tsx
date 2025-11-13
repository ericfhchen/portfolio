type LinksListProps = {
  html: string;
  title?: string;
};

export function LinksList({ html, title = "Links" }: LinksListProps) {
  if (!html) return null;

  return (
    <section aria-labelledby="links-heading" className="prose max-w-xl">
      <h2 id="links-heading" className="font-medium uppercase tracking-widest">
        {title}
      </h2>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}

