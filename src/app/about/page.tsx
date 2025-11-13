import { AboutSection } from "@/components/AboutSection";
import { getBio } from "@/lib/content";

export const revalidate = 300;

export default async function AboutPage() {
  const { socialsHtml, collaboratorsHtml } = await getBio();

  return (
    <div className="flex flex-col gap-10">
      <AboutSection title="Socials" html={socialsHtml} />
      <AboutSection title="Collaborators" html={collaboratorsHtml} />
    </div>
  );
}

