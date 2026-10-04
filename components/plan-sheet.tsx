// Stylized drawing sheets for the drafting section. They stand in for the
// original Revit and AutoCAD exports until those are added to public/images.
export type SheetKind = 'plan' | 'elevation' | 'section';

const titles: Record<SheetKind, [string, string, string]> = {
  plan: ['A-101', 'ADU — Floor plan', 'Revit'],
  elevation: ['A-201', 'House — Front elevation', 'Revit'],
  section: ['A-501', 'Wall section — Detail', 'AutoCAD'],
};

function Plan() {
  return (
    <>
      <g className="sheet-heavy">
        <path className="draw" pathLength={1} d="M60 52H130M160 52H420V250H330M300 250H130M100 250H60V52" />
        <path className="draw" pathLength={1} d="M66 58H130M160 58H414V244H330M300 244H130M100 244H66V58" />
        <path className="draw" pathLength={1} d="M250 58V138M250 172V244M250 132H286M312 132H340M340 58V132" />
      </g>
      <g className="sheet-thin">
        <path d="M130 52V58M160 52V58M135 55H155M300 244V250M330 244V250M305 247H325" />
        <path d="M414 150H420M414 210H420M417 155V205" />
        <path d="M100 250V280M100 250A30 30 0 0 0 130 220" strokeDasharray="2 3" />
        <path d="M250 172H284M250 172A34 34 0 0 1 284 138" strokeDasharray="2 3" />
        <path d="M286 132V104M286 132A26 26 0 0 1 312 106" strokeDasharray="2 3" />
        <path d="M72 64H200V84H92V160H72Z" />
        <circle cx="140" cy="74" r="6" />
        <path d="M346 64H408V112H346ZM346 64L408 112M408 64L346 112" />
        <ellipse cx="268" cy="80" rx="9" ry="13" />
        <path d="M258 64H278V70H258Z" />
        <path d="M312 160H408V238H312ZM312 176H408M322 164H352V174H322ZM368 164H398V174H368Z" />
        <path d="M120 150H210V210H120ZM132 140V150M198 140V150M132 210V220M198 210V220" />
      </g>
      <g className="sheet-dim">
        <path d="M60 34H420M60 28V40M250 28V40M420 28V40M440 52V250M434 52H446M434 250H446" />
        <text x="146" y="28">14&apos;-0&quot;</text>
        <text x="324" y="28">10&apos;-0&quot;</text>
        <text x="452" y="156" transform="rotate(90 452 156)">12&apos;-0&quot;</text>
      </g>
      <g className="sheet-labels">
        <text x="150" y="232">Living</text>
        <text x="96" y="108">Kitchen</text>
        <text x="276" y="120">Bath</text>
        <text x="350" y="232">Bedroom</text>
      </g>
    </>
  );
}

function Elevation() {
  return (
    <>
      <g className="sheet-heavy">
        <path className="draw" pathLength={1} d="M28 250H452" />
        <path className="draw" pathLength={1} d="M92 250V142M328 250V142M70 148L210 72L350 148" />
        <path className="draw" pathLength={1} d="M328 172H422V250M318 178L372 152L432 178" />
        <path className="draw" pathLength={1} d="M268 104V84H288V114" />
      </g>
      <g className="sheet-thin">
        <path d="M114 170H166V216H114ZM140 170V216M114 193H166" />
        <path d="M254 170H306V216H254ZM280 170V216M254 193H306" />
        <path d="M194 180H226V250H194Z" />
        <circle cx="220" cy="216" r="2" />
        <circle cx="210" cy="114" r="10" />
        <path d="M200 114H220M210 104V124" />
        <path d="M344 196H406V250H344ZM344 210H406M344 224H406M344 238H406" />
        <path d="M188 180L210 168L232 180" />
      </g>
      <g className="sheet-faint">
        <path d="M92 156H328M92 230H194M226 230H328" strokeDasharray="1 5" />
        <path d="M34 256L44 266M54 256L64 266M74 256L84 266M94 256L104 266M114 256L124 266M134 256L144 266M154 256L164 266M174 256L184 266M194 256L204 266M214 256L224 266M234 256L244 266M254 256L264 266M274 256L284 266M294 256L304 266M314 256L324 266M334 256L344 266M354 256L364 266M374 256L384 266M394 256L404 266M414 256L424 266M434 256L444 266" />
      </g>
      <g className="sheet-dim">
        <path d="M24 72H60M24 142H60M24 250H40" strokeDasharray="3 3" />
        <path d="M30 66L36 72L42 66M30 136L36 142L42 136M30 244L36 250L42 244" />
        <text x="46" y="66">Ridge</text>
        <text x="46" y="136">Plate</text>
      </g>
    </>
  );
}

function Section() {
  const zigzag = Array.from({ length: 14 }, (_, i) => `L${i % 2 ? 189 : 211} ${86 + i * 8}`).join('');
  return (
    <>
      <g className="sheet-heavy">
        <path className="draw" pathLength={1} d="M150 252H262V286H150ZM180 252V204H222V236" />
        <path className="draw" pathLength={1} d="M222 236H410V252H222" />
        <path className="draw" pathLength={1} d="M184 204V82M216 204V82M180 82H220V66H180Z" />
        <path className="draw" pathLength={1} d="M130 98L420 14M138 110L428 26" />
      </g>
      <g className="sheet-thin">
        <path d={`M200 86${zigzag}`} />
        <path d="M180 74H220M216 66H420" />
        <path d="M178 82V204" strokeDasharray="4 3" />
      </g>
      <g className="sheet-faint">
        <path d="M152 284L166 254M168 284L182 254M184 284L198 254M200 284L214 254M216 284L230 254M232 284L246 254M248 284L260 260" />
        <path d="M232 244h2M260 240h2M290 246h2M320 242h2M350 246h2M380 241h2M246 248h2M306 238h2M366 247h2" />
      </g>
      <g className="sheet-labels callouts">
        <path d="M128 98L92 120H40M200 130L250 140H330M262 270L300 288H360M330 244L360 216H420M200 70L160 40H60" />
        <text x="40" y="114">Rafter</text>
        <text x="256" y="134">Insulation</text>
        <text x="304" y="282">Footing</text>
        <text x="364" y="210">Slab</text>
        <text x="60" y="34">Top plate</text>
      </g>
    </>
  );
}

export function PlanSheet({ kind }: { kind: SheetKind }) {
  const [number, title, tool] = titles[kind];
  return (
    <svg
      className="sketch plan-sheet"
      viewBox="0 0 480 330"
      aria-hidden="true"
      focusable="false"
    >
      <rect className="sheet-frame" x="10" y="10" width="460" height="310" />
      {kind === 'plan' ? <Plan /> : kind === 'elevation' ? <Elevation /> : <Section />}
      <g className="sheet-title">
        <path d="M10 296H470M330 296V320" />
        <text x="22" y="312">
          {number} · {title}
        </text>
        <text x="458" y="312" textAnchor="end">
          {tool} · Illustration
        </text>
      </g>
    </svg>
  );
}
