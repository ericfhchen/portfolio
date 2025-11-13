type BioProps = {
  html: string;
};

export function Bio({ html }: BioProps) {
  return (
    <section aria-labelledby="bio-heading" className="prose max-w-3xl text-balance">
      <h2 id="bio-heading" className="sr-only">
        Bio
      </h2>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}

