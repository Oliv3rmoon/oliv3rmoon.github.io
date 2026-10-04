import Image from '@/components/site-image';
import Link from '@/components/site-link';
import { MotionStudy } from '@/components/motion-study';
import { Serpent } from '@/components/serpent';
import { ProjectList, Contact } from '@/components/portfolio';
export default function Home() {
  return (
    <>
      <section className="hero" aria-labelledby="name">
        <MotionStudy ambient />
        <div className="eyebrow hero-meta">
          <span>Electrical engineering student</span>
          <span>Los Angeles, California</span>
        </div>
        <h1 id="name">
          Andrew
          <br />
          <span>
            Sandoval<span className="period">.</span>
          </span>
        </h1>
        <div className="hero-bottom">
          <p>
            Exploring the space between
            <br />
            software &amp; the physical world.
          </p>
          <Link className="text-link" href="/work">
            View selected work <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="hero-footnote eyebrow">
          <span>From a line of code to a moving object.</span>
          <span>Study 001 / Orbit</span>
        </div>
      </section>
      <section className="work section" id="work">
        <div className="section-heading">
          <span className="eyebrow">01 / Selected work</span>
          <h2>
            Ideas with <em>consequences.</em>
          </h2>
        </div>
        <ProjectList />
      </section>
      <section className="code-motion section" aria-labelledby="code-motion-title">
        <div className="code-motion-copy">
          <span className="eyebrow">02 / Code in motion</span>
          <h2 id="code-motion-title">
            A creature
            <br />
            <em>written in code.</em>
          </h2>
          <p>
            Fifty-eight vertebrae, four limbs, and a few lines of math. Every
            joint is solved in real time. Move your cursor, or touch, and it
            follows.
          </p>
          <Link className="text-link" href="/lab#code-studies">
            More code studies <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <Serpent />
      </section>
      <section className="passage section">
        <div>
          <span className="eyebrow">03 / The workshop</span>
          <h2>
            Some things begin
            <br />
            as a <em>strange question.</em>
          </h2>
          <p>
            Mechanical eyes. Unfamiliar objects. The small decisions that make a
            machine feel alive. A place for the ideas still taking shape.
          </p>
          <Link className="text-link" href="/lab">
            Enter the Lab <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <Link
          href="/lab"
          className="passage-image"
          aria-label="Explore the interactive Orbit sculpture in the Lab"
        >
          <Image
            unoptimized
            src="/images/iris-detail.webp"
            width="1400"
            height="1100"
            alt="Close view of the silver mechanical iris in the Orbit sculpture"
            loading="lazy"
          />
          <span className="image-caption">Look a little closer. ↗</span>
        </Link>
      </section>
      <section className="home-about section" id="about">
        <span className="eyebrow">04 / Behind the work</span>
        <p>
          I’m Andrew. An electrical engineering student drawn to practical
          effects, useful tools, and ideas that refuse to stay on a screen.
        </p>
        <Link className="text-link" href="/about">
          The longer story <span aria-hidden="true">↗</span>
        </Link>
      </section>
      <Contact />
    </>
  );
}
