import Image from '@/components/site-image';
import Link from '@/components/site-link';
export function Header() {
  return (
    <header className="masthead" id="top">
      <Link className="wordmark" href="/" aria-label="Andrew Sandoval, home">
        a.s.
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/work">Work</Link>
        <Link href="/lab">Lab</Link>
        <Link href="/about">About</Link>
        <Link href="/about#contact">Contact ↗</Link>
      </nav>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <span>© 2026 Andrew Sandoval</span>
      <Link className="secret-passage" href="/lab" aria-label="Enter the Lab">
        There is more beneath the surface. <span aria-hidden="true">◎</span>
      </Link>
      <a href="#top">Back to top ↑</a>
    </footer>
  );
}
export function Contact() {
  return (
    <section className="contact section" id="contact">
      <span className="eyebrow">Get in touch</span>
      <h2>
        Let’s build
        <br />
        <em>something useful.</em>
      </h2>
      <div className="contact-bottom">
        <p>
          Open to internships, hands-on technical opportunities,
          <br className="desktop-break" /> and conversations with people who
          build.
        </p>
        <div className="socials">
          <a
            href="https://www.linkedin.com/in/andrew-s-36728626a/"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn <span aria-hidden="true">↗</span>
          </a>
          <a
            href="https://github.com/Oliv3rmoon"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
export function ProjectList() {
  return (
    <div className="project-list">
      <Link href="/work/dpoc" className="project-card">
        <div className="project-visual product-visual">
          <Image
            unoptimized
            src="/images/dpoc-marketplace.png"
            width="1280"
            height="720"
            alt="DPOC marketplace homepage showing the estimate and booking experience"
            loading="lazy"
          />
        </div>
        <div className="project-card-copy">
          <div className="project-line">
            <span className="eyebrow">I / Software meets service</span>
            <span className="status">Live website</span>
          </div>
          <h3>
            DPOC <span aria-hidden="true">↗</span>
          </h3>
          <p>
            A marketplace and website for Dulai Property &amp; Outdoor Care.
            Connecting a real-world job with a clearer way to price it and book
            it.
          </p>
          <span className="card-link">Explore the project</span>
        </div>
      </Link>
      <Link href="/work/dinosaur" className="project-card">
        <div className="project-visual dinosaur-visual">
          <div className="dinosaur-mark" aria-hidden="true">
            D.
          </div>
          <span className="specimen-label">An idea becoming an animal.</span>
          <span className="visual-index">RESEARCH FILE / 002</span>
        </div>
        <div className="project-card-copy">
          <div className="project-line">
            <span className="eyebrow">II / Animatronics</span>
            <span className="status">Early R&amp;D</span>
          </div>
          <h3>
            Something prehistoric <span aria-hidden="true">↗</span>
          </h3>
          <p>
            An animatronic dinosaur, inspired by the practical effects of
            Jurassic Park. Currently brainstorming and mapping the 3D model and
            CAD direction.
          </p>
          <span className="card-link">Open the research file</span>
        </div>
      </Link>
    </div>
  );
}
export function PageIntro({
  index,
  title,
  children,
}: {
  index: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="page-intro">
      <span className="eyebrow">{index}</span>
      <h1 className="page-title">{title}</h1>
      <div className="page-intro-copy">{children}</div>
    </section>
  );
}
