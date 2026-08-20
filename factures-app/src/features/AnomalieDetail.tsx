import { factureDemo, prixNegocie } from '../demo/factureDemo';
import { formatEuro, type AnomalieDetectee } from '../core';

export function AnomalieDetail({
  anomalie,
  onBack,
}: {
  anomalie: AnomalieDetectee;
  onBack: () => void;
}) {
  const ligne = factureDemo.lignes.find((l) => l.id === anomalie.ligne_facture_id);
  const pn = ligne ? prixNegocie(ligne) : null;
  const pf = ligne?.prix_unite_base ?? null;
  const qteBase = ligne ? (ligne.quantite_base ?? 1) * ligne.quantite : 0;
  const ecartPct = pn && pf ? Math.round(((pf - pn) / pn) * 1000) / 10 : null;

  return (
    <section className="space-y-3">
      <button onClick={onBack} className="text-[13px] text-slate-400">
        ‹ Retour
      </button>

      <div className="rounded-2xl bg-slate-800 p-5 text-center">
        <div className="text-[10px] uppercase tracking-widest text-slate-400">
          Impact estimé
        </div>
        <div className="mt-1 text-4xl font-extrabold tabular-nums text-red-400">
          +{formatEuro(anomalie.montant_impact)} €
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          {ligne?.libelle} · {ligne?.conditionnement_brut}
        </div>
      </div>

      <div className="rounded-xl bg-slate-800 px-4 py-2">
        <Kv label="Prix négocié" val={pn != null ? `${formatEuro(pn)} €` : '—'} />
        <Kv
          label="Prix facturé"
          val={pf != null ? `${formatEuro(pf)} €` : '—'}
          accent="text-red-400"
        />
        {ecartPct != null && <Kv label="Écart" val={`+${ecartPct} %`} />}
        <Kv label="Quantité (base)" val={`${qteBase}`} last />
      </div>

      <div className="space-y-2">
        <button className="min-h-touch w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white">
          Ajouter à la réclamation
        </button>
        <div className="flex gap-2">
          <button className="min-h-touch flex-1 rounded-xl bg-slate-700 py-3 text-sm font-bold">
            Confirmer
          </button>
          <button className="min-h-touch flex-1 rounded-xl border border-slate-600 py-3 text-sm font-bold text-slate-300">
            Ignorer
          </button>
        </div>
      </div>
      <p className="text-center text-[11px] text-slate-500">
        Aperçu de démo — les actions seront branchées avec Supabase.
      </p>
    </section>
  );
}

function Kv({
  label,
  val,
  accent,
  last,
}: {
  label: string;
  val: string;
  accent?: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex justify-between py-2 text-[13px] ${
        last ? '' : 'border-b border-slate-700'
      }`}
    >
      <span className="text-slate-400">{label}</span>
      <span className={`font-bold tabular-nums ${accent ?? ''}`}>{val}</span>
    </div>
  );
}
