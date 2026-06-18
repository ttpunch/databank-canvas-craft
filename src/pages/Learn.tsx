import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import BICOModule from '@/components/learn/BICOModule';
import PLCFieldbusModule from '@/components/learn/PLCFieldbusModule';
import DrivesTuningModule from '@/components/learn/DrivesTuningModule';
import { Zap, Cpu, Gauge, ChevronRight } from 'lucide-react';

const modules = [
  {
    id: 'bico',
    title: 'Parameters & BICO',
    subtitle: 'p/r params · binectors · connectors · wiring simulator',
    icon: Zap,
    color: '#818cf8',
    component: BICOModule,
  },
  {
    id: 'plc',
    title: 'PLC & Fieldbuses',
    subtitle: 'PROFINET · telegrams · STW/ZSW · TIA Portal · SCL code',
    icon: Cpu,
    color: '#34d399',
    component: PLCFieldbusModule,
  },
  {
    id: 'tuning',
    title: 'Drive Tuning',
    subtitle: 'VFD · vector FOC · servo · DC drive · interactive response simulators',
    icon: Gauge,
    color: '#fbbf24',
    component: DrivesTuningModule,
  },
];

export default function Learn() {
  const { user, loading } = useAuth();
  const [activeModule, setActiveModule] = useState<string | null>(null);

  if (!user && !loading) return <Navigate to="/auth" replace />;
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  const current = modules.find(m => m.id === activeModule);

  const headerActions = activeModule ? (
    <button
      onClick={() => setActiveModule(null)}
      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
    >
      ← All modules
    </button>
  ) : undefined;

  return (
    <AppShell
      title="SINAMICS Learning Hub"
      subtitle={current ? current.title : 'Interactive drive technology training'}
      actions={headerActions}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {!activeModule ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold tracking-tight">SINAMICS Learning Hub</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Interactive modules covering Siemens SINAMICS drive technology. Each module has animated concepts, interactive simulators, and real-world examples.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {modules.map((mod, i) => (
                  <motion.button
                    key={mod.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveModule(mod.id)}
                    className="text-left rounded-xl border border-border/60 bg-card p-5 hover:border-border hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: mod.color + '18', border: `1px solid ${mod.color}30` }}
                      >
                        <mod.icon className="h-5 w-5" style={{ color: mod.color }} />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all mt-1" />
                    </div>
                    <div className="mt-3">
                      <div className="font-semibold text-base">{mod.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{mod.subtitle}</div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Coming soon phases */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Coming soon</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { title: 'Drives & Motors', sub: 'AC theory · PWM · SINAMICS family' },
                    { title: 'CNC — Siemens 840D', sub: 'Alarms · PLC DBs · axis commissioning' },
                    { title: 'Safety Functions', sub: 'STO · SS1 · SLS · SOS · faults' },
                  ].map(m => (
                    <div key={m.title} className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-4 opacity-60">
                      <div className="text-sm font-semibold">{m.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{m.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {current && <current.component />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
