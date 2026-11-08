import { HeartPulse, ShieldCheck } from 'lucide-react';
import { Badge, SectionHeading } from './States.jsx';
import { STANDARD_LABELS, categoryColor, guidanceFor } from '../utils/aqi.js';

export default function HealthAdvisory({ current, standard, expanded = false }) {
  const block = current.aqi?.[standard];
  const category = block?.valid ? block.category : null;
  const guidance = guidanceFor(standard, category?.key);
  const color = category ? categoryColor(standard, category.key) : '#64748b';

  return (
    <section className="panel health-panel" aria-labelledby="health-title">
      <SectionHeading
        id="health-title"
        eyebrow="Health & safety"
        title="What this means for you"
        description="General public-health guidance for the selected category. It is not personalised medical advice."
        action={<Badge tone="provenance" icon={HeartPulse}>{STANDARD_LABELS[standard]?.short || standard}</Badge>}
      />

      {category ? (
        <>
          <div className="health-status" style={{ '--status-color': color }}>
            <span className="status-pill">{category.label}</span>
            <div>
              <p className="health-headline">{guidance.headline}</p>
              <p>{guidance.health}</p>
            </div>
          </div>

          <div className="guidance-grid">
            <div className="guidance-item">
              <h4>Sensitive groups</h4>
              <p>{guidance.sensitive}</p>
            </div>
            <div className="guidance-item">
              <h4>Outdoor activity</h4>
              <p>{guidance.outdoors}</p>
            </div>
            <div className="guidance-item">
              <h4>Mask guidance</h4>
              <p>{guidance.mask}</p>
            </div>
            <div className="guidance-item">
              <h4>Why this category applies</h4>
              <p>
                {block.averaging || 'Provider-defined averaging'} · based on a {STANDARD_LABELS[standard]?.short} value of{' '}
                {block.value}. Underlying pollutant data is modelled, not observed at a nearby station.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="state-block state-empty">
          <p className="state-title">Health guidance is unavailable</p>
          <p>{block?.reason || 'No valid AQI value is available for this standard at this hour.'}</p>
        </div>
      )}

      {expanded ? (
        <div className="health-disclaimer">
          <ShieldCheck size={17} aria-hidden="true" />
          <p>
            AIR CUE does not diagnose conditions or replace clinical advice. People with asthma, COPD, heart disease,
            older adults, children and pregnant people should follow their own care plans and local health advisories.
            If you experience chest pain or severe breathing difficulty, seek medical help immediately.
          </p>
        </div>
      ) : null}
    </section>
  );
}
