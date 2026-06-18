import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, Info, ArrowRight, ChevronRight, CheckCircle2, Circle } from 'lucide-react';

// ─── STW / ZSW Bit Definitions ───────────────────────────────────────────────

const stwBits: { bit: number; name: string; desc: string; defaultVal: 0 | 1; critical?: boolean }[] = [
  { bit: 0,  name: 'ON / OFF1',              desc: '1 = Run command. 0 = decelerate to stop via ramp', defaultVal: 0, critical: true },
  { bit: 1,  name: 'OFF2 (coast stop)',       desc: '1 = Normal (must be 1). 0 = coast stop immediately', defaultVal: 1 },
  { bit: 2,  name: 'OFF3 (quick stop)',       desc: '1 = Normal (must be 1). 0 = emergency quick stop', defaultVal: 1 },
  { bit: 3,  name: 'Enable operation',        desc: '1 = Allow drive to accept setpoint and accelerate', defaultVal: 0, critical: true },
  { bit: 4,  name: 'Enable ramp generator',   desc: '1 = Ramp generator active. 0 = freeze ramp output', defaultVal: 1 },
  { bit: 5,  name: 'Unfreeze ramp generator', desc: '1 = Setpoint passes through ramp. 0 = hold current speed', defaultVal: 1 },
  { bit: 6,  name: 'Enable setpoint',         desc: '1 = Setpoint active. 0 = drive runs at 0 setpoint', defaultVal: 0, critical: true },
  { bit: 7,  name: 'Fault acknowledge',       desc: '0→1 rising edge acknowledges a drive fault (F-alarm)', defaultVal: 0 },
  { bit: 8,  name: 'Jog bit 1',              desc: '1 = Jog at JOG1 speed (p1058)', defaultVal: 0 },
  { bit: 9,  name: 'Jog bit 2',              desc: '1 = Jog at JOG2 speed (p1059)', defaultVal: 0 },
  { bit: 10, name: 'PLC control (remote)',    desc: '1 = Drive accepts commands from fieldbus PLC', defaultVal: 1, critical: true },
  { bit: 11, name: 'Invert setpoint',         desc: '1 = Negate the active setpoint (reverse direction)', defaultVal: 0 },
  { bit: 12, name: 'Reserved',               desc: 'Not used in standard telegrams', defaultVal: 0 },
  { bit: 13, name: 'Reserved',               desc: 'Not used in standard telegrams', defaultVal: 0 },
  { bit: 14, name: 'Reserved',               desc: 'Not used in standard telegrams', defaultVal: 0 },
  { bit: 15, name: 'Reserved',               desc: 'Not used in standard telegrams', defaultVal: 0 },
];

const zswBits: { bit: number; name: string; desc: string }[] = [
  { bit: 0,  name: 'Ready to switch on',     desc: 'Power stage OK, no fault, waiting for ON command' },
  { bit: 1,  name: 'Ready to operate',       desc: 'ON command received, ready for enable' },
  { bit: 2,  name: 'Operation enabled',      desc: 'Drive is running / accelerating to setpoint' },
  { bit: 3,  name: 'Fault active',           desc: 'A fault (Fxxx) is present — drive tripped' },
  { bit: 4,  name: 'OFF2 active',            desc: 'Coast stop requested (STW bit 1 = 0)' },
  { bit: 5,  name: 'OFF3 active',            desc: 'Quick stop active (STW bit 2 = 0)' },
  { bit: 6,  name: 'Switch-on inhibit',      desc: 'Fault acknowledge needed before restart' },
  { bit: 7,  name: 'Warning active',         desc: 'A warning (Axxx) is present — drive still running' },
  { bit: 8,  name: 'Speed deviation',        desc: 'Actual speed deviates from setpoint > tolerance band' },
  { bit: 9,  name: 'PZD control requested',  desc: 'Drive requests PLC setpoint via fieldbus' },
  { bit: 10, name: 'f/n reached (at setpt)', desc: 'Speed reached setpoint within tolerance — good feedback for PLC' },
  { bit: 11, name: 'I limit active',         desc: 'Drive is current-limiting (motor overloaded)' },
  { bit: 12, name: 'Holding brake active',   desc: 'Motor holding brake is applied' },
  { bit: 13, name: 'Motor overtemp warning', desc: 'Motor temperature warning threshold crossed' },
  { bit: 14, name: 'Drive overtemp warning', desc: 'Drive (inverter) temperature warning' },
  { bit: 15, name: 'Drive running',          desc: 'Drive is actively modulating (motor energised)' },
];

