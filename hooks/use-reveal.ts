import { useEffect } from 'react';

// Content below the fold rises into place as it is reached. Anything already
// on screen at load is left alone, so nothing that was visible ever flashes.
const targets = [
  '.section-heading',
  '.project-card',
  '.passage > *',
  '.code-motion-copy',
  '.home-about > *',
  '.contact > *',
  '.case-meta > div',
  '.case-image',
  '.case-section > *',
  '.research-line',
  '.sheet-card',
  '.timeline > div',
  '.dinosaur-file > *',
  '.about-full > *',
  '.lab-heading',
  '.next-page',
].join(',');

export function useReveal() {
  useEffect(() => {
    // A position check rather than an observer: a fast scroll or a jump to an
    // anchor can skip past an element entirely, and it must still appear.
    let sketches = [...document.querySelectorAll<SVGElement>('.sketch')];
    let pending = [...document.querySelectorAll<HTMLElement>(targets)].filter(
      (element) => element.getBoundingClientRect().top >= innerHeight * 0.92,
    );
    pending.forEach((element) => element.classList.add('reveal'));
    let frame = 0;
    function check() {
      frame = 0;
      const line = innerHeight * 0.9;
      const bottom =
        scrollY + innerHeight >= document.documentElement.scrollHeight - 4;
      let order = 0;
      pending = pending.filter((element) => {
        if (!bottom && element.getBoundingClientRect().top > line) return true;
        element.style.setProperty(
          '--reveal-delay',
          `${Math.min(order++, 4) * 90}ms`,
        );
        element.classList.add('is-visible');
        return false;
      });
      sketches = sketches.filter((sketch) => {
        const box = sketch.getBoundingClientRect();
        if (!bottom && box.top + box.height * 0.3 > innerHeight) return true;
        sketch.classList.add('is-drawn');
        return false;
      });
      if (!pending.length && !sketches.length) stop();
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(check);
    }
    function stop() {
      cancelAnimationFrame(frame);
      removeEventListener('scroll', schedule);
      removeEventListener('resize', schedule);
    }
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    schedule();
    return stop;
  }, []);
}
