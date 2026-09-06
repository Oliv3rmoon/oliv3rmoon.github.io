import type { Metadata } from '@/lib/site-metadata';
import Link from '@/components/site-link';
import { PageIntro } from '@/components/portfolio';
export const metadata: Metadata = {
  title: 'Animatronic Dinosaur · R&D — Andrew Sandoval',
};
export default function Dinosaur() {
  return (
    <>
      <PageIntro
        index="Research file / 002"
        title={
          <>
            Something
            <br />
            <em>prehistoric.</em>
          </>
        }
      >
        <p>
          I want to build a realistic, advanced animatronic dinosaur. The
          practical effects in Jurassic Park are the spark: something physical,
          with presence, weight, and movement.
        </p>
      </PageIntro>
      <dl className="case-meta">
        <div>
          <dt>Discipline</dt>
          <dd>Animatronics exploration</dd>
        </div>
        <div>
          <dt>Stage</dt>
          <dd>Early research &amp; development</dd>
        </div>
        <div>
          <dt>Current focus</dt>
          <dd>Brainstorming · 3D &amp; CAD planning</dd>
        </div>
      </dl>
      <section className="dinosaur-file">
        <div className="dinosaur-visual">
          <div className="dinosaur-mark" aria-hidden="true">
            D.
          </div>
          <span className="specimen-label">An idea becoming an animal.</span>
          <span className="visual-index">RESEARCH FILE / 002</span>
        </div>
        <div className="file-note">
          <span className="eyebrow">Present tense</span>
          <h2>
            Before it moves,
            <br />
            it has to <em>make sense.</em>
          </h2>
          <p>
            I’m mapping out the 3D model and CAD direction, brainstorming how
            the dinosaur could take shape and how its mechanisms might fit
            together.
          </p>
          <p>
            This is an early R&amp;D project. The design, mechanisms, and
            electronics are still being explored; this page will develop
            alongside the work.
          </p>
        </div>
      </section>
      <section className="case-section">
        <div>
          <span className="eyebrow">Questions guiding the research</span>
          <h2>
            What makes
            <br />a machine feel alive?
          </h2>
        </div>
        <div>
          <div className="research-line">
            <span>01</span>
            <div>
              <h3>Form &amp; structure</h3>
              <p>
                How can the exterior read as an animal while leaving room for a
                mechanical structure inside?
              </p>
            </div>
          </div>
          <div className="research-line">
            <span>02</span>
            <div>
              <h3>Motion &amp; expression</h3>
              <p>
                Which movements would do the most to create believable presence?
                What should be subtle, and what should be powerful?
              </p>
            </div>
          </div>
          <div className="research-line">
            <span>03</span>
            <div>
              <h3>Control &amp; coordination</h3>
              <p>
                How could individual mechanisms eventually become a coordinated
                sequence of movements?
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="case-section">
        <div>
          <span className="eyebrow">The next chapter</span>
          <h2>
            A research file
            <br />
            that will grow.
          </h2>
        </div>
        <div className="prose">
          <p>
            The next useful additions will be the actual model studies, CAD
            decisions, and mechanism experiments as they develop. For now, the
            project starts with the questions, the planning, and a fascination
            with practical effects.
          </p>
          <p>
            The mechanical sculpture elsewhere on this site is a separate
            Blender visual study. It represents the portfolio’s interest in
            digital and physical forms; it is not the dinosaur’s CAD model.
          </p>
        </div>
      </section>
      <Link href="/lab" className="next-page">
        <span>Continue exploring</span>
        <strong>Enter the Lab ↗</strong>
      </Link>
    </>
  );
}
