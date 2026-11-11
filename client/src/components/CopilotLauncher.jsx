import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Bot, X } from 'lucide-react';

const GREETING_TEXT =
  'I can explain this site’s readings, health guidance and forecast — or help you find what you need.';

export default function CopilotLauncher() {
  const { pathname } = useLocation();
  const [greetingOpen, setGreetingOpen] = useState(true);
  const [typedChars, setTypedChars] = useState(0);
  const [typing, setTyping] = useState(false);
  const showGreeting = greetingOpen && pathname !== '/assistant';

  useEffect(() => {
    if (!showGreeting) return undefined;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedChars(GREETING_TEXT.length);
      setTyping(false);
      return undefined;
    }

    let interval = 0;
    let count = 0;
    setTypedChars(0);
    setTyping(true);

    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        count += 1;
        setTypedChars(count);

        if (count >= GREETING_TEXT.length) {
          window.clearInterval(interval);
          setTyping(false);
        }
      }, 22);
    }, 650);

    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [showGreeting]);

  return (
    <div className="copilot-launcher">
      {showGreeting ? (
        <aside className="copilot-greeting" aria-label="AIRCUE Copilot introduction">
          <button
            type="button"
            className="copilot-greeting-close"
            onClick={() => setGreetingOpen(false)}
            aria-label="Dismiss AIRCUE Copilot greeting"
          >
            <X size={14} aria-hidden="true" />
          </button>
          <Link to="/assistant" className="copilot-greeting-link" onClick={() => setGreetingOpen(false)}>
            <span className={`copilot-greeting-icon ${typing ? 'is-speaking' : ''}`}>
              <Bot size={18} aria-hidden="true" />
            </span>
            <span>
              <span className="copilot-greeting-kicker">
                AIRCUE Copilot
                {typing ? (
                  <span className="copilot-speaking" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : null}
              </span>
              <strong>Ask me about the air.</strong>
              <span className="copilot-greeting-message">
                {typedChars === 0 && typing ? (
                  <span className="copilot-typing" role="status" aria-label="AIRCUE Copilot is typing">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  <>
                    <span className="copilot-greeting-copy" aria-hidden="true">
                      {GREETING_TEXT.slice(0, typedChars)}
                      {typing ? <span className="copilot-caret" /> : null}
                    </span>
                    <span className="sr-only">{GREETING_TEXT}</span>
                  </>
                )}
              </span>
              <span className="copilot-greeting-cta">
                Open Copilot <ArrowUpRight size={13} aria-hidden="true" />
              </span>
            </span>
          </Link>
        </aside>
      ) : null}

      <Link to="/assistant" className="copilot-fab" aria-label="Open AIRCUE Copilot">
        <Bot size={18} aria-hidden="true" />
        <span>Copilot</span>
      </Link>
    </div>
  );
}
