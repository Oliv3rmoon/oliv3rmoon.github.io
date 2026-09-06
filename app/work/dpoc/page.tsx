import Image from '@/components/site-image';
import type { Metadata } from '@/lib/site-metadata';
import Link from '@/components/site-link';
import { PageIntro } from '@/components/portfolio';
export const metadata: Metadata = { title: 'DPOC — Andrew Sandoval' };
export default function Dpoc() {
  return (
    <>
      <PageIntro
        index="Selected work / 001"
        title={
          <>
            Real jobs.
            <br />
            <em>A clearer way in.</em>
          </>
        }
      >
        <p>
          DPOC is the marketplace and website for Dulai Property &amp; Outdoor
          Care. A bridge between someone’s property needs and the practical work
          of getting a job done.
        </p>
        <a
          href="https://thedpoc.com"
          className="text-link"
          target="_blank"
          rel="noreferrer"
        >
          Visit thedpoc.com <span aria-hidden="true">↗</span>
        </a>
      </PageIntro>
      <dl className="case-meta">
        <div>
          <dt>Context</dt>
          <dd>Dulai Property &amp; Outdoor Care</dd>
        </div>
        <div>
          <dt>My connection</dt>
          <dd>Founder &amp; operator</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>Live marketplace &amp; website</dd>
        </div>
      </dl>
      <figure className="case-image">
        <Image
          unoptimized
          src="/images/dpoc-marketplace.png"
          width="1280"
          height="720"
          alt="DPOC homepage: describe a job, see an estimate, and continue to booking"
        />
        <figcaption className="caption">
          The live DPOC website — September 2026.
        </figcaption>
      </figure>
      <section className="case-section">
        <div>
          <span className="eyebrow">The problem</span>
          <h2>
            The work starts
            <br />
            before the work.
          </h2>
        </div>
        <div className="prose">
          <p className="lead">
            A customer has a job in mind. Turning it into a clear request is its
            own problem.
          </p>
          <p>
            What service is needed? What might it cost? What happens next?
            Running a property and outdoor care business puts those questions in
            front of me directly. The website brings that practical context into
            a digital experience.
          </p>
        </div>
      </section>
      <section className="case-section">
        <div>
          <span className="eyebrow">The experience</span>
          <h2>
            From a need
            <br />
            to a next step.
          </h2>
        </div>
        <div>
          <div className="steps">
            <div>
              <span className="eyebrow">01</span>
              <h3>Describe.</h3>
              <p>Start with the service and the details of the job.</p>
            </div>
            <div>
              <span className="eyebrow">02</span>
              <h3>Estimate.</h3>
              <p>See a model-based price estimate before moving forward.</p>
            </div>
            <div>
              <span className="eyebrow">03</span>
              <h3>Coordinate.</h3>
              <p>
                Continue to booking, then confirm the provider, scope, and
                written price.
              </p>
            </div>
          </div>
          <p className="caption">
            Estimates guide the conversation. Final scope, price, credentials,
            and availability are confirmed through DPOC.
          </p>
        </div>
      </section>
      <section className="case-section">
        <div>
          <span className="eyebrow">Why it belongs here</span>
          <h2>
            Software with
            <br />a physical outcome.
          </h2>
        </div>
        <div className="prose">
          <p>
            The screen is one part of the system. The rest is a customer, a
            place, a provider, and the work itself. This is what interests me
            about building practical tools: how well an interface carries an
            intention into the real world.
          </p>
          <p>
            DPOC sits alongside my engineering studies as a place to keep
            learning about customer needs, coordination, and follow-through.
          </p>
          <a
            href="https://thedpoc.com"
            className="text-link"
            target="_blank"
            rel="noreferrer"
          >
            Explore the marketplace <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
      <Link href="/work/dinosaur" className="next-page">
        <span>Next / Animatronics R&amp;D</span>
        <strong>Something prehistoric ↗</strong>
      </Link>
    </>
  );
}