// Standard startup sequence for Telegram 1
const startupSequence = [
  { step: 1, name: 'Power up',           stw: '0x0000', note: 'All bits 0 initially' },
  { step: 2, name: 'Bits 1,2,10 = 1',   stw: '0x0406', note: 'Set OFF2(off)=1, OFF3(off)=1, PLC ctrl=1' },
  { step: 3, name: 'Bits 4,5 = 1',      stw: '0x0436', note: 'Enable ramp generator, unfreeze ramp' },
  { step: 4, name: 'Bits 3,6 = 1',      stw: '0x047E', note: 'Enable operation + enable setpoint' },
  { step: 5, name: 'Bit 0 = 1 (ON)',    stw: '0x047F', note: 'ON/OFF1 command — drive starts!' },
];

// Telegrams
const telegrams = [
  {
    num: 1,
    name: 'Standard telegram 1',
    desc: 'Speed control. Most common for G120/S120 basic applications.',
    send: 'STW1 (16 bit), NSOLL_A (16 bit speed setpoint)',
    recv: 'ZSW1 (16 bit), NIST_A (16 bit actual speed)',
    use: 'Simple speed-controlled drives, conveyor, fans, pumps',
  },
  {
    num: 20,
    name: 'Standard telegram 20',
    desc: 'Speed + PID setpoint. Adds process controller value.',
    send: 'STW1, NSOLL_A, MOP_STW, PID_STW',
    recv: 'ZSW1, NIST_A, MOP_ZSW, PID_ZSW',
    use: 'PID process control with drive-internal controller',
  },
  {
    num: 111,
    name: 'SIEMENS telegram 111',
    desc: 'Extended speed + torque + extended status. Widely used.',
    send: 'STW1, NSOLL_B (32 bit), STW3',
    recv: 'ZSW1, NIST_B (32 bit), ZSW3, MIST_GLATT',
    use: 'High-precision speed with torque monitoring',
  },
  {
    num: 352,
    name: 'SIEMENS telegram 352',
    desc: 'Full servo telegram. Position, speed, torque + safety.',
    send: 'STW1, NSOLL_B, G1_STW, G1_XIST1, G1_XIST2',
    recv: 'ZSW1, NIST_B, G1_ZSW, G1_GXIST1, G1_GXIST2',
    use: 'S120 servo / position control with encoder feedback',
  },
];

