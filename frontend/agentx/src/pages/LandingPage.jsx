import { useEffect, useRef, useState } from 'react';
import { NeuralBackground } from '../components/NeuralBackground';
import { AgentXLogoText, AgentXLogo } from '../components/AgentXLogo';
import { TicketStream } from '../components/FloatingTicket';
import { GlitchText } from '../components/GlitchText';
import './LandingPage.css';

/* ── Icons (inline SVG — no lucide dependency needed) ──────────────────── */
const Icon = {
  ArrowRight: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 5l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Bot: ({ size = 28 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 12h.01M15 12h.01M9 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 8V5M9 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Shield: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3L4 7v5c0 5 3.5 9.3 8 10.5C16.5 21.3 20 17 20 12V7L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Workflow: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="16" y="3" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="9" y="16" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5.5 8v4h13V8M12 12v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Zap: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  GitBranch: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="6" cy="18" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="18" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 8v8M6 8c0 3 12 2 12 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Sparkles: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  Ticket: ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 9a1 1 0 001-1V6a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 001 1v6a1 1 0 01-1 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2a1 1 0 01-1-1V9z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M9 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Mail: ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

/* ── Scroll-reveal hook ────────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ── Scroll indicator ──────────────────────────────────────────────────── */
function ScrollIndicator() {
  return (
    <div className="lp-scroll-indicator">
      <span className="lp-scroll-indicator__label">Explore</span>
      <div className="lp-scroll-indicator__track">
        <div className="lp-scroll-indicator__dot" />
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────── */
export function LandingPage({ onGoLogin, onGoRegister }) {
  const [scrolled, setScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [featRef, featVisible] = useReveal();
  const [workRef, workVisible] = useReveal();
  const [intRef, intVisible] = useReveal();

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    const scroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', scroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener('scroll', scroll); };
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="lp">
      <NeuralBackground />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className={`lp-nav ${heroVisible ? 'lp-nav--in' : ''} ${scrolled ? 'lp-nav--scrolled' : ''}`}>
        <div className="lp-nav__inner">
          <AgentXLogoText />
          <div className="lp-nav__links">
            <button className="lp-nav__link" onClick={() => scrollTo('features')}>Capabilities</button>
            <button className="lp-nav__link" onClick={() => scrollTo('workflow')}>Workflow</button>
            <button className="lp-nav__link" onClick={() => scrollTo('integrations')}>Integrations</button>
          </div>
          <button className="lp-btn lp-btn--outline" onClick={onGoLogin}>Sign in</button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero__inner">
          {/* Left */}
          <div className={`lp-hero__left ${heroVisible ? 'lp-hero__left--in' : ''}`}>
            <div className="lp-badge">
              <Icon.Sparkles size={14} />
              <span>Intelligent automation</span>
            </div>

            <h1 className="lp-hero__h1">
              <GlitchText text="The agent" />
              <br />
              <span className="lp-hero__h1-grad">that resolves</span>
              <br />
              <GlitchText text="incidents" />
            </h1>

            <p className="lp-hero__sub">
              AI-powered ticketing system that automates triage, classification, and incident resolution for e-commerce.
            </p>

            <div className="lp-hero__cta">
              <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={onGoRegister}>
                Get started
                <Icon.ArrowRight />
              </button>
            </div>

            <div className="lp-hero__stats">
              <div className="lp-stat">
                <span className="lp-stat__val">98%</span>
                <span className="lp-stat__label">Auto-classified tickets</span>
              </div>
              <div className="lp-stat">
                <span className="lp-stat__val">3min</span>
                <span className="lp-stat__label">Average resolution time</span>
              </div>
              <div className="lp-stat">
                <span className="lp-stat__val">24/7</span>
                <span className="lp-stat__label">Continuous operation</span>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className={`lp-hero__right ${heroVisible ? 'lp-hero__right--in' : ''}`}>
            <div className="lp-hero__logo-wrap">
              <div className="lp-hero__logo-glow" />
              <AgentXLogo size={120} />
            </div>
            <div className="lp-hero__tickets lp-hero__tickets--top">
              <TicketStream />
            </div>
            <div className="lp-hero__tickets lp-hero__tickets--bottom">
              <TicketStream />
            </div>
          </div>
        </div>

        <ScrollIndicator />
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="lp-section lp-features" ref={featRef}>
        <div className="lp-section__inner">
          <div className={`lp-section__head ${featVisible ? 'lp-reveal' : ''}`}>
            <h2 className="lp-h2">
              Autonomous <span className="lp-accent">capabilities</span>
            </h2>
            <p className="lp-section__sub">
              Specialized agents working in sync to classify, route, and resolve incidents with fewer steps.
            </p>
          </div>

          <div className="lp-cap-grid">
            <div className={`lp-card lp-card--feature ${featVisible ? 'lp-reveal lp-reveal--d1' : ''}`}>
              <div className="lp-card__glow" />
              <h3 className="lp-card__title">Intelligent Triage</h3>
              <p className="lp-card__desc">
                Analyzes each incident and creates tickets with priority and category in seconds.
              </p>
            </div>

            <div className={`lp-card ${featVisible ? 'lp-reveal lp-reveal--d2' : ''}`}>
              <h3 className="lp-card__title">Auto Assignment</h3>
              <p className="lp-card__desc">Routes each ticket to the best team based on workload, expertise, and availability.</p>
            </div>

            <div className={`lp-card ${featVisible ? 'lp-reveal lp-reveal--d3' : ''}`}>
              <h3 className="lp-card__title">Enrichment</h3>
              <p className="lp-card__desc">Adds context from Saleor and connected systems for better responses.</p>
            </div>

            <div className={`lp-card ${featVisible ? 'lp-reveal lp-reveal--d4' : ''}`}>
              <h3 className="lp-card__title">Automatic Diagrams</h3>
              <p className="lp-card__desc">Generates incident flow diagrams to speed up team understanding.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Workflow ─────────────────────────────────────────────────────── */}
      <section id="workflow" className="lp-section lp-workflow" ref={workRef}>
        <div className="lp-workflow__gradient" />
        <div className="lp-section__inner lp-section__inner--rel">
          <div className={`lp-section__head ${workVisible ? 'lp-reveal' : ''}`}>
            <h2 className="lp-h2">
              Resolution <span className="lp-accent">workflow</span>
            </h2>
            <p className="lp-section__sub">From intake to resolution, in a short and traceable sequence.</p>
          </div>

          <div className="lp-steps">
            <div className="lp-steps__line" />
            {[
              { step: '01', title: 'Intake',          desc: 'Automatic incident intake and validation.',                    Icon: Icon.Ticket },
              { step: '02', title: 'Triage',          desc: 'AI-based classification and prioritization.',                 Icon: Icon.Bot    },
              { step: '03', title: 'Enrichment',      desc: 'Additional context from Saleor and integrations.',             Icon: Icon.Zap    },
              { step: '04', title: 'Resolution',      desc: 'Assignment to the right team with instant notification.',      Icon: Icon.Mail   },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`lp-step ${workVisible ? `lp-reveal lp-reveal--d${i + 1}` : ''}`}
              >
                <div className="lp-step__icon-wrap">
                  <item.Icon size={32} />
                </div>
                <div className="lp-step__head">
                  <div className="lp-step__num">{item.step}</div>
                  <h3 className="lp-step__title">{item.title}</h3>
                </div>
                <p className="lp-step__desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integrations ─────────────────────────────────────────────────── */}
      <section id="integrations" className="lp-section lp-integrations" ref={intRef}>
        <div className="lp-section__inner">
          <div className={`lp-section__head ${intVisible ? 'lp-reveal' : ''}`}>
            <h2 className="lp-h2">
              <span className="lp-accent">Connected</span> to your stack
            </h2>
            <p className="lp-section__sub">Native integration with the tools you already use.</p>
          </div>

          <div className="lp-integrations__grid">
            {[
              { name: 'Saleor',   desc: 'E-commerce'          },
              { name: 'Jira',     desc: 'Project Management'   },
              { name: 'Gmail',    desc: 'Notificaciones'       },
              { name: 'API REST', desc: 'Custom'               },
            ].map((item, i) => (
              <div
                key={item.name}
                className={`lp-integration-card ${intVisible ? `lp-reveal lp-reveal--d${i + 1}` : ''}`}
              >
                <span className="lp-integration-card__name">{item.name}</span>
                <span className="lp-integration-card__desc">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <AgentXLogoText />
          <div className="lp-footer__links">
            <a href="#" className="lp-footer__link">Documentation</a>
            <a href="#" className="lp-footer__link">API</a>
            <a href="#" className="lp-footer__link">Support</a>
          </div>
          <span className="lp-footer__copy">© 2026 AgentX_SYNCRO. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;