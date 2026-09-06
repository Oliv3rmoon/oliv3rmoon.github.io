import type { Metadata } from '@/lib/site-metadata';
import Link from '@/components/site-link';
import { PageIntro, ProjectList } from '@/components/portfolio';
export const metadata: Metadata = { title: 'Selected Work — Andrew Sandoval' };
export default function Work() {
  return (
    <>
      <PageIntro
        index="01 / Selected work"
        title={
          <>
            An idea.
            <br />
            Then <em>something real.</em>
          </>
        }
      >
        <p>
          Software for a business I run. Research toward an animatronic
          dinosaur. Different problems, the same curiosity about how things
          work.
        </p>
      </PageIntro>
      <section className="section">
        <ProjectList />
      </section>
      <Link className="next-page" href="/lab">
        <span>For the ideas still taking shape</span>
        <strong>Inside the Lab ↗</strong>
      </Link>
    </>
  );
}
