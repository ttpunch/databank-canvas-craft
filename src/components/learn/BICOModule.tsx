import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Copy, Check, ArrowRight, Zap, RotateCcw, Info } from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const parameters = [
  { num: 'p0840', type: 'BI', rw: 'p', name: 'ON/OFF1',           desc: 'Enable/disable drive. 1 = run, 0 = coast stop',              access: 1 },
  { num: 'p0844', type: 'BI', rw: 'p', name: '1st OFF2',          desc: 'Coast stop. Keep = 1 in normal operation',                   access: 1 },
  { num: 'p0848', type: 'BI', rw: 'p', name: '1st OFF3',          desc: 'Quick stop. Keep = 1 in normal operation',                   access: 1 },
  { num: 'p0852', type: 'BI', rw: 'p', name: 'Enable operation',  desc: 'Allow drive to accept setpoint and run',                     access: 1 },
  { num: 'p1070', type: 'CI', rw: 'p', name: 'Main setpoint',     desc: 'Speed or torque setpoint source (normalised)',               access: 1 },
  { num: 'p1071', type: 'CI', rw: 'p', name: 'Setpoint scaling',  desc: 'Multiplier applied to main setpoint',                        access: 2 },
  { num: 'p1075', type: 'CI', rw: 'p', name: 'Add. setpoint',     desc: 'Added on top of main setpoint',                             access: 2 },
  { num: 'p0700', type: '-',  rw: 'p', name: 'Command source',    desc: '0=Terminal, 2=USS, 4=PROFIBUS, 5=CANopen, 6=PROFINET',       access: 1 },
  { num: 'p1000', type: '-',  rw: 'p', name: 'Setpoint source',   desc: '0=JOG, 1=MOP, 2=Analog, 4=USS, 6=PROFINET',                 access: 1 },
  { num: 'p0730', type: 'BO', rw: 'p', name: 'Digital output 0',  desc: 'Assign a BO source to relay/transistor output DO0',          access: 1 },
  { num: 'p2051', type: 'CI', rw: 'p', name: 'PZD send word [n]', desc: 'Maps a CO signal → fieldbus process data word',              access: 2 },
  { num: 'r0722', type: 'BO', rw: 'r', name: 'DI status word',    desc: 'r0722.0=DI0 … r0722.5=DI5. Reflects terminal state',        access: 0 },
  { num: 'r0755', type: 'CO', rw: 'r', name: 'Analog input [0]',  desc: 'AI0 value normalised: 4000h = 100 % = max speed',           access: 0 },
  { num: 'r0052', type: 'BO', rw: 'r', name: 'Status word 1',     desc: 'ZSW1: .0=ready .2=op-enabled .3=fault .11=f_reached',       access: 0 },
  { num: 'r0053', type: 'BO', rw: 'r', name: 'Status word 2',     desc: 'ZSW2: additional drive status bits',                        access: 0 },
  { num: 'r2090', type: 'BO', rw: 'r', name: 'Fieldbus CTW bits', desc: 'Control word bits from PROFIBUS/PROFINET PLC',               access: 0 },
  { num: 'r2050', type: 'CO', rw: 'r', name: 'Fieldbus PZD [n]',  desc: 'Process data words received from PLC (r2050[0]=CTW…)',      access: 0 },
  { num: 'r0021', type: 'CO', rw: 'r', name: 'Actual speed',      desc: 'Motor speed in rpm (filtered)',                             access: 0 },
  { num: 'r0024', type: 'CO', rw: 'r', name: 'Output frequency',  desc: 'Stator output frequency in Hz',                            access: 0 },
  { num: 'r0025', type: 'CO', rw: 'r', name: 'Output voltage',    desc: 'Actual output voltage (V)',                                 access: 0 },
  { num: 'r0027', type: 'CO', rw: 'r', name: 'Output current',    desc: 'Actual motor current (A)',                                  access: 0 },
];

