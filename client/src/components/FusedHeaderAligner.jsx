import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DESKTOP_QUERY = '(min-width: 1081px)';
const HEADER_SELECTOR = ':scope > .section-heading, :scope > .chat-header';

export default function FusedHeaderAligner() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const align = () => {
      document.querySelectorAll('.two-column').forEach((group) => {
        const headers = Array.from(group.children)
          .map((panel) => panel.querySelector(HEADER_SELECTOR))
          .filter(Boolean);

        headers.forEach((header) => header.style.removeProperty('min-height'));

        if (headers.length < 2 || !window.matchMedia(DESKTOP_QUERY).matches) return;

        const tallest = Math.max(...headers.map((header) => header.getBoundingClientRect().height));
        headers.forEach((header) => {
          header.style.minHeight = `${tallest}px`;
        });
      });
    };

    align();

    const target = document.querySelector('.app-main') || document.body;
    const observer = new MutationObserver(align);
    observer.observe(target, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', align);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', align);
    };
  }, [pathname]);

  return null;
}
