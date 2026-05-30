import { useEffect, useRef } from 'react';

/**
 * useReveal — attaches an IntersectionObserver to all .reveal elements
 * inside the given container ref (defaults to document).
 *
 * Usage:
 *   const sectionRef = useReveal();
 *   <section ref={sectionRef}>
 *     <div className="reveal">…</div>
 *   </section>
 */
export default function useReveal(threshold = 0.15) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current ?? document;
    const targets = root.querySelectorAll('.reveal');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}
