import type { Metadata } from '@/lib/site-metadata';
import Link from '@/components/site-link';
import { PageIntro } from '@/components/portfolio';
import { PlanSheet, type SheetKind } from '@/components/plan-sheet';
export const metadata: Metadata = {
  title: 'Drafting & Design — Andrew Sandoval',
};
const sheets: { kind: SheetKind; index: string; title: string; text: string }[] =
  [
    {
      kind: 'plan',
      index: 'Sheet 01 / ADUs',
      title: 'Accessory dwelling units',
      text: 'Compact plans where every wall, door swing, and fixture has to earn its place.',
    },
    {
      kind: 'elevation',
      index: 'Sheet 02 / Houses',
      title: 'Houses',
      text: 'Residential layouts and elevations, from the first footprint to how the building meets the street.',
    },
    {
      kind: 'section',
      index: 'Sheet 03 / Details',
      title: 'Sections & details',
      text: 'The drawings that explain how it actually goes together: walls, foundations, and roofs in section.',
    },
  ];
export default function Drafting() {
  return (
    <>
      <PageIntro
        index="Selected work / 003"
        title={
          <>
            Lines that
            <br />
            <em>become rooms.</em>
          </>
        }
      >
        <p>
          Residential design in Revit and AutoCAD: accessory dwelling units,
          houses, and the drawing sets that describe them. Where an idea has to
          fit real dimensions and a real site.
        </p>
      </PageIntro>
      <dl className="case-meta">
        <div>
          <dt>Tools</dt>
          <dd>Autodesk Revit · AutoCAD</dd>
        </div>
        <div>
          <dt>Work</dt>
          <dd>ADUs · Houses · Construction details</dd>
        </div>
        <div>
          <dt>Drawings</dt>
          <dd>Plans · Elevations · Sections</dd>
        </div>
      </dl>
      <section className="sheet-grid" aria-label="Drawing sheets">
        {sheets.map((sheet) => (
          <figure className="sheet-card" key={sheet.kind}>
            <div className="sheet-visual">
              <PlanSheet kind={sheet.kind} />
            </div>
            <figcaption>
              <span className="eyebrow">{sheet.index}</span>
              <h2>{sheet.title}</h2>
              <p>{sheet.text}</p>
            </figcaption>
          </figure>
        ))}
      </section>
      <p className="caption sheet-note">
        Sheets shown here are stylized illustrations of each category. The
        original Revit and AutoCAD drawings are being prepared for the web and
        will replace them.
      </p>
      <section className="case-section">
        <div>
          <span className="eyebrow">The process</span>
          <h2>
            From a footprint
            <br />
            to a drawing set.
          </h2>
        </div>
        <div>
          <div className="steps">
            <div>
              <span className="eyebrow">01</span>
              <h3>Lay out.</h3>
              <p>Start with the site, the footprint, and how people move through the space.</p>
            </div>
            <div>
              <span className="eyebrow">02</span>
              <h3>Model.</h3>
              <p>Build it in Revit so plans, elevations, and sections stay in agreement.</p>
            </div>
            <div>
              <span className="eyebrow">03</span>
              <h3>Detail.</h3>
              <p>Work out the connections in AutoCAD, where the drawing meets construction.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="case-section">
        <div>
          <span className="eyebrow">Why it belongs here</span>
          <h2>
            The same question,
            <br />
            at building scale.
          </h2>
        </div>
        <div className="prose">
          <p className="lead">
            How does an idea survive contact with the physical world?
          </p>
          <p>
            Drafting is the discipline of answering that before anything is
            built. A drawing set is a set of decisions — the same habit of mind
            behind the circuits, the code, and the dinosaur.
          </p>
        </div>
      </section>
      <Link href="/lab" className="next-page">
        <span>Next / Code in motion</span>
        <strong>Inside the Lab ↗</strong>
      </Link>
    </>
  );
}
