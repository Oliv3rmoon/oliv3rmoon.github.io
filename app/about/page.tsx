import Image from '@/components/site-image';
import type { Metadata } from '@/lib/site-metadata';
import { PageIntro, Contact } from '@/components/portfolio';
export const metadata: Metadata = { title: 'About — Andrew Sandoval' };
export default function About() {
  return (
    <>
      <PageIntro
        index="03 / Behind the work"
        title={
          <>
            Curiosity,
            <br />
            <em>put to work.</em>
          </>
        }
      >
        <p>
          I like understanding what is happening beneath the surface — and
          figuring out what I could make with it.
        </p>
      </PageIntro>
      <section className="about-full">
        <figure className="about-portrait">
          <Image
            unoptimized
            src="/images/andrew-editorial-portrait.png"
            width="1518"
            height="1036"
            alt="AI-styled editorial portrait of Andrew Sandoval against a blue sky and Gothic architecture"
          />
          <figcaption className="caption">
            An imagined setting. A personal point of view.
          </figcaption>
        </figure>
        <div className="about-copy">
          <p className="lead">
            I’m studying electrical engineering at Los Angeles Pierce College,
            with an interest in robotics, embedded systems, and how things work.
          </p>
          <p>
            My experience starts with practical problems: assembling and
            repairing PCs, troubleshooting operating systems and networks,
            configuring Raspberry Pi and smart devices, and building software.
          </p>
          <p>
            I also run Dulai Property &amp; Outdoor Care. Working with clients
            has taught me to ask better questions, explain tradeoffs clearly,
            and follow through from an idea to a working solution.
          </p>
          <p>
            Outside that work, I’m drawn to the animatronics of Jurassic Park,
            practical effects, sci-fi, and unusual gadgets. My dinosaur project
            is where that curiosity is beginning to meet 3D modeling and CAD
            planning.
          </p>
        </div>
      </section>
      <section className="case-section">
        <div>
          <span className="eyebrow">A changing direction</span>
          <h2>
            Following
            <br />
            the questions.
          </h2>
        </div>
        <div className="prose">
          <p>
            I began at Pierce College in 2024 with an interest in medicine. In
            Spring 2026, I changed my direction to electrical engineering. I’m
            building the academic foundation for the kinds of systems I want to
            understand and create.
          </p>
          <dl className="timeline">
            <div>
              <dt>2024</dt>
              <dd>Started at Los Angeles Pierce College.</dd>
            </div>
            <div>
              <dt>Spring 2026</dt>
              <dd>Changed direction to electrical engineering.</dd>
            </div>
            <div>
              <dt>Fall 2026</dt>
              <dd>
                Mathematics, introductory engineering, and C++ programming.
              </dd>
            </div>
            <div>
              <dt>Looking ahead</dt>
              <dd>
                Preparing for a planned Fall 2028 transfer, with Stanford as an
                aspiration.
              </dd>
            </div>
          </dl>
        </div>
      </section>
      <Contact />
    </>
  );
}
