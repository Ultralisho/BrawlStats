import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';

/* ──────────────────────────────────────────────────────────────────
 * Constantes
 * ────────────────────────────────────────────────────────────────── */

// Colores de rareza (según especificación del proyecto).
// La API de BrawlAPI devuelve rareza.name en formato "Trophy Road",
// "Rare", "Super Rare", "Epic", "Mythic" o "Legendary".
const RARITY_COLORS = {
  'Trophy Road': '#a0aec0',
  'Rare':        '#48bb78',
  'Super Rare':  '#4299e1',
  'Epic':        '#9f7aea',
  'Mythic':      '#ed64a6',
  'Legendary':   '#ecc94b',
};
const RARITY_ORDER = ['Trophy Road', 'Rare', 'Super Rare', 'Epic', 'Mythic', 'Legendary'];

const MODES = ['Brawl Ball', 'Gem Grab', 'Showdown', 'Hot Zone', 'Knockout', 'Bounty', 'Heist', 'Duels'];

const MODE_NOTES = {
  'Brawl Ball': 'Build estándar orientada a movilidad y presión ofensiva en la portería.',
  'Gem Grab':   'Build estándar para sujetar gemas y controlar la mina central.',
  'Showdown':   'Build estándar para supervivencia y duelos 1vs1 en el mapa abierto.',
  'Hot Zone':   'Build estándar para control de zona y daño persistente.',
  'Knockout':   'Build estándar para rondas cortas y eliminaciones rápidas.',
  'Bounty':     'Build estándar para daño a distancia y proteger las estrellas.',
  'Heist':      'Build estándar para romper la caja fuerte o defenderla.',
  'Duels':      'Build estándar para mantener vida entre cambios de brawler.',
};

const CDN = {
  brawler:   id => `https://cdn.brawlify.com/brawlers/borders/${id}.png`,
  gadget:    id => `https://cdn.brawlify.com/gadgets/regular/${id}.png`,
  starPower: id => `https://cdn.brawlify.com/star-powers/regular/${id}.png`,
};

// BrawlAPI devuelve imageUrl en /borderless/, que da 404 para los IDs nuevos.
// Forzamos siempre /regular/ (existe para todos los IDs).
const fixCdn = (url) => typeof url === 'string'
  ? url.replace('/gadgets/borderless/', '/gadgets/regular/')
       .replace('/star-powers/borderless/', '/star-powers/regular/')
  : url;

// Priorizamos la URL construida por id (sabemos que /regular/ funciona) y
// caemos al imageUrl normalizado solo si no hay id.
const imgGadget    = g  => g  ? (g.id  ? CDN.gadget(g.id)    : fixCdn(g.imageUrl)  || null) : null;
const imgStarPower = sp => sp ? (sp.id ? CDN.starPower(sp.id) : fixCdn(sp.imageUrl) || null) : null;
const imgBrawler   = b  => b  ? (b.id  ? CDN.brawler(b.id)    : b.imageUrl || null) : null;

/* ──────────────────────────────────────────────────────────────────
 * Lógica de recomendación de build.
 *
 * No tenemos datos reales por modo desde BrawlAPI, así que aplicamos
 * una selección determinista en función del modo y del brawler:
 *   - El índice del modo en MODES desplaza la selección
 *   - El id del brawler añade un offset para que dos brawlers
 *     distintos no recomienden siempre el mismo índice en cada modo
 *   - Se aplica módulo sobre el nº de gadgets / star powers disponibles
 *
 * Cuando se conecten datos reales por modo, basta con sustituir esta
 * función — la firma se mantiene.
 * ────────────────────────────────────────────────────────────────── */
function getRecommendedBuild(brawler, mode) {
  const gadgets    = brawler?.gadgets    || [];
  const starPowers = brawler?.starPowers || [];

  const modeIdx    = Math.max(0, MODES.indexOf(mode));
  const brawlerOff = Number(brawler?.id) || 0;

  const gadgetIdx = gadgets.length    > 0 ? (modeIdx + brawlerOff) % gadgets.length    : -1;
  const starIdx   = starPowers.length > 0 ? (modeIdx + brawlerOff) % starPowers.length : -1;

  return {
    gadget:    gadgetIdx >= 0 ? gadgets[gadgetIdx]    : null,
    starPower: starIdx   >= 0 ? starPowers[starIdx]   : null,
  };
}

