import type { Metadata } from '@/lib/site-metadata';
import Link from '@/components/site-link';
import { PageIntro } from '@/components/portfolio';
import { DinosaurSketch } from '@/components/dinosaur-sketch';
import { RaptorSim } from '@/components/raptor-sim';
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
      <section aria-labelledby="paddock-title" className="sim-section">
        <div className="lab-heading">
          <h2 id="paddock-title">
            Paddock 02 <em>/ Live simulation</em>
          </h2>
          <span className="eyebrow">Behaviour before hardware</span>
        </div>
        <RaptorSim />
        <div className="lab-note">
          <p>
            An original, procedurally built velociraptor living out a small park
            simulation. Nothing is keyframed: hunger, thirst, energy and comfort
            decide what it does next, its feet plant and step on their own, and
            its head follows whatever has its attention. Drop food in and it
            will come for it. Switch to X-ray to see the skeleton and the
            channels an animatronic version would need.
          </p>
          <span>Three.js · procedural model · October 2026</span>
        </div>
      </section>
      <section className="dinosaur-file">
        <figure className="dinosaur-figure">
          <div className="project-visual dinosaur-visual">
            <DinosaurSketch />
            <span className="specimen-label">An idea becoming an animal.</span>
            <span className="visual-index">RESEARCH FILE / 002</span>
          </div>
          <figcaption className="caption">
            An illustrative line study of the head and jaw pivot — a way of
            thinking out loud, not the project’s CAD model.
          </figcaption>
        </figure>
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
          <span className="eyebrow">What the simulation is testing</span>
          <h2>
            Alive is a
            <br />
            set of habits.
          </h2>
        </div>
        <div>
          <div className="research-line">
            <span>I.</span>
            <div>
              <h3>Weight &amp; footfall</h3>
              <p>
                Each foot plants and holds until the body has carried the hip
                too far past it, then steps. The weight reads in the hips,
                dipping and swaying over whichever foot is down.
              </p>
            </div>
          </div>
          <div className="research-line">
            <span>II.</span>
            <div>
              <h3>Attention</h3>
              <p>
                The head moves first and fastest; the neck and body follow.
                Where it looks tells you what it is thinking about, including,
                now and then, you.
              </p>
            </div>
          </div>
          <div className="research-line">
            <span>III.</span>
            <div>
              <h3>Never quite still</h3>
              <p>
                Breathing, blinks, a tail that keeps adjusting. An idle animal
                is still moving, and those small motions do most of the work of
                selling it.
              </p>
            </div>
          </div>
          <div className="research-line">
            <span>IV.</span>
            <div>
              <h3>Wants &amp; needs</h3>
              <p>
                Needs choose the next behaviour, so it never runs the same loop
                twice. In X-ray, every motion maps to a channel: a first pass at
                what a controller would have to drive.
              </p>
            </div>
          </div>
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
            The simulation above is a sandbox for motion, not the animatronic’s
            CAD model: a way to rehearse how the animal should behave before
            deciding how a machine could do it.
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
