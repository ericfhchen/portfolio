import { WorkCarousel } from "@/components/WorkCarousel";
import { getBio, getWorkSlides } from "@/lib/content";
import { getSiteTitle } from "@/lib/site";

export default async function Home() {
  const [workSlides, bio] = await Promise.all([getWorkSlides(), getBio()]);
  const siteTitle = getSiteTitle();

  return <WorkCarousel slides={workSlides} name={siteTitle} about={bio} />;
}
