import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Palette, Save, RotateCcw, Eye, EyeOff,
  Globe, MessageCircle, Youtube, Phone, Type, Sparkles,
  Sun, Zap, Flame, Droplets, Star, Gem, Moon, Wind,
  Check, ChevronDown, ChevronUp, Monitor
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { applyThemeVars, clearThemeVars, useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToHslString(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslStringToHex(hslStr) {
  if (!hslStr) return '#000000';
  const parts = hslStr.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return '#000000';
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) {
    const v = Math.round(l * 255).toString(16).padStart(2, '0');
    return `#${v}${v}${v}`;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r2 = Math.round(hue2rgb(p, q, h + 1 / 3) * 255).toString(16).padStart(2, '0');
  const g2 = Math.round(hue2rgb(p, q, h) * 255).toString(16).padStart(2, '0');
  const b2 = Math.round(hue2rgb(p, q, h - 1 / 3) * 255).toString(16).padStart(2, '0');
  return `#${r2}${g2}${b2}`;
}

function buildThemeVars(hue, sat = 100, primaryLit = 50) {
  const s = sat;
  const bgS = s > 0 ? Math.min(100, s) : 0;
  return {
    background: `${hue} ${bgS}% 2%`,
    foreground: `${hue} ${s}% ${primaryLit}%`,
    card: `${hue} ${bgS}% 4%`,
    'card-foreground': `${hue} ${s}% ${primaryLit}%`,
    popover: `${hue} ${bgS}% 3%`,
    'popover-foreground': `${hue} ${s}% ${primaryLit}%`,
    primary: `${hue} ${s}% ${primaryLit}%`,
    'primary-foreground': `${hue} ${bgS}% 2%`,
    secondary: `${hue} ${Math.round(s * 0.5)}% 8%`,
    'secondary-foreground': `${hue} ${s}% ${primaryLit}%`,
    muted: `${hue} ${Math.round(s * 0.3)}% 10%`,
    'muted-foreground': `${hue} ${Math.round(s * 0.5)}% 40%`,
    accent: `${hue} ${s}% ${Math.max(30, primaryLit - 10)}%`,
    'accent-foreground': `${hue} ${bgS}% 2%`,
    border: `${hue} ${s}% 20%`,
    input: `${hue} ${Math.round(s * 0.5)}% 15%`,
    ring: `${hue} ${s}% ${primaryLit}%`,
    'sidebar-background': `${hue} ${bgS}% 3%`,
    'sidebar-foreground': `${hue} ${s}% ${primaryLit}%`,
    'sidebar-primary': `${hue} ${s}% ${primaryLit}%`,
    'sidebar-primary-foreground': `${hue} ${bgS}% 2%`,
    'sidebar-accent': `${hue} ${Math.round(s * 0.5)}% 10%`,
    'sidebar-accent-foreground': `${hue} ${s}% ${primaryLit}%`,
    'sidebar-border': `${hue} ${s}% 15%`,
    'sidebar-ring': `${hue} ${s}% ${primaryLit}%`,
  };
}

// ─── Preset Themes ────────────────────────────────────────────────────────────

const PRESETS = [
  { id: 'neon-green',     name: 'Neon Green',     hue: 120, sat: 100, lit: 50, icon: Zap,         swatch: '#00ff00' },
  { id: 'cyber-red',      name: 'Cyber Red',       hue: 0,   sat: 100, lit: 55, icon: Flame,       swatch: '#ff3333' },
  { id: 'ocean-blue',     name: 'Ocean Blue',      hue: 210, sat: 100, lit: 60, icon: Droplets,    swatch: '#3399ff' },
  { id: 'solar-yellow',   name: 'Solar Yellow',    hue: 48,  sat: 100, lit: 55, icon: Sun,         swatch: '#ffd11a' },
  { id: 'royal-purple',   name: 'Royal Purple',    hue: 270, sat: 80,  lit: 65, icon: Gem,         swatch: '#b366ff' },
  { id: 'sunset-orange',  name: 'Sunset Orange',   hue: 25,  sat: 100, lit: 60, icon: Sparkles,    swatch: '#ff7733' },
  { id: 'hot-pink',       name: 'Hot Pink',        hue: 320, sat: 100, lit: 60, icon: Star,        swatch: '#ff33cc' },
  { id: 'emerald-teal',   name: 'Emerald Teal',    hue: 165, sat: 100, lit: 45, icon: Wind,        swatch: '#00cc88' },
  { id: 'gold',           name: 'Gold',            hue: 42,  sat: 100, lit: 50, icon: Star,        swatch: '#cc9900' },
  { id: 'stealth-gray',   name: 'Stealth Gray',    hue: 0,   sat: 0,   lit: 70, icon: Moon,        swatch: '#b3b3b3' },
  { id: 'ice-blue',       name: 'Ice Blue',        hue: 195, sat: 100, lit: 65, icon: Droplets,    swatch: '#33ddff' },
  { id: 'lime',           name: 'Lime Green',      hue: 85,  sat: 100, lit: 50, icon: Zap,         swatch: '#55ff00' },
];

const CUSTOM_PARTS = [
  { key: 'primary',     label: 'Primary / Accent', desc: 'Main accent color — buttons, highlights, glow' },
  { key: 'background',  label: 'Page Background',  desc: 'The darkest background color' },
  { key: 'card',        label: 'Card Background',  desc: 'Cards, panels, and containers' },
  { key: 'sidebar-background', label: 'Sidebar Background', desc: 'Left sidebar panel' },
  { key: 'foreground',  label: 'Text Color',       desc: 'Main text and foreground elements' },
  { key: 'border',      label: 'Border Color',     desc: 'Card borders and dividers' },
  { key: 'muted-foreground', label: 'Muted Text',  desc: 'Secondary / dimmed text' },
];

// ─── ColorSwatch ─────────────────────────────────────────────────────────────

function ColorSwatch({ label, desc, hslValue, onChange }) {
  const hex = hslStringToHex(hslValue || '0 0% 0%');
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/10 bg-black/20 hover:border-primary/30 transition-colors">
      <label className="relative cursor-pointer flex-shrink-0">
        <input
          type="color"
          value={hex}
          onChange={e => onChange(hexToHslString(e.target.value))}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          data-testid={`color-picker-${label.replace(/\s+/g, '-').toLowerCase()}`}
        />
        <div
          className="w-10 h-10 rounded-lg border-2 border-white/20 shadow-lg"
          style={{ background: `hsl(${hslValue || '0 0% 0%'})` }}
        />
      </label>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate">{label}</div>
        <div className="text-xs text-gray-500 truncate">{desc}</div>
      </div>
      <div className="text-xs font-mono text-gray-600 flex-shrink-0">{hex.toUpperCase()}</div>
    </div>
  );
}

// ─── PresetCard ───────────────────────────────────────────────────────────────

function PresetCard({ preset, selected, onSelect }) {
  const vars = buildThemeVars(preset.hue, preset.sat, preset.lit);
  const bg = `hsl(${vars.background})`;
  const primary = `hsl(${vars.primary})`;
  const card = `hsl(${vars.card})`;
  const border = `hsl(${vars.border})`;

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(preset)}
      data-testid={`theme-preset-${preset.id}`}
      className={`relative rounded-xl p-3 border-2 transition-all text-left w-full ${selected ? 'border-white/60 shadow-lg' : 'border-white/10 hover:border-white/30'}`}
      style={{ background: bg }}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: primary }}>
          <Check className="w-3 h-3" style={{ color: bg }} />
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: card, border: `1px solid ${border}` }}>
          <preset.icon className="w-4 h-4" style={{ color: primary }} />
        </div>
        <span className="text-xs font-bold" style={{ color: primary }}>{preset.name}</span>
      </div>
      <div className="flex gap-1">
        {[vars.primary, vars.border, vars.muted, vars['muted-foreground']].map((c, i) => (
          <div key={i} className="flex-1 h-2 rounded-full" style={{ background: `hsl(${c})` }} />
        ))}
      </div>
    </motion.button>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-primary/20 rounded-xl overflow-hidden bg-black/30 backdrop-blur-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="p-4 pt-0 border-t border-primary/10">{children}</div>}
    </div>
  );
}