const accessLevels = [
  { level: 1, name: 'Standard',  color: '#34d399', desc: 'Basic everyday commissioning' },
  { level: 2, name: 'Extended',  color: '#60a5fa', desc: 'Advanced application tuning' },
  { level: 3, name: 'Expert',    color: '#fbbf24', desc: 'Firmware internals – caution' },
  { level: 4, name: 'Service',   color: '#f87171', desc: 'Siemens service only – locked' },
];

const recipes = [
  {
    title: 'Digital Input → ON/OFF1',
    desc: 'Start/stop drive from terminal DI0',
    code: 'p0840 = r0722.0',
    tags: ['Terminal', 'Basic'],
    color: 'blue',
  },
  {
    title: 'Analog Input → Speed Setpoint',
    desc: '0–10 V on AI0 maps to 0 → max speed',
    code: 'p1070 = r0755[0]',
    tags: ['Terminal', 'Analog'],
    color: 'green',
  },
  {
    title: 'PROFINET → Enable + Setpoint',
    desc: 'PLC controls ON and speed via fieldbus',
    code: 'p0840 = r2090.0\np1070 = r2050[1]',
    tags: ['PROFINET', 'PLC'],
    color: 'purple',
  },
  {
    title: 'Fault → Digital Output',
    desc: 'Drive fault status drives relay DO0',
    code: 'p0730.0 = r0052.3',
    tags: ['Terminal', 'Diagnostic'],
    color: 'red',
  },
  {
    title: 'Speed Reached → PLC Feedback',
    desc: '"At setpoint" bit back to PLC via fieldbus',
    code: 'p2051[0] = r0052.11',
    tags: ['PROFINET', 'Feedback'],
    color: 'orange',
  },
  {
    title: 'Keep OFF2 / OFF3 inactive',
    desc: 'Wire to constant-1 so they never trip in normal run',
    code: 'p0844 = 1  (fixed 1)\np0848 = 1  (fixed 1)',
    tags: ['Safety', 'Basic'],
    color: 'yellow',
  },
];

// Wiring sim data
const wiringSources = [
  { id: 'r0722.0', label: 'r0722.0', name: 'DI0 – Digital Input 0',     type: 'BO' },
  { id: 'r0722.1', label: 'r0722.1', name: 'DI1 – Digital Input 1',     type: 'BO' },
  { id: 'r0722.2', label: 'r0722.2', name: 'DI2 – Digital Input 2',     type: 'BO' },
  { id: 'r0755[0]',label: 'r0755[0]',name: 'AI0 – Analog Input 0',      type: 'CO' },
  { id: 'r2090.0', label: 'r2090.0', name: 'Fieldbus CTW bit 0',         type: 'BO' },
  { id: 'r2050[1]',label: 'r2050[1]',name: 'Fieldbus PZD word 1',        type: 'CO' },
  { id: 'r0052.3', label: 'r0052.3', name: 'Fault bit (ZSW1.3)',         type: 'BO' },
  { id: 'r0021',   label: 'r0021',   name: 'Actual speed (rpm)',          type: 'CO' },
];

