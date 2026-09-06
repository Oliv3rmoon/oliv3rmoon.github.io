import type { Metadata } from '@/lib/site-metadata';
import Link from '@/components/site-link';
import { PageIntro } from '@/components/portfolio';
import { MotionStudy } from '@/components/motion-study';
export const metadata: Metadata = { title: 'The Lab — Andrew Sandoval' };
export default function Lab() {
  return (
    <>
      <PageIntro
        index="02 / The workshop"
        title={
          <>
            Between idea
            <br />
            <em>&amp; object.</em>
          </>
        }
      >
        <p>
          A place for mechanical curiosity, sci-fi influences, and the thoughts
          that have not settled into a finished shape.
        </p>
      </PageIntro>
      <section aria-labelledby="orbit-title">
        <div className="lab-heading">
          <h2 id="orbit-title">
            Orbit <em>/ Study 001</em>
          </h2>
          <span className="eyebrow">
            A digital object with physical presence
          </span>
        </div>
        <MotionStudy />
        <div className="lab-note">
          <p>
            A Blender-made visual study: a mechanical iris held within orbital
            rings. Turn it, pause it, and strip the surface away to see the
            structure.
          </p>
          <span>Concept sculpture · September 2026</span>
        </div>
      </section>
      <section className="case-section">
        <div>
          <span className="eyebrow">The idea behind the image</span>
          <h2>
            From structure
            <br />
            to surface.
          </h2>
        </div>
        <div className="prose">
          <p className="lead">
            A line becomes a form. A form suggests a mechanism. A mechanism
            invites a question.
          </p>
          <p>
            That transition gives the opening line of this portfolio a visual
            language. The object sits between a drawing, a machine, and
            something that might be looking back.
          </p>
          <p>
            This is a visual exploration created for the site, separate from my
            animatronic dinosaur R&amp;D.
          </p>
        </div>
      </section>
      <section className="case-section">
        <div>
          <span className="eyebrow">Open threads</span>
          <h2>
            Things I keep
            <br />
            coming back to.
          </h2>
        </div>
        <div>
          <div className="research-line">
            <span>I.</span>
            <div>
              <h3>Practical effects</h3>
              <p>
                The physical presence of Jurassic Park animatronics, and the
                engineering behind a convincing illusion.
              </p>
              <Link className="text-link" href="/work/dinosaur">
                Follow the dinosaur R&amp;D <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
          <div className="research-line">
            <span>II.</span>
            <div>
              <h3>Gadgets with a purpose</h3>
              <p>
                Useful tools, tactile controls, and devices that connect
                software to something you can hold, adjust, or repair. An area I
                want to explore further.
              </p>
            </div>
          </div>
          <div className="research-line">
            <span>III.</span>
            <div>
              <h3>The unfamiliar, made tangible</h3>
              <p>
                Sci-fi objects that make you wonder how they work. A source of
                questions about form, behavior, and interaction.
              </p>
            </div>
          </div>
        </div>
      </section>
      <Link href="/about" className="next-page">
        <span>Behind the curiosity</span>
        <strong>Meet Andrew ↗</strong>
      </Link>
    </>
  );
}
