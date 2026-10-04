// An illustrative line study for the dinosaur research file: the head, the jaw
// pivot, and a servo, drawn like a page from a notebook. It is not a CAD model.
const upperTeeth = Array.from({ length: 12 }, (_, i) => {
  const x = 176 + i * 18;
  const y = 158.5 - (x - 176) * 0.026;
  return `M${x} ${y.toFixed(1)}l4 8l4 -8`;
}).join('');
const lowerTeeth = Array.from({ length: 11 }, (_, i) => {
  const x = 186 + i * 18;
  const y = 159.5 - (x - 186) * 0.004;
  return `M${x} ${y.toFixed(1)}l4 -7l4 7`;
}).join('');

export function DinosaurSketch({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`sketch ${className}`}
      viewBox="0 0 480 290"
      aria-hidden="true"
      focusable="false"
    >
      <g className="sketch-guides">
        <path d="M40 162H448" strokeDasharray="2 6" />
        <path d="M118 52V256" strokeDasharray="2 6" />
        <path
          className="sketch-travel"
          d="M392 168A274 274 0 0 1 382 234"
          strokeDasharray="3 5"
        />
        <path d="M374 212l20 0" />
      </g>
      <g className="sketch-skull">
        <path
          className="draw"
          pathLength={1}
          d="M118 162C96 160 72 150 70 128C70 104 100 86 140 82C165 80 188 72 210 70C228 69 240 80 258 86C305 98 355 104 394 116C408 120 414 132 410 144L404 152C330 154 230 152 118 162Z"
        />
        <path className="draw thin" pathLength={1} d={upperTeeth} />
        <ellipse
          cx="304"
          cy="126"
          rx="34"
          ry="10"
          strokeDasharray="3 4"
          className="faint"
        />
        <ellipse
          cx="102"
          cy="122"
          rx="16"
          ry="13"
          strokeDasharray="3 4"
          className="faint"
        />
        <ellipse cx="392" cy="125" rx="5" ry="3" className="thin" />
        <circle
          cx="222"
          cy="98"
          r="15"
          strokeDasharray="2 4"
          className="faint"
        />
        <circle cx="222" cy="98" r="7" className="draw" pathLength={1} />
        <circle cx="222" cy="98" r="2.4" className="sketch-pupil" />
      </g>
      <g className="sketch-jaw">
        <path
          className="draw"
          pathLength={1}
          d="M118 162C220 156 320 158 396 160C398 168 392 174 380 176C320 186 230 196 150 194C128 193 112 182 118 162Z"
        />
        <path className="draw thin" pathLength={1} d={lowerTeeth} />
        <path className="faint" d="M150 182C230 178 310 172 372 168" strokeDasharray="3 4" />
      </g>
      <g className="sketch-mechanism">
        <rect x="140" y="110" width="30" height="18" />
        <circle cx="164" cy="119" r="3" />
        <path d="M164 119L118 162" strokeDasharray="3 3" />
        <circle cx="118" cy="162" r="6" />
        <path d="M108 162h20M118 152v20" />
      </g>
      <g className="sketch-labels">
        <path d="M112 168L84 214H62" />
        <text x="62" y="226">
          Pivot A
        </text>
        <path d="M155 110V92h22" />
        <text x="181" y="88">
          Servo 01
        </text>
        <text x="400" y="216">
          Jaw 0–14°
        </text>
        <text x="40" y="44" className="sketch-title">
          Fig. 01 — Head &amp; jaw study
        </text>
      </g>
    </svg>
  );
}
