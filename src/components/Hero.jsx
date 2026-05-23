import { meta, categories, recipes } from "../data/content.js";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@200;300;400&display=swap');

  .at-hero {
    --bg:     #080603;
    --cream:  #ede4d2;
    --amber:  #c4883b;
    --ember:  #7a2c12;
    --muted:  #6b5c47;
    --rule:   #2a2219;
    --glow:   rgba(196, 136, 59, 0.12);

    position: relative;
    min-height: 100svh;
    background-color: var(--bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-family: 'Jost', sans-serif;
  }

  /* Grain overlay */
  .at-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
    opacity: 0.04;
    pointer-events: none;
    z-index: 0;
  }

  /* Ambient radial glow */
  .at-hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 70% 55% at 50% 42%, var(--glow) 0%, transparent 70%),
      radial-gradient(ellipse 40% 30% at 20% 80%, rgba(122,44,18,0.08) 0%, transparent 60%);
    pointer-events: none;
    z-index: 0;
  }

  .at-hero__inner {
    position: relative;
    z-index: 1;
    text-align: center;
    padding: 4rem 2rem;
    max-width: 860px;
    width: 100%;
  }

  /* Eyebrow */
  .at-hero__eyebrow {
    font-family: 'Jost', sans-serif;
    font-weight: 200;
    font-size: 0.65rem;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: var(--amber);
    margin-bottom: 2.4rem;
    opacity: 0.85;
    animation: at-fade-up 1s ease both;
  }

  /* Brand title */
  .at-hero__title {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 300;
    font-size: clamp(4rem, 10vw, 8.5rem);
    line-height: 0.9;
    letter-spacing: -0.01em;
    color: var(--cream);
    margin: 0 0 0.15em;
    animation: at-fade-up 1s 0.15s ease both;
  }

  .at-hero__title em {
    font-style: italic;
    font-weight: 300;
    color: var(--amber);
  }

  /* Ornament */
  .at-hero__ornament {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    margin: 1.8rem auto 1.6rem;
    animation: at-fade-up 1s 0.25s ease both;
  }

  .at-hero__ornament span {
    display: block;
    height: 1px;
    width: 80px;
    background: linear-gradient(90deg, transparent, var(--muted));
  }

  .at-hero__ornament span:last-child {
    background: linear-gradient(90deg, var(--muted), transparent);
  }

  .at-hero__ornament svg {
    color: var(--amber);
    opacity: 0.7;
    flex-shrink: 0;
  }

  /* Hebrew subtitle */
  .at-hero__subtitle {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 300;
    font-size: clamp(1.05rem, 2.5vw, 1.4rem);
    color: var(--muted);
    letter-spacing: 0.04em;
    direction: rtl;
    margin-bottom: 3rem;
    animation: at-fade-up 1s 0.3s ease both;
  }

  /* Stats row */
  .at-hero__stats {
    display: flex;
    justify-content: center;
    gap: 0;
    margin-bottom: 3.4rem;
    animation: at-fade-up 1s 0.4s ease both;
  }

  .at-hero__stat {
    padding: 0.8rem 2rem;
    border-left: 1px solid var(--rule);
    text-align: center;
  }

  .at-hero__stat:first-child { border-left: none; }

  .at-hero__stat-value {
    font-family: 'Cormorant Garamond', serif;
    font-size: 2rem;
    font-weight: 300;
    color: var(--cream);
    line-height: 1;
    margin-bottom: 0.25rem;
  }

  .at-hero__stat-label {
    font-size: 0.6rem;
    font-weight: 200;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--muted);
  }

  /* CTA */
  .at-hero__cta {
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.75rem 2.2rem;
    border: 1px solid rgba(196,136,59,0.35);
    color: var(--amber);
    font-family: 'Jost', sans-serif;
    font-size: 0.7rem;
    font-weight: 300;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    cursor: pointer;
    background: transparent;
    transition: border-color 0.3s, background 0.3s, color 0.3s;
    animation: at-fade-up 1s 0.5s ease both;
    text-decoration: none;
  }

  .at-hero__cta:hover {
    background: rgba(196,136,59,0.08);
    border-color: var(--amber);
    color: var(--cream);
  }

  .at-hero__cta-arrow {
    transition: transform 0.3s;
  }

  .at-hero__cta:hover .at-hero__cta-arrow {
    transform: translateY(3px);
  }

  /* Recipe preview strip */
  .at-hero__preview {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    border-top: 1px solid var(--rule);
    display: grid;
    grid-template-columns: 1fr 1fr;
    z-index: 1;
    animation: at-fade-up 1s 0.65s ease both;
  }

  .at-hero__preview-item {
    padding: 1.2rem 2rem;
    display: flex;
    align-items: center;
    gap: 1.2rem;
    border-right: 1px solid var(--rule);
    cursor: pointer;
    transition: background 0.25s;
    text-decoration: none;
  }

  .at-hero__preview-item:last-child { border-right: none; }

  .at-hero__preview-item:hover {
    background: rgba(196,136,59,0.04);
  }

  .at-hero__preview-num {
    font-family: 'Cormorant Garamond', serif;
    font-size: 2rem;
    font-weight: 300;
    color: var(--rule);
    line-height: 1;
    flex-shrink: 0;
    user-select: none;
  }

  .at-hero__preview-item:hover .at-hero__preview-num {
    color: var(--ember);
    transition: color 0.25s;
  }

  .at-hero__preview-text {
    text-align: right;
    direction: rtl;
  }

  .at-hero__preview-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 0.95rem;
    font-weight: 400;
    color: var(--cream);
    line-height: 1.2;
    margin-bottom: 0.2rem;
  }

  .at-hero__preview-meta {
    font-size: 0.6rem;
    font-weight: 200;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted);
  }

  /* Scroll indicator */
  .at-hero__scroll {
    position: absolute;
    right: 2rem;
    bottom: 5.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    z-index: 1;
    animation: at-fade-in 1.5s 1s ease both;
  }

  .at-hero__scroll-line {
    width: 1px;
    height: 48px;
    background: linear-gradient(to bottom, transparent, var(--muted));
    animation: at-scroll-pulse 2s 1.5s ease-in-out infinite;
  }

  .at-hero__scroll-label {
    font-size: 0.55rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--muted);
    writing-mode: vertical-rl;
  }

  /* Animations */
  @keyframes at-fade-up {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes at-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes at-scroll-pulse {
    0%, 100% { opacity: 0.3; transform: scaleY(1); }
    50%       { opacity: 0.8; transform: scaleY(1.15); }
  }

  @media (max-width: 600px) {
    .at-hero__stats { flex-direction: column; gap: 0.5rem; }
    .at-hero__stat  { border-left: none; border-top: 1px solid var(--rule); padding: 0.6rem 1rem; }
    .at-hero__stat:first-child { border-top: none; }
    .at-hero__preview { grid-template-columns: 1fr; }
    .at-hero__preview-item:first-child { border-bottom: 1px solid var(--rule); border-right: none; }
    .at-hero__scroll { display: none; }
  }
`;

export default function Hero({ onExplore }) {
  const firstTwo = recipes.slice(0, 2);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <section className="at-hero">

        <div className="at-hero__inner">

          <p className="at-hero__eyebrow">
            {meta.chef} &nbsp;·&nbsp; Professional Kitchen Compendium
          </p>

          <h1 className="at-hero__title">
            After<br /><em>Taste</em>
          </h1>

          <div className="at-hero__ornament" aria-hidden="true">
            <span />
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 0L8.5 5.5H14L9.5 8.5L11 14L7 10.5L3 14L4.5 8.5L0 5.5H5.5L7 0Z" fill="currentColor" />
            </svg>
            <span />
          </div>

          <p className="at-hero__subtitle">{meta.subtitle}</p>

          <div className="at-hero__stats">
            <div className="at-hero__stat">
              <div className="at-hero__stat-value">{meta.totalRecipes}</div>
              <div className="at-hero__stat-label">מתכוני ליבה</div>
            </div>
            <div className="at-hero__stat">
              <div className="at-hero__stat-value">{categories.length}</div>
              <div className="at-hero__stat-label">קטגוריות</div>
            </div>
            <div className="at-hero__stat">
              <div className="at-hero__stat-value" style={{ fontSize: "1rem", paddingTop: "0.5rem" }}>Premium</div>
              <div className="at-hero__stat-label">Kitchen Grade</div>
            </div>
          </div>

          <a className="at-hero__cta" href="#recipes" onClick={onExplore}>
            גלה את המתכונים
            <svg className="at-hero__cta-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6l5 5 5-5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>

        </div>

        {/* Scroll indicator */}
        <div className="at-hero__scroll" aria-hidden="true">
          <span className="at-hero__scroll-label">Scroll</span>
          <span className="at-hero__scroll-line" />
        </div>

        {/* Recipe preview strip */}
        <div className="at-hero__preview">
          {firstTwo.map((r) => (
            <a key={r.id} className="at-hero__preview-item" href={`#recipe-${r.slug}`}>
              <span className="at-hero__preview-num">0{r.id}</span>
              <div className="at-hero__preview-text">
                <div className="at-hero__preview-name">{r.title}</div>
                <div className="at-hero__preview-meta">{r.subtitleEn} &nbsp;·&nbsp; {r.cookTime}</div>
              </div>
            </a>
          ))}
        </div>

      </section>
    </>
  );
}
