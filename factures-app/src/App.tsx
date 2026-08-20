import { useEffect, useState } from 'react';
import { supabaseConfigured } from './lib/supabase';
import {
  enqueue,
  listQueue,
  autoDrainOnReconnect,
  type UploadItem,
} from './lib/offline-queue';

type Onglet = 'accueil' | 'scan' | 'factures' | 'prix' | 'reglages';

const ETAB_DEMO = 'demo-etablissement';

export default function App() {
  const [onglet, setOnglet] = useState<Onglet>('accueil');
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [enLigne, setEnLigne] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  async function rafraichirQueue() {
    setQueue(await listQueue());
  }

  useEffect(() => {
    void rafraichirQueue();
    const on = () => setEnLigne(true);
    const off = () => setEnLigne(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    // Le drainage réel (upload Supabase) sera branché en Phase 2 ; ici on
    // rafraîchit juste la file au retour du réseau.
    const stop = autoDrainOnReconnect(async () => {
      throw new Error('upload non branché (infra à venir)');
    });
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      stop();
    };
  }, []);

  async function onFichiers(files: FileList | null) {
    if (!files || files.length === 0) return;
    await enqueue({
      etablissement_id: ETAB_DEMO,
      fichiers: Array.from(files),
      nom: `Facture ${new Date().toLocaleDateString('fr-FR')}`,
    });
    await rafraichirQueue();
  }

  return (
    <div className="mx-auto flex min-h-full max-w-[440px] flex-col">
      <header className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-3">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-400">
            Contrôle Factures
          </div>
          <div className="text-base font-bold">Fournisseurs</div>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[11px] font-medium ${
            enLigne ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
          }`}
        >
          {enLigne ? 'En ligne' : 'Hors ligne'}
        </span>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {onglet === 'accueil' && <Accueil queue={queue} configured={supabaseConfigured} />}
        {onglet === 'scan' && <Scan queue={queue} onFichiers={onFichiers} />}
        {onglet === 'factures' && <Placeholder titre="Factures à vérifier" phase="Phase 3" />}
        {onglet === 'prix' && <Placeholder titre="Mes prix négociés" phase="Phase 3" />}
        {onglet === 'reglages' && <Placeholder titre="Réglages" phase="Phase 4" />}
      </main>

      <BottomNav onglet={onglet} setOnglet={setOnglet} />
    </div>
  );
}

function Accueil({ queue, configured }: { queue: UploadItem[]; configured: boolean }) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-slate-800 p-5 text-center">
        <div className="text-[11px] uppercase tracking-widest text-slate-400">
          Argent récupéré · 2026
        </div>
        <div className="mt-1 text-5xl font-extrabold text-emerald-400">0 €</div>
        <div className="mt-1 text-xs text-slate-500">Compteur branché en Phase 4</div>
      </div>
      <Carte titre="Factures en file d'attente" valeur={String(queue.length)} />
      <Carte titre="Anomalies ouvertes" valeur="—" sous="détection en Phase 3" />
      {!configured && (
        <p className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 text-xs text-slate-400">
          Supabase n'est pas encore branché : l'app tourne en mode squelette
          hors-ligne. Les factures scannées sont stockées localement.
        </p>
      )}
    </section>
  );
}

function Scan({
  queue,
  onFichiers,
}: {
  queue: UploadItem[];
  onFichiers: (f: FileList | null) => void;
}) {
  return (
    <section className="space-y-4">
      <label className="flex min-h-touch cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-500/60 bg-slate-800 p-8 text-center">
        <span className="text-4xl">📷</span>
        <span className="font-semibold">Photographier la facture</span>
        <span className="text-xs text-slate-400">Multi-pages · une main · 1 tap</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => onFichiers(e.target.files)}
        />
      </label>

      <label className="flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-800 p-4 text-center">
        <span className="text-xl">📄</span>
        <span className="font-semibold">Importer un PDF</span>
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => onFichiers(e.target.files)}
        />
      </label>

      <div>
        <div className="mb-2 text-[11px] uppercase tracking-widest text-slate-400">
          File d'attente ({queue.length})
        </div>
        {queue.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune facture en attente.</p>
        ) : (
          <ul className="space-y-2">
            {queue.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium">{it.nom}</div>
                  <div className="text-xs text-slate-500">
                    {it.fichiers.length} page(s) · {it.statut}
                  </div>
                </div>
                <span className="text-lg">
                  {it.statut === 'echec' ? '⚠️' : it.statut === 'envoye' ? '✅' : '⏳'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Placeholder({ titre, phase }: { titre: string; phase: string }) {
  return (
    <section className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="text-lg font-bold">{titre}</div>
      <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">{phase}</div>
    </section>
  );
}

function Carte({ titre, valeur, sous }: { titre: string; valeur: string; sous?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-4">
      <div>
        <div className="text-sm font-medium">{titre}</div>
        {sous && <div className="text-xs text-slate-500">{sous}</div>}
      </div>
      <div className="text-2xl font-bold">{valeur}</div>
    </div>
  );
}

function BottomNav({
  onglet,
  setOnglet,
}: {
  onglet: Onglet;
  setOnglet: (o: Onglet) => void;
}) {
  const items: Array<{ id: Onglet; label: string; icone: string }> = [
    { id: 'accueil', label: 'Accueil', icone: '🏠' },
    { id: 'factures', label: 'Factures', icone: '🧾' },
    { id: 'scan', label: 'Scan', icone: '📷' },
    { id: 'prix', label: 'Prix', icone: '💶' },
    { id: 'reglages', label: 'Réglages', icone: '⚙️' },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[440px] border-t border-slate-700 bg-slate-800">
      {items.map((it) => {
        const actif = onglet === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setOnglet(it.id)}
            className={`flex min-h-touch flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] ${
              actif ? 'text-blue-400' : 'text-slate-500'
            }`}
          >
            <span className="text-xl">{it.icone}</span>
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
