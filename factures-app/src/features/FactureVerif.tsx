import { factureDemo, anomaliesDemo, controleDemo } from '../demo/factureDemo';
import { formatEuro, type AnomalieDetectee } from '../core';
import { ANOMALIE_UI, CLASSES } from './anomalieUi';

const ORDRE = { red: 0, orange: 1, grey: 2 } as const;

export function FactureVerif({
  onSelect,
  onReclamation,
}: {
  onSelect: (a: AnomalieDetectee) => void;
  onReclamation: () => void;
}) {
  const anomalies = [...anomaliesDemo()].sort((a, b) => {
    const ca = ANOMALIE_UI[a.type].couleur;
    const cb = ANOMALIE_UI[b.type].couleur;
    if (ORDRE[ca] !== ORDRE[cb]) return ORDRE[ca] - ORDRE[cb];
    return b.montant_impact - a.montant_impact;
  });
  const ligneOf = (id: string) => factureDemo.lignes.find((l) => l.id === id);
  const impactTotal = anomalies.reduce((s, a) => s + a.montant_impact, 0);
  const aDesEcarts = anomalies.some((a) => a.type === 'ecart_prix');
  const lignesSaines = factureDemo.lignes.filter(
    (l) => !anomalies.some((a) => a.ligne_facture_id === l.id),
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-widest text-slate-400">
          {anomalies.filter((a) => a.montant_impact > 0).length} écart(s) ·{' '}
          {anomalies.filter((a) => a.montant_impact === 0).length} à confirmer
        </div>
        {controleDemo.ok ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-400">
            Boucle ✓
          </span>
        ) : (
          <span className="rounded-full bg-red-500/15 px-2 py-1 text-[11px] font-semibold text-red-400">
            Ne boucle pas
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between rounded-xl bg-slate-800 px-4 py-3">
        <span className="text-sm text-slate-300">Impact total réclamable</span>
        <span className="text-2xl font-extrabold tabular-nums text-red-400">
          {formatEuro(impactTotal)} €
        </span>
      </div>

      <ul className="space-y-2">
        {anomalies.map((a, i) => {
          const ui = ANOMALIE_UI[a.type];
          const cls = CLASSES[ui.couleur];
          const ligne = ligneOf(a.ligne_facture_id);
          const cliquable = a.montant_impact > 0;
          return (
            <li key={i}>
              <button
                onClick={() => cliquable && onSelect(a)}
                className={`w-full rounded-xl p-3 pl-4 text-left ${cls.carte} ${
                  cliquable ? 'active:scale-[0.99]' : 'cursor-default'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${cls.badge}`}
                  >
                    {ui.label}
                  </span>
                  {a.montant_impact > 0 ? (
                    <span className={`font-extrabold tabular-nums ${cls.montant}`}>
                      +{formatEuro(a.montant_impact)} €
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">à vérifier</span>
                  )}
                </div>
                <div className="mt-1.5 text-[13px] font-semibold">
                  {ligne?.libelle ?? '—'}
                </div>
                <div className="text-[11px] text-slate-400">{a.commentaire}</div>
              </button>
            </li>
          );
        })}
      </ul>

      {aDesEcarts && (
        <button
          onClick={onReclamation}
          className="min-h-touch w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white"
        >
          Générer la réclamation
        </button>
      )}

      <details className="rounded-xl bg-slate-800/60 px-4 py-3">
        <summary className="cursor-pointer text-[13px] text-slate-300">
          Reste de la facture ({lignesSaines.length} lignes)
        </summary>
        <ul className="mt-2 space-y-1">
          {lignesSaines.map((l) => (
            <li key={l.id} className="flex justify-between text-[12px] text-slate-400">
              <span>{l.libelle}</span>
              <span className="tabular-nums">{formatEuro(l.montant_ht)} €</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
