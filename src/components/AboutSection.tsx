type AboutSectionProps = {
  title: string;
  html: string;
};

export function AboutSection({ title, html }: AboutSectionProps) {
  if (!html) return null;

  return (
    <section className="prose">
      <h2 className="font-medium uppercase tracking-widest">{title}</h2>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}

