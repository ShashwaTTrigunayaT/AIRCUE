import { useEffect, useState } from 'react';
import { Check, Copy, Download, Share2, X } from 'lucide-react';
import { STANDARD_LABELS, categoryColor, guidanceFor } from '../utils/aqi.js';
import { formatDateTime, formatNumber, locationSubtitle, locationTitle } from '../utils/format.js';

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const FONT_STACK = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

function slugify(text) {
  return String(text || 'location')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapLines(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const lines = wrapLines(ctx, text, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function drawCard(canvas, { current, standard, block, category, guidance }) {
  const ctx = canvas.getContext('2d');
  const color = categoryColor(standard, category.key);
  const title = locationTitle(current.location);
  const subtitle = locationSubtitle(current.location) || 'Selected coordinates';
  const pm25 = current.pollutants.find((pollutant) => pollutant.key === 'pm2_5');
  const pm10 = current.pollutants.find((pollutant) => pollutant.key === 'pm10');
  const dominant = block.dominant;

  ctx.fillStyle = '#f4fbf9';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.fillStyle = '#0b5f58';
  ctx.fillRect(0, 0, CARD_WIDTH, 210);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.font = `800 58px ${FONT_STACK}`;
  ctx.fillText('AIR CUE', 72, 108);
  ctx.font = `500 27px ${FONT_STACK}`;
  ctx.fillStyle = '#ccfbf1';
  ctx.fillText('Breathe smarter', 74, 153);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 22px ${FONT_STACK}`;
  ctx.fillText('AIR QUALITY SNAPSHOT', CARD_WIDTH - 72, 96);
  ctx.fillStyle = '#ccfbf1';
  ctx.font = `400 22px ${FONT_STACK}`;
  ctx.fillText(formatDateTime(current.dataTimestamp, current.location.timezone), CARD_WIDTH - 72, 136);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0c2b29';
  ctx.font = `700 62px ${FONT_STACK}`;
  const afterTitle = drawWrappedText(ctx, title, 72, 302, 900, 70, 2);
  ctx.fillStyle = '#5a736f';
  ctx.font = `400 28px ${FONT_STACK}`;
  ctx.fillText(subtitle.slice(0, 90), 74, afterTitle + 12);

  ctx.fillStyle = color;
  ctx.font = `800 220px ${FONT_STACK}`;
  ctx.fillText(String(block.value), 68, 660);

  ctx.font = `700 50px ${FONT_STACK}`;
  ctx.fillText(category.label, 76, 724);

  ctx.fillStyle = '#33514e';
  ctx.font = `600 28px ${FONT_STACK}`;
  ctx.fillText(`${STANDARD_LABELS[standard]?.long || standard} · ${current.measurementType} data`, 76, 774);

  ctx.fillStyle = 'rgba(11, 95, 88, 0.09)';
  roundedRect(ctx, 790, 455, 218, 58, 29);
  ctx.fill();
  ctx.fillStyle = '#0b5f58';
  ctx.font = `700 22px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText('MODELLED', 899, 492);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, 72, 820, 936, 190, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(15, 92, 84, 0.16)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const metrics = [
    { label: 'PM2.5', value: pm25?.available ? `${formatNumber(pm25.value, 1)} µg/m³` : 'Unavailable' },
    { label: 'PM10', value: pm10?.available ? `${formatNumber(pm10.value, 1)} µg/m³` : 'Unavailable' },
    { label: 'DOMINANT', value: dominant?.label || 'Not attributed' },
  ];
  metrics.forEach((metric, index) => {
    const x = 112 + index * 300;
    ctx.fillStyle = '#7c918e';
    ctx.font = `700 20px ${FONT_STACK}`;
    ctx.fillText(metric.label, x, 872);
    ctx.fillStyle = index === 2 ? '#0b5f58' : '#0c2b29';
    ctx.font = `700 36px ${FONT_STACK}`;
    ctx.fillText(metric.value, x, 925);
  });

  ctx.fillStyle = '#0b5f58';
  ctx.font = `700 22px ${FONT_STACK}`;
  ctx.fillText('HEALTH GUIDANCE', 76, 1060);
  ctx.fillStyle = '#33514e';
  ctx.font = `400 29px ${FONT_STACK}`;
  drawWrappedText(ctx, `${guidance.headline} ${guidance.outdoors}`, 76, 1105, 920, 40, 3);

  ctx.strokeStyle = 'rgba(15, 92, 84, 0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(72, 1248);
  ctx.lineTo(CARD_WIDTH - 72, 1248);
  ctx.stroke();

  ctx.fillStyle = '#5a736f';
  ctx.font = `400 21px ${FONT_STACK}`;
  ctx.fillText(`Modelled data · ${current.provider} (${current.dataset || 'CAMS'})`, 72, 1288);
  ctx.fillText('Relative information, not medical advice. Verify values in AIR CUE.', 72, 1320);
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export default function ShareCard({ open, onClose, current, standard }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const block = current?.aqi?.[standard];
  const category = block?.valid ? block.category : null;
  const guidance = guidanceFor(standard, category?.key);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [feedback]);

  if (!open || !block?.valid || !category) return null;

  const caption = [
    `${locationTitle(current.location)} — ${STANDARD_LABELS[standard]?.short || standard} ${block.value} (${category.label})`,
    `PM2.5 ${formatNumber(current.pollutants.find((p) => p.key === 'pm2_5')?.value, 1)} µg/m³ · PM10 ${formatNumber(current.pollutants.find((p) => p.key === 'pm10')?.value, 1)} µg/m³`,
    `${current.measurementType} data from ${current.provider} · ${formatDateTime(current.dataTimestamp, current.location.timezone)}`,
    guidance.headline,
    'Relative information, not medical advice.',
    `${window.location.origin}/`,
  ].join('\n');

  function makeCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    drawCard(canvas, { current, standard, block, category, guidance });
    return canvas;
  }

  async function download() {
    const canvas = makeCanvas();
    const blob = await canvasToBlob(canvas);
    if (!blob) {
      setFeedback('The card could not be rendered. Try another browser.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slugify(locationTitle(current.location))}-air-quality.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setFeedback('PNG card downloaded.');
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      const area = document.createElement('textarea');
      area.value = caption;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    setFeedback('Caption copied.');
    setTimeout(() => setCopied(false), 2200);
  }

  async function share() {
    try {
      const blob = await canvasToBlob(makeCanvas());
      const file = blob ? new File([blob], `${slugify(locationTitle(current.location))}-air-quality.png`, { type: 'image/png' }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'AIR CUE air-quality snapshot', text: caption });
      } else {
        await navigator.share({ title: 'AIR CUE air-quality snapshot', text: caption, url: window.location.href });
      }
      setFeedback('Share sheet opened.');
    } catch (error) {
      if (error?.name !== 'AbortError') setFeedback('Sharing was unavailable. Download the PNG instead.');
    }
  }

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const color = categoryColor(standard, category.key);

  return (
    <div className="modal-layer" role="presentation" onMouseDown={onClose}>
      <div
        className="share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <p className="eyebrow">Shareable snapshot</p>
            <h2 id="share-title">Share the air-quality picture</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close share dialog" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="share-preview" style={{ '--share-color': color }}>
          <div className="share-preview-head">
            <span>
              <strong>AIR CUE</strong>
              <small>Breathe smarter</small>
            </span>
            <span className="share-preview-date">{formatDateTime(current.dataTimestamp, current.location.timezone)}</span>
          </div>
          <div className="share-preview-body">
            <h3>{locationTitle(current.location)}</h3>
            <p className="share-preview-sub">{locationSubtitle(current.location) || 'Selected coordinates'}</p>
            <div className="share-preview-reading">
              <strong>{block.value}</strong>
              <div>
                <span>{category.label}</span>
                <small>{STANDARD_LABELS[standard]?.long} · {current.measurementType}</small>
              </div>
            </div>
            <div className="share-preview-metrics">
              <div>
                <span>PM2.5</span>
                <strong>{formatNumber(current.pollutants.find((p) => p.key === 'pm2_5')?.value, 1)} µg/m³</strong>
              </div>
              <div>
                <span>PM10</span>
                <strong>{formatNumber(current.pollutants.find((p) => p.key === 'pm10')?.value, 1)} µg/m³</strong>
              </div>
              <div>
                <span>Dominant</span>
                <strong>{block.dominant?.label || 'Not attributed'}</strong>
              </div>
            </div>
            <p className="share-preview-guidance">{guidance.headline}</p>
            <p className="share-preview-foot">
              {current.provider} · relative information, not medical advice
            </p>
          </div>
        </div>

        <div className="share-actions">
          <button type="button" className="btn btn-primary" onClick={download}>
            <Download size={15} aria-hidden="true" /> Download PNG
          </button>
          <button type="button" className="btn btn-ghost" onClick={copy}>
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy caption'}
          </button>
          {canNativeShare ? (
            <button type="button" className="btn btn-ghost" onClick={share}>
              <Share2 size={15} aria-hidden="true" /> Share…
            </button>
          ) : null}
        </div>

        <p className="panel-note">
          The card includes the AQI standard, modelled label, data hour and source. It deliberately avoids safety
          guarantees. Download as PNG or copy the caption for a post.
        </p>
        {feedback ? <p className="share-feedback" role="status">{feedback}</p> : null}
      </div>
    </div>
  );
}