// Commissioning checklist
const commSteps = [
  { id: 1,  section: 'Hardware',    title: 'Verify power supply',         detail: 'Check line voltage, fusing, and PE earthing match drive nameplate' },
  { id: 2,  section: 'Hardware',    title: 'Check motor nameplate data',  detail: 'Note rated voltage, current, frequency, power, cos φ' },
  { id: 3,  section: 'Network',     title: 'Set device name / IP',        detail: 'Assign PROFINET device name via TIA Portal → Online → Assign device name' },
  { id: 4,  section: 'Network',     title: 'Set telegram type',           detail: 'p0922 = telegram number (e.g. 1). Must match TIA Portal IO config' },
  { id: 5,  section: 'Network',     title: 'Configure GSD/GSDML',         detail: 'Import GSDML file into TIA Portal hardware catalogue (HW Config)' },
  { id: 6,  section: 'Drive',       title: 'Enter motor data',            detail: 'p0304 (voltage), p0305 (current), p0307 (power), p0310 (frequency), p0311 (speed)' },
  { id: 7,  section: 'Drive',       title: 'Select control mode',         detail: 'p1300: 0=V/f linear, 20=vector (sensorless), 21=vector (encoder), 3=V/f quadratic' },
  { id: 8,  section: 'Drive',       title: 'Motor ID run',                desc: 'p1910=1, then give ON command — drive measures motor resistance/inductance' },
  { id: 9,  section: 'Drive',       title: 'Set speed limits',            detail: 'p1082 = max speed (rpm), p1080 = min speed. Set ramps: p1120 (accel), p1121 (decel)' },
  { id: 10, section: 'BICO',        title: 'Wire command source',         detail: 'p0840 = r2090.0 (fieldbus ON/OFF1). Set p0700 = 6 for PROFINET command source' },
  { id: 11, section: 'BICO',        title: 'Wire setpoint source',        detail: 'p1070 = r2050[1] (fieldbus PZD word 1). Set p1000 = 6 for PROFINET setpoint' },
  { id: 12, section: 'PLC',         title: 'Write startup STW sequence',  detail: 'Send 0x047E then 0x047F on STW1 word. Check ZSW1 bit 2 (operation enabled) = 1' },
  { id: 13, section: 'PLC',         title: 'Send speed setpoint',         detail: 'Normalised: 0x4000 = 100% = p1082 (max speed). Send on NSOLL_A or NSOLL_B word' },
  { id: 14, section: 'Verify',      title: 'Check ZSW1 = 0x0037',        detail: 'Bits 0,1,2,4,5 should be 1 when running normally. Bit 3 = 0 (no fault)' },
  { id: 15, section: 'Verify',      title: 'Check actual speed (r0021)',  detail: 'Should match commanded setpoint within tolerance. Monitor via STARTER trace or TIA drives panel' },
];

