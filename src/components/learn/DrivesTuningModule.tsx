import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

// ─── Shared helpers ───────────────────────────────────────────────────────────
function ParamTable({ rows }: { rows: { p: string; name: string; range: string; tip: string; color?: string }[] }) {
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40 border-b border-border/60">
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-24">Parameter</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Name</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-28 hidden sm:table-cell">Range / Default</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground hidden md:table-cell">Tuning tip</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2 font-mono font-bold" style={{ color: r.color ?? '#60a5fa' }}>{r.p}</td>
              <td className="px-3 py-2 font-medium">{r.name}</td>
              <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{r.range}</td>
              <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{r.tip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InfoBox({ color, icon: Icon, title, children }: { color: string; icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border p-3" style={{ borderColor: color + '40', background: color + '08' }}>
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color }} />
      <div className="text-xs text-muted-foreground leading-relaxed">
        <span className="font-semibold" style={{ color }}>{title} </span>
        {children}
      </div>
    </div>
  );
}

// ─── Response Simulator (shared by VFD, Vector, Servo) ───────────────────────
function ResponseSimulator({
  color, label, kpLabel = 'Kp (proportional)', kiLabel = 'Ki (integral)',
  defaultKp = 50, defaultKi = 50,
}: { color: string; label: string; kpLabel?: string; kiLabel?: string; defaultKp?: number; defaultKi?: number }) {
  const [kp, setKp] = useState(defaultKp);
  const [ki, setKi] = useState(defaultKi);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += W / 10) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += H / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Setpoint step
    ctx.strokeStyle = '#334155';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(30, H * 0.2); ctx.lineTo(W - 10, H * 0.2); ctx.stroke();
    ctx.setLineDash([]);

    // Simulate second-order response
    const kpN = kp / 100;   // 0–1
    const kiN = ki / 100;   // 0–1

    // Natural frequency and damping ratio derived from sliders
    const wn = 0.5 + kpN * 3.5;       // higher Kp = faster response
    const zeta = 1.2 - kpN * 0.7 - kiN * 0.25; // higher Kp/Ki = less damping

    const points: [number, number][] = [];
    for (let px = 30; px < W - 10; px++) {
      const t = ((px - 30) / (W - 40)) * 5; // time 0–5s
      let y: number;
      if (zeta >= 1) {
        // Overdamped
        const r1 = -wn * (zeta - Math.sqrt(zeta * zeta - 1));
        const r2 = -wn * (zeta + Math.sqrt(zeta * zeta - 1));
        y = 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
      } else if (zeta > 0) {
        // Underdamped
        const wd = wn * Math.sqrt(1 - zeta * zeta);
        y = 1 - Math.exp(-zeta * wn * t) * (Math.cos(wd * t) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(wd * t));
      } else {
        // Oscillating (negative damping)
        const wd = wn * Math.sqrt(1 - Math.max(zeta, -0.5) ** 2);
        y = 1 - Math.exp(0.15 * wn * t) * Math.cos(wd * t) * 0.9;
      }
      y = Math.max(-0.2, Math.min(1.5, y));
      const pyVal = H * 0.2 + (1 - y) * H * 0.6;
      points.push([px, pyVal]);
    }

    // Draw response curve
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(30, H * 0.8);
    ctx.lineTo(30, points[0][1]);
    points.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#475569';
    ctx.font = '10px system-ui';
    ctx.fillText('Setpoint', W - 58, H * 0.18);
    ctx.fillText('Response', 35, points[0][1] - 6);

    // Quality indicator
    const finalVal = points[points.length - 1][1];
    const overshoot = Math.min(...points.map(p => p[1]));
    const overshootAmt = H * 0.2 - overshoot;
    const settled = Math.abs(finalVal - H * 0.2) < H * 0.04;

    let qual = '', qualColor = '';
    if (kp < 15) { qual = 'Too slow — increase Kp'; qualColor = '#f59e0b'; }
    else if (overshootAmt > H * 0.12 && zeta < 0.3) { qual = 'Oscillating — reduce Kp'; qualColor = '#ef4444'; }
    else if (zeta < 0.5 && overshootAmt > H * 0.04) { qual = 'Some overshoot — OK for many apps'; qualColor = '#f59e0b'; }
    else if (settled) { qual = 'Well tuned ✓'; qualColor = '#22c55e'; }
    else { qual = 'Adjust...'; qualColor = '#94a3b8'; }

    ctx.fillStyle = qualColor;
    ctx.font = 'bold 11px system-ui';
    ctx.fillText(qual, 35, H - 10);
  };

  useEffect(() => { draw(); }, [kp, ki]);

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="text-sm font-semibold">{label} — Response Simulator</div>
        <canvas ref={canvasRef} width={560} height={160} className="w-full rounded border border-border/40" style={{ maxWidth: '100%' }} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{kpLabel}</span>
              <span className="font-mono font-bold" style={{ color }}>{kp}</span>
            </div>
            <input type="range" min={5} max={100} value={kp} onChange={e => setKp(+e.target.value)}
              className="w-full h-1.5 rounded cursor-pointer accent-blue-500" />
            <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
              <span>Slow / sluggish</span><span>Fast / oscillates</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{kiLabel}</span>
              <span className="font-mono font-bold" style={{ color }}>{ki}</span>
            </div>
            <input type="range" min={5} max={100} value={ki} onChange={e => setKi(+e.target.value)}
              className="w-full h-1.5 rounded cursor-pointer accent-purple-500" />
            <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
              <span>Steady-state error</span><span>Wind-up / overshoot</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── VFD V/f Module ───────────────────────────────────────────────────────────
function VFDModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [boost, setBoost] = useState(5);
  const [mode, setMode] = useState<'linear' | 'quadratic' | 'eco'>('linear');

  const drawVf = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += W / 5) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += H / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Axes labels
    ctx.fillStyle = '#475569';
    ctx.font = '10px system-ui';
    ctx.fillText('0 Hz', 6, H - 4);
    ctx.fillText('50 Hz (base)', W - 76, H - 4);
    ctx.fillText('Voltage', 4, 14);

    // Nominal line (reference)
    ctx.strokeStyle = '#1e293b';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H * 0.1); ctx.lineTo(W, H * 0.1); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#334155';
    ctx.font = '9px system-ui';
    ctx.fillText('Rated V', W - 52, H * 0.1 - 3);

    // Curves
    const curves = [
      { m: 'linear',    label: 'Linear (standard)',   color: '#60a5fa' },
      { m: 'quadratic', label: 'Quadratic (fan/pump)', color: '#4ade80' },
      { m: 'eco',       label: 'ECO (energy saving)',  color: '#c084fc' },
    ];

    curves.forEach(({ m, color }) => {
      const isActive = m === mode;
      ctx.strokeStyle = isActive ? color : color + '30';
      ctx.lineWidth = isActive ? 2.5 : 1;
      ctx.beginPath();
      const boostPct = boost / 100;
      for (let px = 0; px < W; px++) {
        const f = px / W;  // 0–1 (0–50Hz)
        let v: number;
        if (m === 'linear') {
          v = boostPct * 0.3 + f * (1 - boostPct * 0.3);
        } else if (m === 'quadratic') {
          v = boostPct * 0.1 + f * f * (1 - boostPct * 0.1);
        } else {
          v = boostPct * 0.2 + Math.pow(f, 1.5) * (1 - boostPct * 0.2);
        }
        v = Math.min(1, v);
        const py = H * 0.1 + (1 - v) * H * 0.85;
        if (px === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      if (isActive) {
        // Label at end
        const f = 0.85;
        let v: number;
        if (m === 'linear') v = boostPct * 0.3 + f * (1 - boostPct * 0.3);
        else if (m === 'quadratic') v = boostPct * 0.1 + f * f;
        else v = boostPct * 0.2 + Math.pow(f, 1.5);
        v = Math.min(1, v);
        const py = H * 0.1 + (1 - v) * H * 0.85;
        ctx.fillStyle = color;
        ctx.font = 'bold 10px system-ui';
        ctx.fillText(label, W * 0.87 - 60, py - 6);
      }
    });
  };

  useEffect(() => { drawVf(); }, [boost, mode]);

  const vfdParams = [
    { p: 'p1300', name: 'Control mode',            range: '0 = V/f linear', tip: 'Start here. Change to 20 for vector control',      color: '#60a5fa' },
    { p: 'p1310', name: 'Continuous boost',         range: '0–250 %',        tip: 'Adds extra V at low speed for starting torque. Too high = overheating', color: '#60a5fa' },
    { p: 'p1311', name: 'Acceleration boost',       range: '0–250 %',        tip: 'Extra V during ramp-up only. Helps overcome static friction',          color: '#60a5fa' },
    { p: 'p1082', name: 'Max speed',               range: 'rpm',             tip: 'Limits maximum output frequency. Match to motor rating',               color: '#60a5fa' },
    { p: 'p1120', name: 'Ramp-up time',            range: 's (0–650)',       tip: 'Time to reach max speed from 0. Too fast = overcurrent trip',          color: '#60a5fa' },
    { p: 'p1121', name: 'Ramp-down time',          range: 's (0–650)',       tip: 'Time to decelerate. Too fast = overvoltage on DC bus',                 color: '#60a5fa' },
    { p: 'p0640', name: 'Current limit',           range: '% of rated',      tip: 'Limits output current. Protects motor. 150% typical',                  color: '#60a5fa' },
    { p: 'p1335', name: 'Slip compensation',       range: '0–100 %',         tip: 'Corrects speed droop under load. Set = 100% for good regulation',      color: '#60a5fa' },
  ];

  return (
    <div className="space-y-4">
      <InfoBox color="#60a5fa" icon={Info} title="V/f (scalar) control:">
        Simplest drive mode. Voltage and frequency are scaled together in a fixed ratio. No encoder needed.
        Good for fans, pumps, and conveyors where precise speed is not critical. Motor magnetisation is not actively controlled.
      </InfoBox>

      {/* V/f curve visualiser */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-semibold">V/f Curve Visualiser</div>
          <canvas ref={canvasRef} width={560} height={160} className="w-full rounded border border-border/40" style={{ maxWidth: '100%' }} />
          <div className="flex flex-wrap gap-2 items-center">
            {(['linear', 'quadratic', 'eco'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${mode === m ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                {m === 'linear' ? 'Linear' : m === 'quadratic' ? 'Quadratic (fan/pump)' : 'ECO'}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Boost:</span>
              <input type="range" min={0} max={30} value={boost} onChange={e => setBoost(+e.target.value)} className="w-24 accent-blue-500" />
              <span className="text-xs font-mono text-blue-400 w-8">{boost}%</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {mode === 'linear' && 'Standard: proportional V/Hz. Use for conveyors, machines needing constant torque across speed range.'}
            {mode === 'quadratic' && 'Quadratic: voltage follows f². Torque demand drops with speed. Ideal for centrifugal fans and pumps — saves 30–50% energy.'}
            {mode === 'eco' && 'ECO/energy saving: reduces flux at light loads. Good for variable torque loads but slow torque response.'}
          </div>
        </CardContent>
      </Card>

      <ResponseSimulator color="#60a5fa" label="V/f Ramp Response" kpLabel="Ramp steepness (p1120 inverse)" kiLabel="Boost level (p1310)" defaultKp={40} defaultKi={20} />

      <div className="text-sm font-semibold mt-2">Key Parameters</div>
      <ParamTable rows={vfdParams} />

      <InfoBox color="#f59e0b" icon={AlertTriangle} title="Common mistakes:">
        (1) Boost too high → motor overheats at low speed (current flows but no useful torque).
        (2) Ramp too short → overcurrent F30010 / F30011.
        (3) Ramp-down too short → overvoltage F30002 (regenerated energy charges DC bus).
        (4) Slip compensation off → speed drops under load.
      </InfoBox>
    </div>
  );
}

// ─── Vector FOC Module ────────────────────────────────────────────────────────
function VectorModule() {
  const [showEncoder, setShowEncoder] = useState(false);
  const [idIqAngle, setIdIqAngle] = useState(30);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawFOC = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.38;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    const angle = (idIqAngle * Math.PI) / 180;

    // d-q axes
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cx - r * 1.2, cy); ctx.lineTo(cx + r * 1.2, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 1.2); ctx.lineTo(cx, cy + r * 1.2); ctx.stroke();
    ctx.setLineDash([]);

    // Circle (stator flux magnitude)
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

    // Field labels
    ctx.fillStyle = '#475569';
    ctx.font = '10px system-ui';
    ctx.fillText('d-axis (flux)', cx + r * 0.05, cy - 8);
    ctx.fillText('q-axis (torque)', cx + 6, cy - r - 6);

    // Id vector (flux-producing, along d-axis)
    const idx = cx + r * Math.cos(angle - Math.PI / 2) * 0.0 + r * 0.65;
    const idy = cy;
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.65, cy);
    ctx.stroke();
    // Arrowhead
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath(); ctx.moveTo(cx + r * 0.65, cy); ctx.lineTo(cx + r * 0.65 - 8, cy - 5); ctx.lineTo(cx + r * 0.65 - 8, cy + 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 11px system-ui';
    ctx.fillText('Id (magnetising)', cx + r * 0.68, cy - 6);
    ctx.fillStyle = '#475569';
    ctx.font = '9px system-ui';
    ctx.fillText('keeps field = const', cx + r * 0.68, cy + 12);

    // Iq vector (torque-producing, along q-axis)
    const iqLen = r * 0.55 * Math.sin(angle) / Math.sin(Math.PI / 2);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - r * 0.65);
    ctx.stroke();
    ctx.fillStyle = '#4ade80';
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.65); ctx.lineTo(cx - 5, cy - r * 0.65 + 8); ctx.lineTo(cx + 5, cy - r * 0.65 + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 11px system-ui';
    ctx.fillText('Iq (torque)', cx + 8, cy - r * 0.68);
    ctx.fillStyle = '#475569';
    ctx.font = '9px system-ui';
    ctx.fillText('controls torque', cx + 8, cy - r * 0.68 + 14);

    // Resultant Is vector at angle
    const isLen = r * 0.85;
    const isX = cx + isLen * Math.cos(-angle + Math.PI / 4);
    const isY = cy + isLen * Math.sin(-angle + Math.PI / 4);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(isX, isY); ctx.stroke();
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 12px system-ui';
    ctx.fillText('Is (stator current)', isX + 6, isY - 4);
  };

  useEffect(() => { drawFOC(); }, [idIqAngle]);

  const vectorParams = [
    { p: 'p1300', name: 'Control mode',          range: '20=sensorless, 21=encoder', tip: 'Must match hardware. Encoder (21) = better low-speed torque', color: '#c084fc' },
    { p: 'p1910', name: 'Motor ID run',          range: '1=trigger',                tip: 'Set p1910=1, give ON command. Drive measures Rs, Ls, Lm. Do this first!', color: '#c084fc' },
    { p: 'p1460', name: 'Speed ctrl Kp',         range: '0–65000',                  tip: 'Proportional gain. Increase until oscillation, then back 20%', color: '#c084fc' },
    { p: 'p1462', name: 'Speed ctrl Ti',         range: 'ms',                       tip: 'Integral time. Lower = faster integral action. Set 3–5x mechanical time constant', color: '#c084fc' },
    { p: 'p0341', name: 'Motor inertia',         range: 'kg·m²',                    tip: 'Motor datasheet value. Critical for auto-tuning quality', color: '#c084fc' },
    { p: 'p0342', name: 'Total inertia ratio',   range: '1–N',                      tip: 'Total system J / motor J. Tells drive about load inertia', color: '#c084fc' },
    { p: 'p1570', name: 'Flux setpoint',         range: '% (default 100)',          tip: 'Reduce for field weakening above base speed. 80% = +25% speed', color: '#c084fc' },
    { p: 'p1610', name: 'Continuous current',    range: '% of rated',               tip: 'Steady-state torque limit in vector mode', color: '#c084fc' },
  ];

  return (
    <div className="space-y-4">
      <InfoBox color="#c084fc" icon={Info} title="Field-Oriented Control (FOC / Vector):">
        Separates stator current into two independent components — <strong>Id</strong> (magnetising, keeps flux constant) and <strong>Iq</strong> (torque-producing).
        This gives DC-motor-like torque control from an AC induction motor. Encoder optional (sensorless = p1300=20, encoder = p1300=21).
      </InfoBox>

      {/* FOC diagram */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-semibold">Id / Iq Decomposition — interactive</div>
          <canvas ref={canvasRef} width={480} height={200} className="w-full rounded border border-border/40" style={{ maxHeight: 200 }} />
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">Rotate stator current vector:</span>
            <input type="range" min={10} max={80} value={idIqAngle} onChange={e => setIdIqAngle(+e.target.value)} className="flex-1 accent-purple-500" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded p-2 border border-blue-500/30 bg-blue-500/5">
              <span className="font-bold text-blue-400">Id (flux current)</span>
              <div className="text-muted-foreground mt-0.5">Kept constant by the drive. Determines motor flux. Changing it = field weakening / strengthening.</div>
            </div>
            <div className="rounded p-2 border border-green-500/30 bg-green-500/5">
              <span className="font-bold text-green-400">Iq (torque current)</span>
              <div className="text-muted-foreground mt-0.5">Controlled by speed loop. Proportional to motor torque. This is what the Kp/Ki speed controller adjusts.</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-2">
          <div className="text-sm font-semibold">Motor ID Run — why it matters</div>
          <div className="flex flex-col gap-2">
            {[
              { step: 1, text: 'Enter motor nameplate data: p0304 (V), p0305 (A), p0307 (kW), p0310 (Hz), p0311 (rpm)' },
              { step: 2, text: 'Set p1910 = 1. Give ON command from operator panel or PLC.' },
              { step: 3, text: 'Drive injects test signals and measures Rs (stator resistance), Ls (inductance), Lm (magnetising inductance).' },
              { step: 4, text: 'Results stored in p0350 (Rs), p0356 (Ls), p0360 (Lm). Do NOT overwrite manually.' },
              { step: 5, text: 'Run speed optimisation (p1960=1) with motor coupled to load for Kp/Ki auto-calculation.' },
            ].map(s => (
              <div key={s.step} className="flex gap-3 items-start text-xs">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{s.step}</span>
                <span className="text-muted-foreground">{s.text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ResponseSimulator color="#c084fc" label="Vector Speed Loop Response" kpLabel="Kp (p1460)" kiLabel="Ki / Ti (p1462)" defaultKp={55} defaultKi={40} />

      <div className="text-sm font-semibold">Key Parameters</div>
      <ParamTable rows={vectorParams} />

      <InfoBox color="#f59e0b" icon={AlertTriangle} title="Sensorless vs encoder:">
        Sensorless (p1300=20) loses torque accuracy below ~5% speed — do not use for hoists or cranes.
        Encoder (p1300=21) with SMC30 gives full torque from 0 rpm, essential for lifting, presses, and position-sensitive applications.
      </InfoBox>
    </div>
  );
}

// ─── Servo Tuning Module ──────────────────────────────────────────────────────
function ServoModule() {
  const [kv, setKv] = useState(3);
  const [inertiaRatio, setInertiaRatio] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawPositionResponse = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += W / 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += H / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Setpoint (step at 10%)
    ctx.strokeStyle = '#334155';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(W * 0.1, H * 0.1); ctx.lineTo(W * 0.95, H * 0.1); ctx.stroke();
    ctx.setLineDash([]);

    // Position error (following error)
    const kvN = kv / 10; // 0–1
    const jN = inertiaRatio / 10; // 0–1, higher J = harder to tune

    // Simulate: higher Kv = faster settle, inertia mismatch = oscillation
    const wn = 0.5 + kvN * 4 - jN * 1.5;
    const zeta = 0.9 - kvN * 0.3 + jN * 0.2;

    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const startX = W * 0.1;
    for (let px = startX; px < W * 0.95; px++) {
      const t = ((px - startX) / (W * 0.85)) * 4;
      let y: number;
      if (zeta >= 1) {
        const r1 = -wn * (zeta - Math.sqrt(Math.max(0, zeta * zeta - 1)));
        const r2 = -wn * (zeta + Math.sqrt(Math.max(0, zeta * zeta - 1)));
        y = 1 - (r2 !== r1 ? (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1) : (1 + wn * t) * Math.exp(-wn * t));
      } else {
        const wd = wn * Math.sqrt(Math.max(0.01, 1 - zeta * zeta));
        y = 1 - Math.exp(-zeta * wn * t) * (Math.cos(wd * t) + (zeta / Math.sqrt(Math.max(0.01, 1 - zeta * zeta))) * Math.sin(wd * t));
      }
      y = Math.max(-0.3, Math.min(1.5, y));
      const py = H * 0.1 + (1 - y) * H * 0.8;
      if (px === startX) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Step at start
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(W * 0.05, H * 0.9);
    ctx.lineTo(W * 0.1, H * 0.9);
    ctx.lineTo(W * 0.1, H * 0.9);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#4ade80';
    ctx.font = '10px system-ui';
    ctx.fillText('Position response', W * 0.12, H * 0.08);
    ctx.fillStyle = '#475569';
    ctx.fillText('Setpoint', W * 0.96 - 50, H * 0.08);

    // Following error indicator
    const errPct = Math.round((1 - kvN) * 80 + jN * 30);
    ctx.fillStyle = errPct < 20 ? '#22c55e' : errPct < 50 ? '#f59e0b' : '#ef4444';
    ctx.font = 'bold 11px system-ui';
    ctx.fillText(`Following error: ~${errPct} ms`, 10, H - 8);
  };

  useEffect(() => { drawPositionResponse(); }, [kv, inertiaRatio]);

  const servoParams = [
    { p: 'p1300', name: 'Control mode',        range: '21 = vector+encoder\n3 = servo DSC', tip: 'Use 21 for standard servo, 3 (DSC) for highest dynamic performance', color: '#4ade80' },
    { p: 'p1460', name: 'Speed Kp',            range: '0–65000',             tip: 'Proportional gain. Raise until audible hum, then reduce 30%', color: '#4ade80' },
    { p: 'p1462', name: 'Speed Ti',            range: 'ms',                  tip: 'Integral time constant. Set ≈ mechanical time constant of load', color: '#4ade80' },
    { p: 'p1470', name: 'Speed Kp (encoder)',  range: '0–65000',             tip: 'Separate Kp used when encoder is active (p1300=21)', color: '#4ade80' },
    { p: 'p1472', name: 'Speed Ti (encoder)',  range: 'ms',                  tip: 'Separate Ti for encoder mode', color: '#4ade80' },
    { p: 'p0342', name: 'Inertia ratio J',     range: '1–N',                 tip: 'Total J / motor J. Must be accurate — wrong value causes instability', color: '#4ade80' },
    { p: 'p1900', name: 'Motor data ID',        range: '1=stationary 2=rotating', tip: 'p1900=2 rotates motor slowly for better Lm measurement', color: '#4ade80' },
    { p: 'p1960', name: 'Speed opt. run',      range: '1=trigger',           tip: 'Auto-calculates Kp and Ti from inertia + load test. Best starting point', color: '#4ade80' },
  ];

  return (
    <div className="space-y-4">
      <InfoBox color="#4ade80" icon={Info} title="Servo drive (cascade 3-loop):">
        Three nested control loops. Each loop must be tuned faster than the one outside it.
        <strong> Current loop</strong> (bandwidth ~1–5 kHz, usually auto-tuned) →
        <strong> Speed loop</strong> (Kp/Ki, ~50–500 Hz) →
        <strong> Position loop</strong> (Kv factor, ~10–100 Hz).
        Wrong inertia ratio (J) destabilises the speed loop.
      </InfoBox>

      {/* 3-loop cascade diagram */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="text-sm font-semibold mb-3">3-Loop Cascade Architecture</div>
          <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
            {[
              { name: 'Position', color: '#4ade80', detail: 'Kv factor\nsetpoint → speed cmd', speed: 'Slowest ~30 Hz' },
              { name: 'Speed', color: '#60a5fa', detail: 'Kp / Ki (p1460/62)\nspeed error → Iq cmd', speed: 'Medium ~200 Hz' },
              { name: 'Current', color: '#c084fc', detail: 'Kp / Ki (auto)\nIq error → PWM duty', speed: 'Fastest ~2 kHz' },
              { name: 'Motor', color: '#475569', detail: 'PMSM / IM\nCurrent → torque → speed', speed: 'Physical plant' },
            ].map((loop, i) => (
              <React.Fragment key={loop.name}>
                <div className="flex-1 min-w-[100px] rounded-lg p-3 text-center" style={{ border: `1px solid ${loop.color}40`, background: loop.color + '0a' }}>
                  <div className="font-bold text-xs" style={{ color: loop.color }}>{loop.name}</div>
                  <div className="text-[9px] text-muted-foreground mt-1 whitespace-pre-line leading-relaxed">{loop.detail}</div>
                  <div className="text-[9px] mt-2 font-semibold" style={{ color: loop.color + 'aa' }}>{loop.speed}</div>
                </div>
                {i < 3 && <div className="flex items-center text-muted-foreground"><ArrowRight className="h-3 w-3" /></div>}
              </React.Fragment>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Rule: each inner loop bandwidth must be <strong>5–10× faster</strong> than the outer loop. Otherwise instability.
          </div>
        </CardContent>
      </Card>

      {/* Position response simulator */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-semibold">Position Response — Kv & Inertia Simulator</div>
          <canvas ref={canvasRef} width={560} height={160} className="w-full rounded border border-border/40" style={{ maxWidth: '100%' }} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Kv (position loop gain)</span>
                <span className="font-mono font-bold text-green-400">{kv}</span>
              </div>
              <input type="range" min={1} max={10} value={kv} onChange={e => setKv(+e.target.value)} className="w-full accent-green-500" />
              <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                <span>Slow / large following error</span><span>Fast / may oscillate</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Load inertia ratio (p0342)</span>
                <span className="font-mono font-bold text-yellow-400">{inertiaRatio}×</span>
              </div>
              <input type="range" min={1} max={10} value={inertiaRatio} onChange={e => setInertiaRatio(+e.target.value)} className="w-full accent-yellow-500" />
              <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                <span>Motor + light load</span><span>Heavy load / gearbox</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm font-semibold">Key Parameters</div>
      <ParamTable rows={servoParams} />

      <InfoBox color="#ef4444" icon={AlertTriangle} title="Inertia ratio warning:">
        J_total / J_motor above 10:1 makes tuning very difficult. You must either reduce mechanical inertia (lighter load, gearbox), or use DSC (Dynamic Servo Control, p1300=3) which uses the encoder to actively compensate. Mis-set inertia ratio is the #1 cause of servo instability.
      </InfoBox>
    </div>
  );
}

// ─── DC Drive Module ──────────────────────────────────────────────────────────
function DCDriveModule() {
  const [armV, setArmV] = useState(70);
  const [fieldI, setFieldI] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawDCSpeedTorque = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += W / 5) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += H / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Axes labels
    ctx.fillStyle = '#475569';
    ctx.font = '9px system-ui';
    ctx.fillText('0', 4, H - 4);
    ctx.fillText('Torque →', W / 2 - 20, H - 4);
    ctx.fillText('Speed ↑', 4, 14);

    const Va = armV / 100;   // normalised armature voltage
    const If = fieldI / 100; // normalised field current

    // Base speed = Va / If (back-EMF = Va, back-EMF = k * If * n)
    const baseSpeed = Math.min(Va / Math.max(If, 0.3), 1.5);
    // Max torque = k * If * Ia_max (Ia_max depends on Va)
    const maxTorque = If * Va * 1.2;

    // Speed-torque curve: n = (Va - Ia*Ra) / (k*If)
    // Ia = Torque / (k*If), so n = Va/(k*If) - Torque*Ra/(k*If)^2
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const noLoadSpeed = Math.min(baseSpeed, 1.3);
    const startY = H * 0.08 + (1 - noLoadSpeed) * H * 0.84;
    ctx.moveTo(20, startY);
    for (let px = 20; px < W * 0.85; px++) {
      const t = ((px - 20) / (W * 0.65)) * maxTorque;
      const n = noLoadSpeed - (t / Math.max(maxTorque, 0.01)) * noLoadSpeed * 0.18;
      const py = H * 0.08 + (1 - Math.max(0, n)) * H * 0.84;
      ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Field weakening region (above base speed)
    if (fieldI < 90 && armV > 80) {
      const fwSpeed = Math.min(1 / Math.max(If, 0.2), 1.5);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      for (let px = W * 0.85; px < W * 0.98; px++) {
        const t = ((px - W * 0.85) / (W * 0.13)) * maxTorque * 0.3;
        const n = fwSpeed - (t / Math.max(maxTorque * 0.3, 0.01)) * 0.2;
        const py = H * 0.08 + (1 - Math.max(0, n)) * H * 0.84;
        if (px === W * 0.85) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f87171';
      ctx.font = '9px system-ui';
      ctx.fillText('Field weakening', W * 0.87, H * 0.08 + (1 - fwSpeed) * H * 0.84 - 8);
    }

    // Labels
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 10px system-ui';
    ctx.fillText(`Va = ${armV}%`, 10, H * 0.08 + (1 - noLoadSpeed) * H * 0.84 - 8);
    ctx.fillStyle = '#475569';
    ctx.font = '9px system-ui';
    ctx.fillText(`If = ${fieldI}%`, 10, H * 0.08 + (1 - noLoadSpeed) * H * 0.84 + 14);
  };

  useEffect(() => { drawDCSpeedTorque(); }, [armV, fieldI]);

  const dcParams = [
    { p: 'P100', name: 'Rated armature current', range: 'A (nameplate)',      tip: 'Critical for current controller scaling. Enter exact nameplate value',  color: '#fbbf24' },
    { p: 'P101', name: 'Rated armature voltage', range: 'V (nameplate)',      tip: 'Max armature voltage. Drive limits output to this value',                color: '#fbbf24' },
    { p: 'P102', name: 'Rated field current',    range: 'A (nameplate)',      tip: 'Nominal field current. Drive maintains this for constant flux operation', color: '#fbbf24' },
    { p: 'P103', name: 'Rated speed',            range: 'rpm (nameplate)',    tip: 'Base speed at rated Va and If. Field weakening starts above this',       color: '#fbbf24' },
    { p: 'P115', name: 'Motor optimisation run', range: '1=trigger',          tip: 'Measures Ra, La. Must run with motor warm and disconnected from load',   color: '#fbbf24' },
    { p: 'P235', name: 'Speed controller Kp',    range: '0–500',              tip: 'Proportional gain of speed PI. Start low, increase until oscillation',   color: '#fbbf24' },
    { p: 'P236', name: 'Speed controller Tn',    range: 'ms',                 tip: 'Integral time. Set = 2× mechanical time constant (J / f_friction)',      color: '#fbbf24' },
    { p: 'P303', name: 'Current controller Kp',  range: '0–500',              tip: 'Inner current loop gain. Usually auto-set by optimisation run',          color: '#fbbf24' },
    { p: 'P304', name: 'Current controller Tn',  range: 'ms',                 tip: 'Current loop integral time ≈ La/Ra (armature time constant)',            color: '#fbbf24' },
    { p: 'P270', name: 'EMF feedback gain',      range: '0–200 %',            tip: 'Corrects for back-EMF. Important at high speeds. Set = 100% normally',  color: '#fbbf24' },
  ];

  return (
    <div className="space-y-4">
      <InfoBox color="#fbbf24" icon={Info} title="DC motor physics:">
        Torque = k × Φ × Ia (armature current). Speed = (Va − Ia×Ra) / (k×Φ).
        Below base speed: control speed by varying <strong>armature voltage Va</strong> (field = constant = full flux).
        Above base speed: reduce <strong>field current If</strong> (flux weakening) to go faster at reduced torque.
        Two independent controls — this is what makes DC drives precise but also complex.
      </InfoBox>

      {/* Speed-torque curve */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-semibold">DC Motor Speed-Torque Curve — Interactive</div>
          <canvas ref={canvasRef} width={560} height={170} className="w-full rounded border border-border/40" style={{ maxWidth: '100%' }} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Armature voltage Va</span>
                <span className="font-mono font-bold text-yellow-400">{armV}%</span>
              </div>
              <input type="range" min={10} max={100} value={armV} onChange={e => setArmV(+e.target.value)} className="w-full accent-yellow-500" />
              <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                <span>Low speed</span><span>Base speed</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Field current If</span>
                <span className="font-mono font-bold text-red-400">{fieldI}%</span>
              </div>
              <input type="range" min={20} max={100} value={fieldI} onChange={e => setFieldI(+e.target.value)} className="w-full accent-red-500" />
              <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                <span>Field weak (above base)</span><span>Full field (normal)</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {fieldI < 70 && armV > 80
              ? 'Field weakening active — speed above base, torque reduced. Used for wide speed range applications.'
              : armV < 40
              ? 'Low armature voltage — slow speed. Torque still high (full field). Good for positioning.'
              : 'Normal operation region — constant flux, speed set by armature voltage.'}
          </div>
        </CardContent>
      </Card>

      {/* 4-quadrant concept */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="text-sm font-semibold mb-3">4-Quadrant Operation</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { q: 'Q1', title: 'Motoring Forward', desc: '+Va, +Ia → forward rotation, forward torque. Normal running.', color: '#4ade80' },
              { q: 'Q2', title: 'Regenerative Braking F', desc: '-Ia (reverse current) while +Va → decelerates, sends energy back to supply.', color: '#60a5fa' },
              { q: 'Q3', title: 'Motoring Reverse', desc: '-Va, -Ia → reverse rotation, reverse torque.', color: '#c084fc' },
              { q: 'Q4', title: 'Regenerative Braking R', desc: '+Ia while -Va → braking from reverse, energy returned.', color: '#fbbf24' },
            ].map(q => (
              <div key={q.q} className="rounded-lg border p-3" style={{ borderColor: q.color + '40', background: q.color + '08' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-xs" style={{ color: q.color }}>{q.q}</span>
                  <span className="text-xs font-semibold">{q.title}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">{q.desc}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-3">
            <span className="font-semibold text-foreground">SIMOREG 6RA80</span> is a 4-quadrant thyristor converter by default. Requires AC supply that accepts regenerated power (active front end) or a braking resistor for Q2/Q4.
          </div>
        </CardContent>
      </Card>

      {/* IR compensation */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="text-sm font-semibold mb-2">IR Compensation — critical for good speed regulation</div>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>As load increases, armature current Ia rises. Voltage drop across armature resistance = <code className="bg-muted px-1 rounded">Ia × Ra</code>. This reduces back-EMF and slows the motor — <strong>speed droop</strong>.</p>
            <p>IR compensation adds extra armature voltage to cancel this drop: <code className="bg-muted px-1 rounded">Va_corrected = Va_cmd + Ia × Ra</code>. Set via <strong>P271</strong> (IR compensation factor). Too much = speed rises with load (unstable). Too little = speed droop remains.</p>
            <p>Correct setting: at no-load and full-load, motor speed should be the same for the same speed reference.</p>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm font-semibold">Key Parameters (SIMOREG 6RA80)</div>
      <ParamTable rows={dcParams} />

      <InfoBox color="#ef4444" icon={AlertTriangle} title="DC drive safety:">
        Always check field supply before applying armature voltage. <strong>No field current = no back-EMF = motor runs away at full voltage.</strong>
        SIMOREG monitors field current and will trip (F60019) if field is lost. P109 sets the field loss monitoring threshold — never disable it.
      </InfoBox>
    </div>
  );
}

// ─── Comparison tab ───────────────────────────────────────────────────────────
function DriveComparison() {
  const rows = [
    { feature: 'Control mode',         vfd: 'Open-loop scalar (V/f)',            vector: 'Field-oriented (FOC)',       servo: 'FOC + position loop',             dc: 'Armature V + field I' },
    { feature: 'Encoder needed',       vfd: 'No',                               vector: 'Optional (sensorless OK)',   servo: 'Yes — mandatory',                 dc: 'Tach / encoder optional' },
    { feature: 'Low-speed torque',     vfd: 'Poor (boost helps)',               vector: 'Good (sensorless 5%+)',     servo: 'Excellent (0 rpm)',               dc: 'Excellent' },
    { feature: 'Speed accuracy',       vfd: '±1–3% (slip)',                     vector: '±0.01% (encoder)',          servo: 'Encoder resolution limited',      dc: '±0.1% (tach feedback)' },
    { feature: 'Dynamic response',     vfd: 'Slow (ramp limited)',              vector: 'Fast (ms torque response)', servo: 'Very fast (<1 ms)',               dc: 'Fast' },
    { feature: 'Typical application',  vfd: 'Fans, pumps, conveyors',           vector: 'Compressors, mills, cranes', servo: 'CNC axes, robotics, printing',   dc: 'Paper mills, rolling mills, hoists' },
    { feature: 'Motor type',           vfd: 'Induction (squirrel cage)',        vector: 'Induction / PMSM',          servo: 'PMSM / synchronous',             dc: 'Brushed DC motor' },
    { feature: 'Siemens product',      vfd: 'G120 (p1300=0)',                   vector: 'G120/S120 (p1300=20/21)',   servo: 'S120 (p1300=21, DSC)',           dc: 'SIMOREG 6RA80' },
    { feature: 'Maintenance',          vfd: 'Low — no brushes, no encoder',     vector: 'Low — encoder maintenance', servo: 'Medium — encoder, cooling',      dc: 'High — brushes, commutator, field' },
  ];

  const colors = { vfd: '#60a5fa', vector: '#c084fc', servo: '#4ade80', dc: '#fbbf24' };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/60 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/40 border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-32">Feature</th>
              {[{ k: 'vfd', l: 'VFD (V/f)' }, { k: 'vector', l: 'Vector FOC' }, { k: 'servo', l: 'Servo' }, { k: 'dc', l: 'DC Drive' }].map(c => (
                <th key={c.k} className="text-left px-3 py-2 font-semibold w-40" style={{ color: colors[c.k as keyof typeof colors] }}>{c.l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2 font-semibold text-muted-foreground">{r.feature}</td>
                <td className="px-3 py-2 text-foreground/80">{r.vfd}</td>
                <td className="px-3 py-2 text-foreground/80">{r.vector}</td>
                <td className="px-3 py-2 text-foreground/80">{r.servo}</td>
                <td className="px-3 py-2 text-foreground/80">{r.dc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="text-sm font-semibold mb-3">When to choose which drive</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { color: '#60a5fa', title: 'Choose VFD when…', points: ['Energy saving on fans/pumps is the goal', 'Simple speed control, no position needed', 'Budget is tight, induction motor already installed', 'Speed accuracy ±3% is acceptable'] },
              { color: '#c084fc', title: 'Choose Vector when…', points: ['Need torque at low speed (cranes, presses)', 'Speed accuracy ±0.1% required', 'Load varies heavily (variable torque)', 'CNC spindle drive (not axis)'] },
              { color: '#4ade80', title: 'Choose Servo when…', points: ['Precise positioning needed (CNC axis, robot)', 'Rapid acceleration/deceleration cycles', 'Synchronised multi-axis motion', 'Encoder feedback is available or mandatory'] },
              { color: '#fbbf24', title: 'Choose DC Drive when…', points: ['Existing DC motor already installed', 'Regenerative power recovery critical (rolling mills)', 'Very wide speed range (1:100+) needed', 'Simple replacement / retrofit of old system'] },
            ].map(c => (
              <div key={c.title} className="rounded-lg border p-3" style={{ borderColor: c.color + '40', background: c.color + '08' }}>
                <div className="font-semibold text-xs mb-2" style={{ color: c.color }}>{c.title}</div>
                {c.points.map((p, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground mb-1">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: c.color }} />
                    {p}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function DrivesTuningModule() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Drive Tuning — Feel &amp; Parameters</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive tuning simulators for VFD, Vector, Servo, and DC drives. Slide the gains and feel the difference.
        </p>
      </div>

      <Tabs defaultValue="vfd" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="vfd">VFD / V·f</TabsTrigger>
          <TabsTrigger value="vector">Vector (FOC)</TabsTrigger>
          <TabsTrigger value="servo">Servo</TabsTrigger>
          <TabsTrigger value="dc">DC Drive</TabsTrigger>
          <TabsTrigger value="compare">Compare All</TabsTrigger>
        </TabsList>
        <TabsContent value="vfd"><VFDModule /></TabsContent>
        <TabsContent value="vector"><VectorModule /></TabsContent>
        <TabsContent value="servo"><ServoModule /></TabsContent>
        <TabsContent value="dc"><DCDriveModule /></TabsContent>
        <TabsContent value="compare"><DriveComparison /></TabsContent>
      </Tabs>
    </div>
  );
}
