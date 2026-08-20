import { factureDemo, prixNegocie } from '../demo/factureDemo';
import { formatEuro } from '../core';

export function PrixNegocies() {
  return (
    <section className="space-y-3">
      <div className="rounded-lg bg-slate-800 px-3 py-2 text-[12.5px] text-slate-400">
        🔍 Rechercher une référence…
      </div>
      <ul className="space-y-2">
        {factureDemo.lignes.map((l) => {
          const pn = prixNegocie(l);
          return (
            <li key={l.id} className="rounded-xl bg-slate-800 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold">{l.libelle}</span>
                {pn != null ? (
                  <span className="font-bold tabular-nums">
                    {formatEuro(pn)} €/{unite(l.conditionnement_brut)}
                  </span>
                ) : (
                  <span className="rounded bg-slate-600 px-2 py-0.5 text-[10px] font-bold text-slate-100">
                    à saisir
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                Réf. {l.code_article} · {l.conditionnement_brut}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-center text-[11px] text-slate-500">
        Données de démo · import CSV et édition en Phase 4.
      </p>
    </section>
  );
}

function unite(cond: string): string {
  if (/L\b/.test(cond)) return 'L';
  if (/KG|G\b/.test(cond)) return 'kg';
  return 'u';
}