const wiringDests = [
  { id: 'p0840',   label: 'p0840',    name: 'ON/OFF1 command',            type: 'BI' },
  { id: 'p0844',   label: 'p0844',    name: '1st OFF2 (coast stop)',       type: 'BI' },
  { id: 'p0848',   label: 'p0848',    name: '1st OFF3 (quick stop)',       type: 'BI' },
  { id: 'p0852',   label: 'p0852',    name: 'Enable operation',            type: 'BI' },
  { id: 'p1070',   label: 'p1070',    name: 'Main speed setpoint',         type: 'CI' },
  { id: 'p1075',   label: 'p1075',    name: 'Additional setpoint',         type: 'CI' },
  { id: 'p0730',   label: 'p0730.0',  name: 'Digital output 0',            type: 'BI' },
  { id: 'p2051[0]',label: 'p2051[0]', name: 'PZD send word 1 (→ PLC)',    type: 'CI' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const typeColors: Record<string, string> = {
  BI: '#60a5fa', BO: '#818cf8', CI: '#34d399', CO: '#4ade80', '-': '#94a3b8',
};

const recipeColors: Record<string, string> = {
  blue: '#3b82f6', green: '#22c55e', purple: '#a855f7',
  red: '#ef4444', orange: '#f97316', yellow: '#eab308',
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold leading-none"
      style={{ background: typeColors[type] + '22', color: typeColors[type] }}
    >
      {type}
    </span>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ParameterBrowser() {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = parameters.filter(p => {
    const q = query.toLowerCase();
    const matchQ = !q || p.num.includes(q) || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
    const matchT = filterType === 'all' || p.type === filterType || (filterType === 'rw-p' && p.rw === 'p') || (filterType === 'rw-r' && p.rw === 'r');
    return matchQ && matchT;
  });

  return (
    <div className="space-y-4">
      {/* Access level legend */}
      <div className="flex flex-wrap gap-2 mb-2">
        {accessLevels.map(al => (
          <div key={al.level} className="flex items-center gap-1.5 rounded-md border border-border/50 px-2.5 py-1.5 bg-card">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: al.color }} />
            <span className="text-xs font-semibold">Level {al.level}</span>
            <span className="text-xs text-muted-foreground">{al.name} — {al.desc}</span>
          </div>
        ))}
      </div>

      {/* p vs r explainer */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-mono font-bold text-blue-400">p</span>
              <span className="text-sm font-semibold">Parameters (writable)</span>
            </div>
            <p className="text-xs text-muted-foreground">Settable values — drive configuration, BICO destinations. Stored in EEPROM. Changed via STARTER, TIA Portal, or keypad.</p>
            <div className="mt-2 flex gap-1">
              <TypeBadge type="BI" /><TypeBadge type="CI" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-mono font-bold text-green-400">r</span>
              <span className="text-sm font-semibold">Read-only (signal sources)</span>
            </div>
            <p className="text-xs text-muted-foreground">Live drive signals — inputs, status words, actual values. These are BICO sources you assign into p-parameters.</p>
            <div className="mt-2 flex gap-1">
              <TypeBadge type="BO" /><TypeBadge type="CO" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search parameter…" value={query} onChange={e => setQuery(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
        {(['all','BI','CI','BO','CO','rw-p','rw-r'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterType(f)}
            className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${filterType === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
          >
            {f === 'rw-p' ? 'p-params' : f === 'rw-r' ? 'r-params' : f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border/60">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground w-24">Param</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground w-16">Type</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Name</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground hidden md:table-cell">Description</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground w-16">Level</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((p, i) => (
                <motion.tr
                  key={p.num}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-3 py-2 font-mono text-xs font-semibold" style={{ color: p.rw === 'r' ? '#4ade80' : '#60a5fa' }}>{p.num}</td>
                  <td className="px-3 py-2"><TypeBadge type={p.type} /></td>
                  <td className="px-3 py-2 font-medium text-xs">{p.name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell">{p.desc}</td>
                  <td className="px-3 py-2">
                    <span className="text-xs font-bold" style={{ color: accessLevels[(p.access || 1) - 1]?.color ?? '#94a3b8' }}>
                      {p.access === 0 ? 'R/O' : p.access}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">No parameters match</div>
        )}
      </div>
    </div>
  );
}

function BICOConcept() {
  const [animated, setAnimated] = useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  const signals = [
    { src: 'BO', srcLabel: 'Binector Output', srcDesc: 'Digital signal (0 or 1)', dst: 'BI', dstLabel: 'Binector Input', dstDesc: 'p-param that receives 0/1', color: '#60a5fa', example: 'r0722.0 → p0840' },
    { src: 'CO', srcLabel: 'Connector Output', srcDesc: '16/32-bit value (speed, current…)', dst: 'CI', dstLabel: 'Connector Input', dstDesc: 'p-param that receives a value', color: '#34d399', example: 'r0755[0] → p1070' },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-bold text-foreground">BICO</span> (BInector COnnector) replaces hardwired terminal blocks with software connections.
            Instead of physically wiring a terminal to a function, you assign a <span className="text-green-400 font-mono">r-parameter</span> (signal source)
            into a <span className="text-blue-400 font-mono">p-parameter</span> (signal destination).
            A BICO assignment looks like: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">p0840 = r0722.0</code>
          </p>
        </CardContent>
      </Card>

      {signals.map((s, i) => (
        <motion.div
          key={s.src}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15 }}
        >
          <Card className="border-border/50 overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4" style={{ color: s.color }} />
                {s.src}/{s.dst} — {s.src === 'BO' ? 'Binary (Digital)' : 'Analog / Word'} signal
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Source */}
                <div className="rounded-lg border px-4 py-3 text-center w-full sm:w-44 flex-shrink-0" style={{ borderColor: s.color + '60', background: s.color + '10' }}>
                  <div className="text-lg font-bold font-mono mb-0.5" style={{ color: s.color }}>{s.src}</div>
                  <div className="text-xs font-semibold">{s.srcLabel}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{s.srcDesc}</div>
                </div>

                {/* Animated arrow */}
                <div className="flex-1 flex items-center gap-1 px-2">
                  <div className="h-px flex-1 bg-border/50" />
                  <motion.div
                    animate={animated ? { x: [0, 8, 0] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  >
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </motion.div>
                  <div className="h-px flex-1 bg-border/50" />
                </div>

                {/* Dest */}
                <div className="rounded-lg border px-4 py-3 text-center w-full sm:w-44 flex-shrink-0 border-border/50 bg-muted/20">
                  <div className="text-lg font-bold font-mono mb-0.5 text-foreground">{s.dst}</div>
                  <div className="text-xs font-semibold">{s.dstLabel}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{s.dstDesc}</div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Example:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono" style={{ color: s.color }}>{s.example}</code>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Indexing note */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p><span className="font-semibold text-yellow-400">Bit notation</span> — r0722<span className="text-yellow-300">.0</span> means bit 0 of r0722. The dot selects which bit to use as a BO.</p>
            <p><span className="font-semibold text-yellow-400">Index notation</span> — r0755<span className="text-yellow-300">[0]</span> means element 0 of indexed parameter r0755 (AI0). r0755[1] = AI1.</p>
            <p><span className="font-semibold text-yellow-400">Fixed values</span> — Assigning p0840 = 1 (constant) keeps ON/OFF1 permanently high without needing a terminal.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WiringSim() {
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null);
  const [wires, setWires] = useState<Record<string, string>>({});

  const handleSrcClick = (srcId: string) => {
    setSelectedSrc(prev => prev === srcId ? null : srcId);
  };

  const handleDestClick = (destId: string) => {
    if (!selectedSrc) return;
    setWires(prev => {
      const next = { ...prev };
      // Remove old wires to same dest or same src
      Object.keys(next).forEach(k => { if (next[k] === destId) delete next[k]; });
      next[selectedSrc] = destId;
      return next;
    });
    setSelectedSrc(null);
  };

  const removeWire = (srcId: string) => {
    setWires(prev => { const n = { ...prev }; delete n[srcId]; return n; });
  };

  const codeLines = Object.entries(wires).map(([src, dest]) => {
    const destParam = wiringDests.find(d => d.id === dest);
    return `${destParam?.label ?? dest} = ${src}`;
  });

  const boColor = '#818cf8';
  const coColor = '#34d399';

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">How to use:</span> Click a <span style={{ color: boColor }}>source</span> on the left, then click a <span className="text-blue-400">destination</span> on the right to create a BICO wire. Generated code appears below.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sources */}
        <div>
          <div className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Signal Sources (r-parameters)</div>
          <div className="space-y-1.5">
            {wiringSources.map(src => {
              const isSelected = selectedSrc === src.id;
              const isWired = src.id in wires;
              return (
                <motion.button
                  key={src.id}
                  onClick={() => handleSrcClick(src.id)}
                  whileTap={{ scale: 0.97 }}
                  className={`w-full text-left rounded-lg border px-3 py-2 transition-all text-xs ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-sm shadow-primary/20'
                      : isWired
                      ? 'border-green-500/40 bg-green-500/5'
                      : 'border-border/50 bg-card hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-semibold" style={{ color: src.type === 'CO' ? coColor : boColor }}>{src.label}</span>
                      <TypeBadge type={src.type} />
                      <div className="text-[10px] text-muted-foreground mt-0.5">{src.name}</div>
                    </div>
                    {isSelected && <span className="text-[10px] text-primary font-semibold">SELECT DEST →</span>}
                    {isWired && !isSelected && <span className="text-[10px] text-green-400">● wired</span>}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Destinations */}
        <div>
          <div className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Destinations (p-parameters)</div>
          <div className="space-y-1.5">
            {wiringDests.map(dest => {
              const connectedSrc = Object.entries(wires).find(([, d]) => d === dest.id)?.[0];
              const srcObj = wiringSources.find(s => s.id === connectedSrc);
              const isTarget = !!selectedSrc;
              return (
                <motion.button
                  key={dest.id}
                  onClick={() => handleDestClick(dest.id)}
                  whileTap={{ scale: 0.97 }}
                  disabled={!selectedSrc && !connectedSrc}
                  className={`w-full text-left rounded-lg border px-3 py-2 transition-all text-xs ${
                    connectedSrc
                      ? 'border-green-500/50 bg-green-500/5'
                      : isTarget
                      ? 'border-primary/40 bg-primary/5 hover:border-primary cursor-pointer'
                      : 'border-border/50 bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-semibold text-blue-400">{dest.label}</span>
                      {' '}<TypeBadge type={dest.type} />
                      <div className="text-[10px] text-muted-foreground mt-0.5">{dest.name}</div>
                    </div>
                    {connectedSrc && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-green-400">{connectedSrc}</span>
                        <button
                          onClick={e => { e.stopPropagation(); removeWire(connectedSrc); }}
                          className="text-muted-foreground hover:text-destructive p-0.5"
                        >×</button>
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Generated code */}
      <AnimatePresence>
        {codeLines.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-border/50 bg-muted/30">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-semibold flex items-center justify-between">
                  Generated BICO assignments
                  <button onClick={() => setWires({})} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Clear all
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <pre className="text-xs font-mono text-green-400 bg-black/30 rounded p-3 leading-relaxed">
                  {codeLines.join('\n')}
                </pre>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {codeLines.length === 0 && (
        <div className="text-center text-xs text-muted-foreground py-4 border border-dashed border-border/40 rounded-lg">
          No wires yet — click a source, then a destination
        </div>
      )}
    </div>
  );
}

function RecipeCards() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (code: string, title: string) => {
    navigator.clipboard.writeText(code);
    setCopied(title);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Common BICO assignments ready to use. Copy the code and enter it in STARTER / TIA Portal Startdrive parameter list.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {recipes.map((r, i) => (
          <motion.div key={r.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Card className="border-border/50 hover:border-border transition-colors h-full">
              <CardContent className="p-4 flex flex-col gap-2 h-full">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{r.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {r.tags.map(t => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-end gap-2 mt-auto pt-2">
                  <pre
                    className="flex-1 text-xs font-mono rounded p-2.5 leading-relaxed overflow-x-auto"
                    style={{ background: recipeColors[r.color] + '12', color: recipeColors[r.color], border: `1px solid ${recipeColors[r.color]}30` }}
                  >
                    {r.code}
                  </pre>
                  <button
                    onClick={() => copy(r.code, r.title)}
                    className="flex-shrink-0 p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {copied === r.title ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function BICOModule() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Parameters &amp; BICO Wiring</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Understand p/r parameters, access levels, and how to interconnect drive signals without hardware wiring.
        </p>
      </div>

      <Tabs defaultValue="params" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="params">Parameter Browser</TabsTrigger>
          <TabsTrigger value="bico">BICO Concept</TabsTrigger>
          <TabsTrigger value="sim">Wiring Simulator</TabsTrigger>
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
        </TabsList>

        <TabsContent value="params" className="space-y-0">
          <ParameterBrowser />
        </TabsContent>
        <TabsContent value="bico" className="space-y-0">
          <BICOConcept />
        </TabsContent>
        <TabsContent value="sim" className="space-y-0">
          <WiringSim />
        </TabsContent>
        <TabsContent value="recipes" className="space-y-0">
          <RecipeCards />
        </TabsContent>
      </Tabs>
    </div>
  );
}
