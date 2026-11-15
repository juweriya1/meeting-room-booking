import { useState, useMemo, useRef, useEffect } from 'react';
import { getTimezoneDisplayInfo } from '../types';
import {
  CANONICAL_TIMEZONES,
  getOffsetMinutes,
  formatOffsetString,
  type CanonicalTimezone,
} from '../canonicalTimezones';

interface Props {
  currentTimeZone: string;
  onSelectTimeZone: (tz: string) => void;
}

interface EnrichedZone extends CanonicalTimezone {
  mins: number;
  offsetStr: string;
}

export default function TimezoneSelector({ currentTimeZone, onSelectTimeZone }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const localTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    []
  );

  const sortedZones = useMemo<EnrichedZone[]>(() => {
    return CANONICAL_TIMEZONES.map((zone) => {
      const mins = getOffsetMinutes(zone.iana);
      return {
        ...zone,
        mins,
        offsetStr: formatOffsetString(mins),
      };
    }).sort((a, b) => a.mins - b.mins);
  }, []);

  const currentInfo = useMemo(
    () => getTimezoneDisplayInfo(currentTimeZone),
    [currentTimeZone]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredZones = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedZones;
    return sortedZones.filter(
      (z) =>
        z.label.toLowerCase().includes(q) ||
        z.cities.toLowerCase().includes(q) ||
        z.iana.toLowerCase().includes(q) ||
        z.offsetStr.toLowerCase().includes(q)
    );
  }, [search, sortedZones]);

  const handleSelect = (tz: string) => {
    onSelectTimeZone(tz);
    setIsOpen(false);
    setSearch('');
  };

  const renderZoneRow = (
    iana: string,
    offsetDisplay: string,
    title: string,
    subtitle?: string
  ) => {
    const isSelected = iana === currentTimeZone;
    return (
      <div
        key={iana}
        onClick={() => handleSelect(iana)}
        style={{
          padding: '.45rem .85rem',
          fontSize: '.85rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: isSelected ? '#eff6ff' : 'transparent',
          color: isSelected ? 'var(--primary)' : 'var(--text)',
          borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = isSelected ? '#eff6ff' : '#f8fafc')}
        onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? '#eff6ff' : 'transparent')}
      >
        <div style={{ flex: 1, minWidth: 0, paddingRight: '.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '.8rem', color: 'var(--muted)' }}>
              {offsetDisplay}
            </span>
            <span style={{ fontWeight: isSelected ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </span>
          </div>
          {subtitle && (
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
              {subtitle}
            </div>
          )}
        </div>
        {isSelected && <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span>}
      </div>
    );
  };

  return (
    <div ref={popoverRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="btn-ghost"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '.45rem',
          fontSize: '.85rem',
          padding: '.35rem .75rem',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          fontWeight: 500,
        }}
        title="Click to change viewing timezone"
      >
        <span>🌐</span>
        <span>Times in: <strong>{currentInfo.label}</strong></span>
        <span style={{ fontSize: '.7rem', color: 'var(--muted)', marginLeft: '.2rem' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '400px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Search Box */}
          <div style={{ padding: '.6rem .75rem', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="🔍 Search any city, country, or offset (e.g. Cairo, Munich, Doha)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                fontSize: '.85rem',
                padding: '.4rem .65rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--surface)',
                outline: 'none',
              }}
            />
          </div>

          {/* Timezone List */}
          <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '.3rem 0' }}>
            {search.trim() ? (
              filteredZones.length > 0 ? (
                filteredZones.map((z) =>
                  renderZoneRow(z.iana, z.offsetStr, z.label, z.cities)
                )
              ) : (
                <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--muted)', fontSize: '.85rem' }}>
                  No timezones matching "{search}"
                </div>
              )
            ) : (
              <>
                {/* Quick Select */}
                <div style={{ padding: '.35rem .85rem .2rem', fontSize: '.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em' }}>
                  Quick Select
                </div>
                {renderZoneRow(
                  localTz,
                  formatOffsetString(getOffsetMinutes(localTz)),
                  `Your Local Time (${localTz.replace(/_/g, ' ')})`,
                  'Detected from browser'
                )}
                {localTz !== 'UTC' && (
                  renderZoneRow(
                    'UTC',
                    'UTC+00:00',
                    'Coordinated Universal Time (UTC)',
                    'Baseline Zulu / GMT'
                  )
                )}

                {/* World Offsets */}
                <div style={{ padding: '.55rem .85rem .2rem', fontSize: '.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', borderTop: '1px solid var(--border)', marginTop: '.3rem' }}>
                  World Timezones (36 Offsets)
                </div>
                {filteredZones.map((z) =>
                  renderZoneRow(z.iana, z.offsetStr, z.label, z.cities)
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