// ─── Key Gate ─────────────────────────────────────────────────────────────────

function KeyGate({ onUnlock }) {
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const verify = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setError('');
    try {
      const token = localStorage.getItem('jwt_token');
      const res = await fetch('/api/superadmin/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('sa_verified', '1');
        onUnlock();
      } else {
        setError(data.message || 'Invalid key');
        setKey('');
      }
    } catch (_) {
      setError('Network error — try again');
    } finally { setVerifying(false); }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm border border-yellow-500/30 rounded-2xl bg-black/60 backdrop-blur-sm p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-yellow-400" />
          </div>
          <h2 className="text-lg font-display font-bold text-yellow-400">Superadmin Access</h2>
          <p className="text-xs text-gray-500 font-mono">Enter your superadmin key to continue</p>
        </div>

        <form onSubmit={verify} className="space-y-4">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={key}
              onChange={e => { setKey(e.target.value); setError(''); }}
              placeholder="Enter superadmin key…"
              autoFocus
              data-testid="input-superadmin-key"
              className="w-full bg-black/40 border border-yellow-500/20 focus:border-yellow-500/60 rounded-lg px-4 py-3 text-sm font-mono outline-none transition-colors pr-10"
            />
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 font-mono text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={verifying || !key}
            data-testid="btn-verify-key"
            className="w-full py-2.5 rounded-lg bg-yellow-500 text-black text-sm font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50"
          >
            {verifying ? 'Verifying…' : 'Unlock'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SuperAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshTheme } = useTheme();

  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('sa_verified') === '1');
  const [settings, setSettings] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [themeVars, setThemeVars] = useState({});
  const [branding, setBranding] = useState({ siteName: '', siteTagline: '' });
  const [social, setSocial] = useState({ whatsappChannel: '', whatsappGroup: '', youtube: '', supportPhone: '', supportPhoneDisplay: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(true);

  const token = () => localStorage.getItem('jwt_token');

  useEffect(() => {
    if (!user?.isSuperAdmin) { navigate('/overview'); return; }
    if (unlocked) fetchSettings();
    else setLoading(false);
  }, [user, unlocked]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/site-settings');
      const data = await res.json();
      if (data.success) {
        const s = data.settings;
        setSettings(s);
        setThemeVars(s.themeVars || {});
        setSelectedPreset(s.theme || 'neon-green');
        setBranding({ siteName: s.siteName || '', siteTagline: s.siteTagline || '' });
        setSocial({
          whatsappChannel: s.whatsappChannel || '',
          whatsappGroup: s.whatsappGroup || '',
          youtube: s.youtube || '',
          supportPhone: s.supportPhone || '',
          supportPhoneDisplay: s.supportPhoneDisplay || '',
        });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Could not load settings', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const applyPreset = useCallback((preset) => {
    const vars = buildThemeVars(preset.hue, preset.sat, preset.lit);
    setSelectedPreset(preset.id);
    setThemeVars(vars);
    if (preview) applyThemeVars(vars);
  }, [preview]);

  const updateVar = useCallback((key, value) => {
    setThemeVars(prev => {
      const next = { ...prev, [key]: value };
      if (preview) applyThemeVars({ [key]: value });
      return next;
    });
  }, [preview]);

  const togglePreview = () => {
    if (preview) {
      clearThemeVars();
      setPreview(false);
    } else {
      applyThemeVars(themeVars);
      setPreview(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        theme: selectedPreset,
        themeVars,
        siteName: branding.siteName,
        siteTagline: branding.siteTagline,
        ...social,
      };
      const res = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        await refreshTheme();
        toast({ title: 'Saved!', description: 'Site settings updated successfully.' });
      } else {
        toast({ title: 'Error', description: data.message || 'Save failed', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!confirm('Reset theme to default Neon Green?')) return;
    const defaultPreset = PRESETS.find(p => p.id === 'neon-green');
    applyPreset(defaultPreset);
    try {
      await fetch('/api/superadmin/reset-theme', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
      });
      await refreshTheme();
      toast({ title: 'Reset', description: 'Theme reset to default.' });
    } catch (_) {}
  };

  if (!unlocked) {
    return <KeyGate onUnlock={() => setUnlocked(true)} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-24" data-testid="superadmin-page">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Superadmin Panel
          </h1>
          <p className="text-sm text-gray-500 font-mono mt-0.5">Full site customization & theming</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={togglePreview}
            data-testid="btn-toggle-preview"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${preview ? 'border-primary/40 text-primary bg-primary/10' : 'border-gray-600 text-gray-400 hover:border-gray-400'}`}
          >
            {preview ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Live Preview {preview ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Theme Presets */}
      <Section title="Theme Presets" icon={Palette} defaultOpen>
        <p className="text-xs text-gray-500 font-mono mb-4">Click a preset to instantly switch the full color palette.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {PRESETS.map(preset => (
            <PresetCard
              key={preset.id}
              preset={preset}
              selected={selectedPreset === preset.id}
              onSelect={applyPreset}
            />
          ))}
        </div>
      </Section>

      {/* Custom Colors */}
      <Section title="Custom Colors" icon={Sparkles} defaultOpen>
        <p className="text-xs text-gray-500 font-mono mb-4">Fine-tune individual color parts. Changes preview live if Live Preview is on.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CUSTOM_PARTS.map(part => (
            <ColorSwatch
              key={part.key}
              label={part.label}
              desc={part.desc}
              hslValue={themeVars[part.key] || ''}
              onChange={val => updateVar(part.key, val)}
            />
          ))}
        </div>

        {/* Color preview strip */}
        <div className="mt-4 rounded-lg overflow-hidden h-8 flex">
          {CUSTOM_PARTS.slice(0, 6).map(p => (
            <div key={p.key} className="flex-1" style={{ background: `hsl(${themeVars[p.key] || '0 0% 20%'})` }} title={p.label} />
          ))}
        </div>
      </Section>

      {/* Mini UI Preview */}
      <Section title="UI Preview" icon={Monitor} defaultOpen={false}>
        <p className="text-xs text-gray-500 font-mono mb-4">Preview how the current theme looks on common elements.</p>
        <div
          className="rounded-xl p-4 border space-y-3"
          style={{
            background: `hsl(${themeVars.background || '120 100% 2%'})`,
            borderColor: `hsl(${themeVars.border || '120 100% 20%'})`,
          }}
        >
          <div
            className="rounded-lg p-3 border"
            style={{
              background: `hsl(${themeVars.card || '120 100% 4%'})`,
              borderColor: `hsl(${themeVars.border || '120 100% 20%'})`,
            }}
          >
            <div className="text-sm font-bold mb-1" style={{ color: `hsl(${themeVars.primary || '120 100% 50%'})` }}>Sample Card Title</div>
            <div className="text-xs" style={{ color: `hsl(${themeVars['muted-foreground'] || '120 50% 40%'})` }}>This is how secondary text looks inside a card.</div>
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-1.5 rounded-lg text-xs font-bold"
              style={{
                background: `hsl(${themeVars.primary || '120 100% 50%'})`,
                color: `hsl(${themeVars['primary-foreground'] || '120 100% 2%'})`,
              }}
            >Primary Button</button>
            <button
              className="px-4 py-1.5 rounded-lg text-xs font-bold border"
              style={{
                borderColor: `hsl(${themeVars.border || '120 100% 20%'})`,
                color: `hsl(${themeVars.foreground || '120 100% 50%'})`,
                background: `hsl(${themeVars.secondary || '120 50% 8%'})`,
              }}
            >Secondary</button>
          </div>
          <div
            className="text-xs font-mono px-2 py-1 rounded border"
            style={{
              borderColor: `hsl(${themeVars.border || '120 100% 20%'})`,
              color: `hsl(${themeVars['muted-foreground'] || '120 50% 40%'})`,
              background: 'transparent',
            }}
          >Status: <span style={{ color: `hsl(${themeVars.primary || '120 100% 50%'})` }}>running</span></div>
        </div>
      </Section>

      {/* Branding */}
      <Section title="Site Branding" icon={Type} defaultOpen>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-mono text-gray-400 block mb-1">Site Name</label>
            <input
              type="text"
              value={branding.siteName}
              onChange={e => setBranding(b => ({ ...b, siteName: e.target.value }))}
              placeholder="wolfXnode"
              maxLength={60}
              data-testid="input-site-name"
              className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 text-sm font-mono focus:border-primary/60 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-gray-400 block mb-1">Tagline</label>
            <input
              type="text"
              value={branding.siteTagline}
              onChange={e => setBranding(b => ({ ...b, siteTagline: e.target.value }))}
              placeholder="Deploy bots in seconds"
              maxLength={120}
              data-testid="input-site-tagline"
              className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 text-sm font-mono focus:border-primary/60 outline-none transition-colors"
            />
          </div>
        </div>
      </Section>

      {/* Social Links */}
      <Section title="Social & Support Links" icon={Globe} defaultOpen={false}>
        <div className="space-y-3">
          {[
            { key: 'whatsappChannel', label: 'WhatsApp Channel', icon: MessageCircle, placeholder: 'https://whatsapp.com/channel/...' },
            { key: 'whatsappGroup', label: 'WhatsApp Group', icon: MessageCircle, placeholder: 'https://chat.whatsapp.com/...' },
            { key: 'youtube', label: 'YouTube Channel', icon: Youtube, placeholder: 'https://www.youtube.com/@...' },
            { key: 'supportPhone', label: 'Support Link (wa.me)', icon: Phone, placeholder: 'https://wa.me/254...' },
            { key: 'supportPhoneDisplay', label: 'Support Phone (display)', icon: Phone, placeholder: '+254 700 000 000' },
          ].map(({ key, label, icon: Icon, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-mono text-gray-400 flex items-center gap-1.5 mb-1">
                <Icon className="w-3 h-3" /> {label}
              </label>
              <input
                type="text"
                value={social[key]}
                onChange={e => setSocial(s => ({ ...s, [key]: e.target.value }))}
                placeholder={placeholder}
                data-testid={`input-social-${key}`}
                className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 text-sm font-mono focus:border-primary/60 outline-none transition-colors"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/20 bg-black/90 backdrop-blur-md px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="text-xs font-mono text-gray-500">
            Theme: <span className="text-primary">{PRESETS.find(p => p.id === selectedPreset)?.name || selectedPreset || 'Custom'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              data-testid="btn-reset-theme"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-600 text-gray-400 text-xs font-mono hover:border-gray-400 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Default
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              data-testid="btn-save-settings"
              className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg bg-primary text-black text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
