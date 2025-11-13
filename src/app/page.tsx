import { WorkCarousel } from "@/components/WorkCarousel";
import { getBio, getWorkSlides } from "@/lib/content";
import { getBlogOrigin, getSiteTitle } from "@/lib/site";

export default async function Home() {
  const [workSlides, bio] = await Promise.all([getWorkSlides(), getBio()]);
  const siteTitle = getSiteTitle();
  const blogUrl = getBlogOrigin();

  return <WorkCarousel slides={workSlides} name={siteTitle} about={bio} blogUrl={blogUrl} />;
}