// SCL code examples
const codeExamples = [
  {
    title: 'Drive startup sequence (SCL)',
    lang: 'SCL',
    code: `// Siemens SINAMICS - Standard startup via Telegram 1
// Send to drive: STW1 (control word) + NSOLL_A (setpoint)

VAR
  stw1      : WORD;    // Control word to drive
  nsoll_a   : INT;     // Speed setpoint (normalised)
  zsw1      : WORD;    // Status word from drive (input)
  driveReady: BOOL;
END_VAR

// Step 1: prepare word (bits 1,2,4,5,10 = 1)
stw1 := 16#047E;          // 0000_0100_0111_1110

// Step 2: send ON command (bit 0 = 1)
IF startCommand THEN
  stw1 := stw1 OR 16#0001; // Set bit 0 = ON/OFF1
END_IF;

// Step 3: speed setpoint - 16#4000 = 100% = max speed
nsoll_a := INT#16#2000;   // 50% of max speed

// Check drive running (ZSW1 bit 2 = operation enabled)
driveReady := zsw1.%X2;`,
  },
  {
    title: 'Fault acknowledge (SCL)',
    lang: 'SCL',
    code: `// Acknowledge a drive fault with a rising edge on STW1 bit 7
// Must send 0 → 1 transition (not hold 1)

VAR
  stw1         : WORD;
  faultPresent : BOOL;   // ZSW1 bit 3
  ackEdge      : BOOL;   // trigger from HMI button
  ackPulse     : BOOL;   // one-shot output
  r_trig       : R_TRIG;
END_VAR

faultPresent := zsw1.%X3;  // read fault bit

r_trig(CLK := ackEdge);     // rising edge detection
ackPulse := r_trig.Q;

IF ackPulse THEN
  stw1 := stw1 OR 16#0080;  // set bit 7
ELSE
  stw1 := stw1 AND 16#FF7F; // clear bit 7 after one scan
END_IF;`,
  },
  {
    title: 'Speed scaling (SCL)',
    lang: 'SCL',
    code: `// Convert rpm → normalised NSOLL_A word
// 0x4000 (16384) = 100% = p1082 (max speed)
// 0x0000 = 0 rpm,  0x8000 (signed) = -100% (reverse)

FUNCTION SpeedToWord : INT
  VAR_INPUT
    speedRpm : REAL;   // desired speed in rpm
    maxRpm   : REAL;   // p1082 value
  END_VAR

  IF maxRpm <= 0.0 THEN
    SpeedToWord := 0;
    RETURN;
  END_IF;

  SpeedToWord := REAL_TO_INT(
    (speedRpm / maxRpm) * 16384.0  // 16384 = 0x4000
  );
END_FUNCTION

// Usage:
nsoll_a := SpeedToWord(speedRpm := 1200.0, maxRpm := 1500.0);
// → 0x3333 ≈ 80% of max speed`,
  },
  {
    title: 'PROFINET IO mapping (TIA Portal)',
    lang: 'TIA Note',
    code: `// In TIA Portal HW Config — drive IO slots:
//
// Slot 1 (Output → drive):
//   Address  Q100  = STW1   (WORD)   control word
//   Address  Q102  = NSOLL_A (INT)   speed setpoint
//
// Slot 1 (Input ← drive):
//   Address  I100  = ZSW1   (WORD)   status word
//   Address  I102  = NIST_A  (INT)   actual speed
//
// PLC code read/write:
"DriveOut".STW1   := stw1;          // write to drive
"DriveOut".NSOLL  := nsoll_a;

stw1   := "DriveIn".ZSW1;           // read from drive
nist_a := "DriveIn".NIST;
driveRunning := "DriveIn".ZSW1.%X2; // op-enabled bit`,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TelegramExplorer() {
  const [mode, setMode] = useState<'stw' | 'zsw'>('stw');
  const [bits, setBits] = useState<number[]>(() =>
    stwBits.map(b => b.defaultVal)
  );
  const [selectedBit, setSelectedBit] = useState<number | null>(null);

  const toggleBit = (i: number) => {
    setBits(prev => { const n = [...prev]; n[i] = n[i] ? 0 : 1; return n; });
    setSelectedBit(i);
  };

  const hex = '0x' + bits.slice().reverse().reduce((acc, b, i) => acc | (b << i), 0).toString(16).toUpperCase().padStart(4, '0');

  const currentBits = mode === 'stw' ? stwBits : zswBits;
  const displayBits = mode === 'stw' ? bits : zswBits.map(b => {
    // derive simulated ZSW from STW for demo
    if (b.bit === 2) return bits[0] && bits[3] && bits[6] ? 1 : 0;
    if (b.bit === 0) return bits[1] ? 1 : 0;
    if (b.bit === 1) return bits[1] && bits[2] ? 1 : 0;
    if (b.bit === 15) return bits[0] && bits[3] ? 1 : 0;
    if (b.bit === 10) return bits[0] && bits[3] && bits[4] && bits[5] && bits[6] ? 1 : 0;
    return 0;
  });

  const activeBits = currentBits.filter((_, i) => displayBits[i] === 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setMode('stw')} className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${mode === 'stw' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
          STW1 — Control Word
        </button>
        <button onClick={() => setMode('zsw')} className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${mode === 'zsw' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
          ZSW1 — Status Word
        </button>
        {mode === 'stw' && (
          <span className="text-xs text-muted-foreground ml-auto">Click bits to toggle. ZSW updates automatically.</span>
        )}
        {mode === 'zsw' && (
          <span className="text-xs text-muted-foreground ml-auto">Simulated from STW — toggle STW to see effect</span>
        )}
      </div>

      {/* 16-bit word visual */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="text-center mb-3">
            <span className="font-mono text-2xl font-bold text-primary">{hex}</span>
            <span className="text-xs text-muted-foreground ml-2">(hex)</span>
          </div>
          <div className="flex flex-wrap gap-1 justify-center">
            {[...Array(16)].map((_, ri) => {
              const i = 15 - ri; // bit 15 on left
              const val = displayBits[i];
              const def = currentBits[i];
              const isCritical = mode === 'stw' && stwBits[i]?.critical;
              return (
                <motion.button
                  key={i}
                  onClick={() => mode === 'stw' && toggleBit(i)}
                  whileTap={{ scale: 0.9 }}
                  className={`relative flex flex-col items-center w-10 rounded border py-1 transition-all ${
                    val
                      ? isCritical ? 'bg-primary/20 border-primary text-primary' : 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                      : 'bg-muted/30 border-border/40 text-muted-foreground'
                  } ${mode === 'stw' ? 'cursor-pointer hover:border-border' : 'cursor-default'}`}
                >
                  <span className="text-[9px] text-muted-foreground">{i}</span>
                  <span className={`text-sm font-bold font-mono ${val ? 'text-current' : 'text-muted-foreground'}`}>{val}</span>
                </motion.button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-3 justify-center text-[10px] text-muted-foreground">
            <span>← bit 15</span>
            <span>bit 0 →</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Active bits */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Active bits (= 1)</div>
          {activeBits.length === 0 ? (
            <div className="text-xs text-muted-foreground border border-dashed border-border/40 rounded p-3 text-center">No bits active</div>
          ) : (
            <div className="space-y-1.5">
              {activeBits.map(b => (
                <motion.div key={b.bit} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2 rounded border border-border/40 bg-muted/20 px-3 py-2">
                  <span className="font-mono text-xs font-bold text-primary w-5">{b.bit}</span>
                  <div>
                    <div className="text-xs font-semibold">{b.name}</div>
                    <div className="text-[10px] text-muted-foreground">{b.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Selected bit detail */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {selectedBit !== null ? `Bit ${selectedBit} detail` : 'Click a bit to inspect'}
          </div>
          <AnimatePresence mode="wait">
            {selectedBit !== null && (
              <motion.div key={selectedBit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary">Bit {selectedBit}</span>
                      <span className="text-sm font-semibold">{currentBits[selectedBit]?.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{currentBits[selectedBit]?.desc}</p>
                    <div className="text-xs mt-1">
                      <span className="text-muted-foreground">Current: </span>
                      <span className={bits[selectedBit] ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                        {bits[selectedBit] ? '1 (active)' : '0 (inactive)'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Startup sequence */}
          <div className="mt-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Standard startup sequence</div>
            <div className="space-y-1.5">
              {startupSequence.map((s, i) => (
                <motion.div key={s.step} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold flex-shrink-0">{s.step}</span>
                  <code className="font-mono text-green-400 w-20 flex-shrink-0">{s.stw}</code>
                  <span className="text-muted-foreground">{s.note}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TelegramTypes() {
  const [selected, setSelected] = useState(1);
  const tg = telegrams.find(t => t.num === selected)!;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">A telegram defines the cyclic process data exchanged between PLC and drive. The telegram number must match in both TIA Portal HW Config and the drive parameter <code className="bg-muted px-1 rounded">p0922</code>.</p>

      <div className="flex flex-wrap gap-2">
        {telegrams.map(t => (
          <button key={t.num} onClick={() => setSelected(t.num)}
            className={`px-3 py-1.5 rounded border text-sm font-semibold transition-colors ${selected === t.num ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
            TG {t.num}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={selected} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <Card className="border-border/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base">Telegram {tg.num} — {tg.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{tg.desc}</p>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/50 p-3 bg-muted/20">
                  <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 text-blue-400" /> PLC → Drive (output words)
                  </div>
                  <code className="text-xs text-blue-300 font-mono leading-relaxed block">{tg.send}</code>
                </div>
                <div className="rounded-lg border border-border/50 p-3 bg-muted/20">
                  <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 rotate-180 text-green-400" /> Drive → PLC (input words)
                  </div>
                  <code className="text-xs text-green-300 font-mono leading-relaxed block">{tg.recv}</code>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <Info className="h-3.5 w-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground"><span className="font-semibold text-foreground">Best for: </span>{tg.use}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Network topology note */}
      <Card className="border-border/50 bg-muted/10">
        <CardContent className="p-4">
          <div className="text-sm font-semibold mb-2">PROFINET vs PROFIBUS</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="space-y-1">
              <div className="font-semibold text-foreground">PROFINET (IRT/RT)</div>
              <div>• Ethernet-based (100 Mbit), RJ45 / M12</div>
              <div>• Device name assigned via DCP protocol</div>
              <div>• Cycle: 1–128 ms (IRT down to 250 µs)</div>
              <div>• GSDML file for TIA Portal config</div>
              <div>• Drive parameter: <code className="bg-muted px-1 rounded">p8920</code> (device name)</div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-foreground">PROFIBUS-DP</div>
              <div>• RS-485 bus, up to 12 Mbit/s, DB9 connector</div>
              <div>• Station address set on drive: <code className="bg-muted px-1 rounded">p0918</code></div>
              <div>• Cycle: typically 1–10 ms</div>
              <div>• GSD file for HW Config</div>
              <div>• Up to 126 slaves on one segment</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CommissioningGuide() {
  const [done, setDone] = useState<Set<number>>(new Set());
  const sections = [...new Set(commSteps.map(s => s.section))];

  const toggle = (id: number) => {
    setDone(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const total = commSteps.length;
  const completed = done.size;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="space-y-4">
      {/* Progress */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Commissioning progress</span>
            <span className="text-sm font-bold text-primary">{completed}/{total}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 80 }} />
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {sections.map(s => {
              const sSteps = commSteps.filter(c => c.section === s);
              const sDone = sSteps.filter(c => done.has(c.id)).length;
              return (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full border border-border/50 text-muted-foreground">
                  {s}: {sDone}/{sSteps.length}
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {sections.map(section => (
        <div key={section}>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">{section}</div>
          <div className="space-y-2">
            {commSteps.filter(s => s.section === section).map(step => (
              <motion.button
                key={step.id}
                onClick={() => toggle(step.id)}
                whileTap={{ scale: 0.98 }}
                className={`w-full text-left rounded-lg border px-4 py-3 transition-all ${done.has(step.id) ? 'border-green-500/40 bg-green-500/5' : 'border-border/50 bg-card hover:border-border/70'}`}
              >
                <div className="flex items-start gap-3">
                  {done.has(step.id)
                    ? <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    : <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  }
                  <div>
                    <div className={`text-sm font-medium ${done.has(step.id) ? 'line-through text-muted-foreground' : ''}`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{step.detail}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={() => setDone(new Set())} className="w-full">Reset checklist</Button>
    </div>
  );
}

function CodeExamplesTab() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (code: string, title: string) => {
    navigator.clipboard.writeText(code);
    setCopied(title);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">SCL (Structured Control Language) snippets for TIA Portal. Adapt addresses to match your HW Config.</p>
      {codeExamples.map((ex, i) => (
        <motion.div key={ex.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
          <Card className="border-border/50">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                {ex.title}
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{ex.lang}</Badge>
                  <button onClick={() => copy(ex.code, ex.title)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    {copied === ex.title ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <pre className="text-xs font-mono text-green-300 bg-black/40 border border-border/40 rounded p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                {ex.code}
              </pre>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function PLCFieldbusModule() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">PLC Integration &amp; Fieldbuses</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Master PROFINET/PROFIBUS telegrams, STW/ZSW control words, and TIA Portal commissioning.
        </p>
      </div>

      <Tabs defaultValue="telegrams" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="telegrams">Telegram Types</TabsTrigger>
          <TabsTrigger value="bitworder">STW / ZSW Explorer</TabsTrigger>
          <TabsTrigger value="commission">Commissioning</TabsTrigger>
          <TabsTrigger value="code">Code Examples</TabsTrigger>
        </TabsList>

        <TabsContent value="telegrams">
          <TelegramTypes />
        </TabsContent>
        <TabsContent value="bitworder">
          <TelegramExplorer />
        </TabsContent>
        <TabsContent value="commission">
          <CommissioningGuide />
        </TabsContent>
        <TabsContent value="code">
          <CodeExamplesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
