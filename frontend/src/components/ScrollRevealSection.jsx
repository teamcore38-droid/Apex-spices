import { useEffect, useRef } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const ScrollRevealSection = ({ children, className = '', ...props }) => {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const prefersReducedMotion = window.matchMedia?.(REDUCED_MOTION_QUERY).matches;

    if (!section || prefersReducedMotion || !('IntersectionObserver' in window)) {
      section?.classList.add('home-scroll-reveal--visible');
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        section.classList.add('home-scroll-reveal--visible');
        observer.disconnect();
      },
      {
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.12,
      }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`home-scroll-reveal ${className}`.trim()}
      {...props}
    >
      {children}
    </section>
  );
};

export default ScrollRevealSection;
