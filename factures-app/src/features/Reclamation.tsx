import { useState } from 'react';
import { mailReclamationDemo } from '../demo/factureDemo';
import { formatEuro } from '../core';

export function Reclamation({ onBack }: { onBack: () => void }) {
  const mail = mailReclamationDemo();
  const [corps, setCorps] = useState(mail.corps);
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(`${mail.objet}\n\n${corps}`);
      setCopie(true);
      setTimeout(() => setCopie(false), 1800);
    } catch {
      /* clipboard indisponible — non bloquant en démo */
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-[13px] text-slate-400">
          ‹ Retour
        </button>
        <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-400">
          {formatEuro(mail.montant_total)} €
        </span>
      </div>

      <div className="rounded-xl bg-slate-800 px-4 py-3">
        <div className="text-[10px] uppercase tracking-widest text-slate-400">Objet</div>
        <div className="mt-1 text-[13px] font-semibold">{mail.objet}</div>
      </div>

      <textarea
        value={corps}
        onChange={(e) => setCorps(e.target.value)}
        rows={14}
        className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 font-mono text-[11.5px] leading-relaxed text-slate-200"
      />

      <div className="flex gap-2">
        <button className="min-h-touch flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white">
          Envoyer
        </button>
        <button
          onClick={copier}
          className="min-h-touch flex-1 rounded-xl bg-slate-700 py-3 text-sm font-bold"
        >
          {copie ? 'Copié ✓' : 'Copier'}
        </button>
      </div>
      <p className="text-center text-[11px] text-slate-500">
        Suivi ensuite : Acceptée · Refusée · Partielle + montant obtenu.
      </p>
    </section>
  );
}