/* ──────────────────────────────────────────────────────────────────
 * Imagen con fallback
 * ────────────────────────────────────────────────────────────────── */
function ImgWithFallback({ src, fallbackSrc, alt, fallbackText, color = '#3b82f6', size = 48, style }) {
  const [useFallback, setUseFallback] = useState(false);
  const [allFailed,   setAllFailed]   = useState(false);

  const currentSrc = useFallback ? fallbackSrc : src;

  const handleError = () => {
    if (!useFallback && fallbackSrc) {
      setUseFallback(true);
    } else {
      setAllFailed(true);
    }
  };

  if (allFailed || !currentSrc) {
    return (
      <div
        aria-label={alt}
        style={{
          width: size, height: size, borderRadius: 8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: color + '22', border: '1px solid ' + color + '55',
          color, fontWeight: 800, fontFamily: 'var(--font-display)',
          fontSize: Math.max(12, Math.round(size * 0.35)),
          ...style,
        }}
      >
        {(fallbackText || '?').slice(0, 1)}
      </div>
    );
  }
  return (
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      onError={handleError}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0, display: 'block', ...style }}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────
 * Card de brawler en el grid
 * ────────────────────────────────────────────────────────────────── */
function BrawlerCard({ brawler, onClick }) {
  const rarityName  = brawler.rarity?.name || 'Trophy Road';
  const rarityColor = RARITY_COLORS[rarityName] || '#a0aec0';
  const gadgets    = brawler.gadgets    || [];
  const starPowers = brawler.starPowers || [];

  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      style={{
        cursor: 'pointer',
        borderTop: '3px solid ' + rarityColor,
        transition: 'var(--transition)',
        display: 'flex', flexDirection: 'column', gap: 'var(--s4)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = 'var(--blue-border)';
        e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.45)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.borderTop  = '3px solid ' + rarityColor;
      }}
    >
      {/* Header: imagen + nombre + rareza */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--s2)' }}>
        <ImgWithFallback
          src={imgBrawler(brawler)}
          fallbackSrc={brawler.imageUrl || null}
          alt={brawler.name}
          fallbackText={brawler.name}
          color={rarityColor}
          size={96}
        />
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.15rem',
            fontWeight: 800,
            color: 'var(--text-1)',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          {brawler.name}
        </div>
        <span
          style={{
            background: rarityColor + '22',
            color: rarityColor,
            border: '1px solid ' + rarityColor + '55',
            borderRadius: 999,
            padding: '2px 10px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {rarityName}
        </span>
      </div>

      {/* Gadgets */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
            marginBottom: 6,
            paddingBottom: 4,
            borderBottom: '1px solid var(--border)',
          }}
        >
          Gadgets
        </div>
        {gadgets.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sin gadgets.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {gadgets.map(g => (
              <div key={g.id ?? g.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ImgWithFallback
                  src={imgGadget(g)}
                  alt={g.name}
                  fallbackText={g.name}
                  color="#3b82f6"
                  size={28}
                  style={{ borderRadius: 6 }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{g.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Star Powers */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
            marginBottom: 6,
            paddingBottom: 4,
            borderBottom: '1px solid var(--border)',
          }}
        >
          Star Powers
        </div>
        {starPowers.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sin star powers.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {starPowers.map(sp => (
              <div key={sp.id ?? sp.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ImgWithFallback
                  src={imgStarPower(sp)}
                  alt={sp.name}
                  fallbackText={sp.name}
                  color="#FACC15"
                  size={28}
                  style={{ borderRadius: 6 }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{sp.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hipercarga */}
      {brawler.hypercharge && (
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-3)',
              marginBottom: 6,
              paddingBottom: 4,
              borderBottom: '1px solid var(--border)',
            }}
          >
            Hipercarga recomendada
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚡</span>
            <span style={{ fontSize: 12, color: '#FACC15', fontWeight: 700 }}>{brawler.hypercharge.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
 * Skeleton card mientras carga
 * ────────────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div className="skeleton" style={{ width: 96, height: 96, borderRadius: 12 }} />
        <div className="skeleton" style={{ width: 110, height: 18, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 999 }} />
      </div>
      <div className="skeleton" style={{ width: '100%', height: 56, borderRadius: 6 }} />
      <div className="skeleton" style={{ width: '100%', height: 56, borderRadius: 6 }} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
 * Panel lateral (drawer) con el detalle de la build
 * ────────────────────────────────────────────────────────────────── */
function BuildPanel({ brawler, onClose }) {
  const [mode, setMode] = useState(MODES[0]);
  const panelRef = useRef(null);
  const isOpen = !!brawler;

  // Cerrar con ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Resetear modo al abrir un brawler distinto
  useEffect(() => { setMode(MODES[0]); }, [brawler?.id]);

  // Sin brawler → nada (animaciones de salida no se mantienen para
  // simplificar; el panel desaparece del DOM al cerrar).
  if (!brawler) return null;

  const rarityName  = brawler.rarity?.name || 'Trophy Road';
  const rarityColor = RARITY_COLORS[rarityName] || '#a0aec0';
  const className   = brawler.class?.name || null;
  const gadgets     = brawler.gadgets    || [];
  const starPowers  = brawler.starPowers || [];
  const recommended = getRecommendedBuild(brawler, mode);
  const recGadgetId = recommended.gadget?.id;
  const recStarId   = recommended.starPower?.id;
  const note        = MODE_NOTES[mode] || 'Build estándar recomendada para la mayoría de modos.';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(3,9,20,0.55)',
          backdropFilter: 'blur(3px)',
          animation: 'bldFadeIn 0.18s ease-out',
        }}
      />
      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Build de ${brawler.name}`}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: 'min(460px, 100%)',
          background: 'var(--bg-elevated)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.55)',
          zIndex: 201,
          display: 'flex', flexDirection: 'column',
          animation: 'bldSlideIn 0.25s cubic-bezier(.2,.7,.2,1)',
        }}
      >
        {/* Inyección de keyframes (una sola vez por render) */}
        <style>{`
          @keyframes bldFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes bldSlideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        `}</style>

        {/* Cabecera con cierre */}
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: 'var(--s3)',
            padding: 'var(--s5) var(--s5) var(--s4)',
            borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(135deg, ' + rarityColor + '14 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--s4)', alignItems: 'center', minWidth: 0 }}>
            <ImgWithFallback
              src={imgBrawler(brawler)}
              fallbackSrc={brawler.imageUrl || null}
              alt={brawler.name}
              fallbackText={brawler.name}
              color={rarityColor}
              size={84}
              style={{ borderRadius: 12 }}
            />
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  letterSpacing: '0.01em',
                  color: 'var(--text-1)',
                  marginBottom: 6,
                  lineHeight: 1.1,
                  textTransform: 'uppercase',
                  wordBreak: 'break-word',
                }}
              >
                {brawler.name}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span
                  style={{
                    background: rarityColor + '22', color: rarityColor,
                    border: '1px solid ' + rarityColor + '55',
                    borderRadius: 4, padding: '3px 8px',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}
                >
                  {rarityName}
                </span>
                {className && (
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 4, padding: '3px 8px',
                      fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
                    }}
                  >
                    {className}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel"
            style={{
              flexShrink: 0,
              width: 34, height: 34, borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, lineHeight: 1, transition: 'var(--transition)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--error-dim)'; e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >×</button>
        </div>

        {/* Contenido scrolleable */}
        <div style={{ overflowY: 'auto', padding: 'var(--s5)', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>

          {/* ── BUILD RECOMENDADA ── */}
          <section>
            <h3
              style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--blue)',
                marginBottom: 'var(--s3)',
              }}
            >
              Build recomendada
            </h3>

            {/* Selector de modo */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 'var(--s4)' }}>
              {MODES.map(m => {
                const active = m === mode;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      background: active ? 'var(--blue-dim)'   : 'transparent',
                      color:      active ? 'var(--blue)'       : 'var(--text-2)',
                      border: '1px solid ' + (active ? 'var(--blue-border)' : 'var(--border)'),
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            {/* Cards recomendados */}
            {!recommended.gadget && !recommended.starPower ? (
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
                No hay datos suficientes para recomendar una build.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--s3)' }}>
                {recommended.gadget && (
                  <RecCard
                    type="Gadget"
                    typeColor="#3b82f6"
                    name={recommended.gadget.name}
                    imageUrl={imgGadget(recommended.gadget)}
                  />
                )}
                {recommended.starPower && (
                  <RecCard
                    type="Star Power"
                    typeColor="var(--gold)"
                    name={recommended.starPower.name}
                    imageUrl={imgStarPower(recommended.starPower)}
                  />
                )}
              </div>
            )}

            <p
              style={{
                marginTop: 'var(--s3)',
                padding: 'var(--s3) var(--s4)',
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 8,
                fontSize: 12.5,
                color: '#86efac',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: 'var(--success)', fontWeight: 700 }}>· </strong>
              {note}
            </p>
          </section>

          {/* ── TODOS LOS GADGETS ── */}
          <section>
            <h3
              style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--text-3)',
                marginBottom: 'var(--s3)',
              }}
            >
              Todos los gadgets
            </h3>
            {gadgets.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Este brawler no tiene gadgets registrados.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                {gadgets.map(g => (
                  <AbilityItem
                    key={g.id ?? g.name}
                    label="Gadget"
                    name={g.name}
                    imageUrl={imgGadget(g)}
                    accent="#3b82f6"
                    highlighted={g.id != null && g.id === recGadgetId}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── TODOS LOS STAR POWERS ── */}
          <section>
            <h3
              style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--text-3)',
                marginBottom: 'var(--s3)',
              }}
            >
              Todos los star powers
            </h3>
            {starPowers.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Este brawler no tiene star powers registrados.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                {starPowers.map(sp => (
                  <AbilityItem
                    key={sp.id ?? sp.name}
                    label="Star Power"
                    name={sp.name}
                    imageUrl={imgStarPower(sp)}
                    accent="var(--gold)"
                    highlighted={sp.id != null && sp.id === recStarId}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}

function RecCard({ type, typeColor, name, imageUrl }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--s4)',
        padding: 'var(--s4)',
        background: 'var(--bg-surface)',
        border: '2px solid var(--success)',
        borderRadius: 12,
        boxShadow: '0 0 0 3px rgba(34,197,94,0.12)',
      }}
    >
      <ImgWithFallback
        src={imageUrl}
        alt={name}
        fallbackText={name}
        color={typeColor}
        size={52}
        style={{ borderRadius: 10 }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: typeColor, marginBottom: 3,
          }}
        >
          {type}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{name}</div>
      </div>
      <span
        style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
          color: 'var(--success)', background: 'rgba(34,197,94,0.12)',
          border: '1px solid rgba(34,197,94,0.4)',
          borderRadius: 999, padding: '3px 9px',
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}
      >
        ✓ Recom.
      </span>
    </div>
  );
}

function AbilityItem({ label, name, imageUrl, accent, highlighted }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--s3)',
        padding: '10px 12px',
        background: highlighted ? 'rgba(34,197,94,0.08)' : 'var(--bg-surface)',
        border: '1px solid ' + (highlighted ? 'var(--success)' : 'var(--border)'),
        borderRadius: 10,
        transition: 'var(--transition)',
      }}
    >
      <ImgWithFallback
        src={imageUrl}
        alt={name}
        fallbackText={name}
        color={accent}
        size={36}
        style={{ borderRadius: 8 }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: accent, marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{name}</div>
      </div>
      {highlighted && (
        <span
          style={{
            fontSize: 10, fontWeight: 700,
            color: 'var(--success)', whiteSpace: 'nowrap',
          }}
        >
          ✓
        </span>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
 * Página principal
 * ────────────────────────────────────────────────────────────────── */
export default function Builds() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [brawlers,  setBrawlers]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const [search,    setSearch]    = useState('');
  const [rarityF,   setRarityF]   = useState('all');
  const [modeF,     setModeF]     = useState('all'); // filtro decorativo

  const [selectedId, setSelectedId] = useState(null);

  /* ── Carga de datos desde BrawlAPI (vía proxy backend) ── */
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);

    fetch(`${process.env.REACT_APP_API_URL}/brawlapi/brawlers`)
      .then(async r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(data => {
        if (!alive) return;
        // BrawlAPI devuelve { list: [...] }; aceptamos también array directo.
        const list = Array.isArray(data?.list) ? data.list : (Array.isArray(data) ? data : []);
        setBrawlers(list);
      })
      .catch(err => { if (alive) setError(err.message || 'Error cargando brawlers'); })
      .finally(()  => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, []);

  /* ── Auto-abrir panel si vienes con ?brawler=ID ── */
  useEffect(() => {
    if (loading || brawlers.length === 0) return;
    const qid = searchParams.get('brawler');
    if (!qid) return;
    const idNum = Number(qid);
    const match = brawlers.find(b => Number(b.id) === idNum);
    if (match) setSelectedId(match.id);
  }, [loading, brawlers, searchParams]);

  /* ── Listas de filtros disponibles ── */
  const rarityOptions = useMemo(() => {
    const present = new Set(brawlers.map(b => b.rarity?.name).filter(Boolean));
    return ['all', ...RARITY_ORDER.filter(r => present.has(r))];
  }, [brawlers]);

  /* ── Filtrado en cliente ── */
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return brawlers.filter(b => {
      if (term && !(b.name || '').toLowerCase().includes(term)) return false;
      if (rarityF !== 'all' && b.rarity?.name !== rarityF) return false;
      // modeF es decorativo: por ahora no filtra (no hay datos por modo).
      return true;
    });
  }, [brawlers, search, rarityF, modeF]);

  const resetFilters = () => {
    setSearch('');
    setRarityF('all');
    setModeF('all');
  };

  const closePanel = () => {
    setSelectedId(null);
    if (searchParams.get('brawler')) {
      const next = new URLSearchParams(searchParams);
      next.delete('brawler');
      setSearchParams(next, { replace: true });
    }
  };

  const selectedBrawler = useMemo(
    () => brawlers.find(b => b.id === selectedId) || null,
    [brawlers, selectedId]
  );

  return (
    <Layout>
      <Topbar title="Builds" />
      <div className="page">

        {/* ── Cabecera contextual ── */}
        <div className="flex items-center justify-between mb-6" style={{ gap: 'var(--s4)', flexWrap: 'wrap' }}>
          <div>
            <h1 className="t-h2 mb-1">Builds por brawler</h1>
            <p className="t-sm text-3">
              Explora gadgets y star powers de cada brawler. Haz click en uno para ver la build recomendada por modo.
            </p>
          </div>
          {!loading && !error && (
            <span className="t-xs text-3" style={{ fontFamily: 'var(--font-mono)' }}>
              {filtered.length} / {brawlers.length} brawlers
            </span>
          )}
        </div>

        {/* ── Barra de filtros ── */}
        <div className="card mb-6">
          <div style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="form-input"
              placeholder="Buscar brawler..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <select
              className="form-select"
              value={rarityF}
              onChange={e => setRarityF(e.target.value)}
              style={{ width: 'auto', minWidth: 160, padding: '10px 14px' }}
            >
              {rarityOptions.map(r => (
                <option key={r} value={r}>{r === 'all' ? 'Todas las rarezas' : r}</option>
              ))}
            </select>
            <select
              className="form-select"
              value={modeF}
              onChange={e => setModeF(e.target.value)}
              style={{ width: 'auto', minWidth: 160, padding: '10px 14px' }}
            >
              <option value="all">Todos los modos</option>
              {MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={resetFilters}
              disabled={search === '' && rarityF === 'all' && modeF === 'all'}
            >
              Reset filtros
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div
            className="alert alert-error mb-4"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s3)' }}
          >
            <span>No se pudieron cargar los brawlers: {error}</span>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="grid cols-4" style={{ gap: 'var(--s5)' }}>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (!error && filtered.length === 0) ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
            <h3 style={{ color: 'var(--text-1)', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
              Sin resultados
            </h3>
            <p className="t-sm text-3">
              No hay brawlers con esos filtros. Prueba a reiniciar la búsqueda.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetFilters}
              style={{ marginTop: 'var(--s4)' }}
            >
              Reset filtros
            </button>
          </div>
        ) : (
          <div className="grid cols-4" style={{ gap: 'var(--s5)' }}>
            {filtered.map(b => (
              <BrawlerCard
                key={b.id ?? b.name}
                brawler={b}
                onClick={() => setSelectedId(b.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Panel lateral ── */}
      {selectedBrawler && (
        <BuildPanel brawler={selectedBrawler} onClose={closePanel} />
      )}
    </Layout>
  );
}
