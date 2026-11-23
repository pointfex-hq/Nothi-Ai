'use client';

import type { EntityRow, EntityValue } from '@/types';
import { useLang } from '@/lib/lang';

interface EntityMatrixProps {
  rows: EntityRow[];
}

function renderCell(val?: EntityValue) {
  if (!val) {
    return <span className="text-ink-muted/40 font-mono text-xs">—</span>;
  }

  const hasBoth = val.en && val.bn && val.en !== val.bn;

  return (
    <div className="flex flex-col text-xs">
      {val.en && <span className="font-mono text-ink">{val.en}</span>}
      {hasBoth && <span className="text-[11px] text-ink-muted bangla">{val.bn}</span>}
      {!val.en && val.bn && <span className="text-ink bangla">{val.bn}</span>}
      {!val.en && !val.bn && val.raw && <span className="font-mono text-ink">{val.raw}</span>}
    </div>
  );
}

export function EntityMatrix({ rows }: EntityMatrixProps) {
  const { lang, t } = useLang();

  if (!rows || rows.length === 0) {
    return null;
  }

  return (
    <section className="rounded-sm border border-border bg-surface p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-green-deep">
            {t('audit.matrix')}
          </h2>
          <p className="text-xs text-ink-muted">
            {lang === 'bn'
              ? 'দলিলসমূহ জুড়ে নিষ্কাশিত তথ্যের তুলনামূলক সারণী।'
              : 'Deterministic cross-document entity alignment (Deed, Khatian, NID).'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="flex items-center gap-1 text-flag-green">
            <span>●</span> {lang === 'bn' ? 'মিল' : 'Match'}
          </span>
          <span className="flex items-center gap-1 text-vermillion font-bold ml-2">
            <span>▲</span> {lang === 'bn' ? 'অমিল' : 'Discrepancy'}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto border border-border rounded-sm bg-paper">
        <table
          className="w-full text-left border-collapse text-xs"
          aria-label="Cross-document entity comparison matrix"
        >
          <thead>
            <tr className="bg-paper-dark/70 border-b border-border text-ink-muted font-mono uppercase text-[11px]">
              <th scope="col" className="p-2.5 font-semibold">Entity Field</th>
              <th scope="col" className="p-2.5 font-semibold">Saf Kabala Deed</th>
              <th scope="col" className="p-2.5 font-semibold">RS/BS Khatian</th>
              <th scope="col" className="p-2.5 font-semibold">National ID</th>
              <th scope="col" className="p-2.5 font-semibold text-center w-20">Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const isMismatch = !row.match;
              return (
                <tr
                  key={row.field}
                  className={`transition-colors ${
                    isMismatch
                      ? 'bg-vermillion/10 hover:bg-vermillion/15'
                      : 'hover:bg-paper-light'
                  }`}
                >
                  {/* Field Label */}
                  <td className="p-2.5 font-medium text-ink align-top">
                    <div>{lang === 'bn' ? row.label.bn : row.label.en}</div>
                    <div className="text-[10px] font-mono text-ink-muted">{row.field}</div>
                  </td>

                  {/* Deed Column */}
                  <td className={`p-2.5 align-top ${isMismatch && row.deed ? 'font-semibold text-vermillion' : ''}`}>
                    {renderCell(row.deed)}
                  </td>

                  {/* Khatian Column */}
                  <td className={`p-2.5 align-top ${isMismatch && row.khatian ? 'font-semibold text-vermillion' : ''}`}>
                    {renderCell(row.khatian)}
                  </td>

                  {/* NID Column */}
                  <td className={`p-2.5 align-top ${isMismatch && row.nid ? 'font-semibold text-vermillion' : ''}`}>
                    {renderCell(row.nid)}
                  </td>

                  {/* Match Indicator */}
                  <td className="p-2.5 align-top text-center">
                    {row.match ? (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-flag-green/10 text-flag-green font-mono text-[11px] font-bold"
                        title="Values match or consistent"
                      >
                        ✓ OK
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-vermillion text-paper font-mono text-[11px] font-bold shadow-xs animate-pulse"
                        title="Discrepancy detected across records"
                      >
                        ▲ DIFF
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
