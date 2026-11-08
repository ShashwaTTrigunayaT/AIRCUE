import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Sparkles, TriangleAlert } from 'lucide-react';
import { api } from '../services/api.js';
import { Badge, InlineNotice } from './States.jsx';
import { STANDARD_LABELS } from '../utils/aqi.js';
import { formatDateTime } from '../utils/format.js';

const SUGGESTIONS = [
  'Why is the air quality at this level today?',
  'Which pollutant is the main concern in the available data?',
  'When is the comparatively better time for a walk?',
  'Is tomorrow’s forecast better than today?',
  'What does PM2.5 mean, and why does it matter?',
  'What precautions make sense at this AQI level?',
];

export default function CopilotChat({ location, current, aiStatus }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    setMessages([]);
    setError(null);
    setInput('');
  }, [location?.latitude, location?.longitude]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const disabled = aiStatus && aiStatus.enabled === false;

  async function ask(question) {
    const trimmed = (question ?? input).trim();
    if (!trimmed || sending || disabled) return;

    setMessages((previous) => [...previous, { role: 'user', content: trimmed }]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const response = await api.assistant(location, trimmed);
      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: response.answer,
          meta: {
            model: response.model,
            provider: response.provider,
            dataTimestamp: response.groundedOn?.dataTimestamp,
            measurementType: response.groundedOn?.measurementType,
            standard: response.groundedOn?.aqiStandard,
          },
        },
      ]);
    } catch (err) {
      setError(err?.message || 'The assistant could not answer right now.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="panel chat-panel" aria-labelledby="chat-title">
      <header className="chat-header">
        <div>
          <p className="eyebrow">AI assistant</p>
          <h2 id="chat-title">Ask about this location</h2>
          <p className="section-description">
            The assistant receives the current reading, forecast, trend and provenance already loaded for{' '}
            {current?.location?.name || location?.name || 'this location'}.
          </p>
        </div>
        <Badge tone={disabled ? 'muted' : 'ai'} icon={Sparkles}>
          {disabled ? 'AI disabled' : `Groq${aiStatus?.model ? ` · ${aiStatus.model}` : ''}`}
        </Badge>
      </header>

      {disabled ? (
        <InlineNotice tone="warning" title="AI assistant is not configured">
          {aiStatus?.reason || 'Set GROQ_API_KEY on the server to enable the assistant.'} The dashboard, map, forecast,
          Clean Air Finder and alerts all work without it.
        </InlineNotice>
      ) : null}

      <div className="chat-log" ref={listRef} aria-live="polite">
        {!messages.length ? (
          <div className="chat-intro">
            <Sparkles size={22} aria-hidden="true" />
            <p>
              Ask a practical question. The assistant is instructed to use only the supplied AIR CUE data for
              location-specific claims, to name the source, and to say when the data is insufficient.
            </p>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`chat-message chat-${message.role}`}>
            <span className="chat-role">{message.role === 'user' ? 'You' : 'AIR CUE'}</span>
            <div className="chat-bubble">
              <p className="chat-text">{message.content}</p>
              {message.meta ? (
                <p className="chat-meta">
                  {message.meta.provider} {message.meta.model ? `· ${message.meta.model}` : ''} · grounded on a{' '}
                  {message.meta.measurementType} reading for{' '}
                  {formatDateTime(message.meta.dataTimestamp, location?.timezone)}
                  {message.meta.standard ? ` · ${STANDARD_LABELS[message.meta.standard]?.short || message.meta.standard}` : ''}
                </p>
              ) : null}
            </div>
          </div>
        ))}

        {sending ? (
          <div className="chat-message chat-assistant">
            <span className="chat-role">AIR CUE</span>
            <div className="chat-bubble chat-typing">
              <Loader2 className="spin" size={16} aria-hidden="true" /> Reading the latest AIR CUE data…
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="chat-error" role="alert">
          <TriangleAlert size={15} aria-hidden="true" /> {error}
        </div>
      ) : null}

      {!messages.length && !disabled ? (
        <div className="chat-suggestions">
          {SUGGESTIONS.map((suggestion) => (
            <button key={suggestion} type="button" className="chip chip-button" onClick={() => ask(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="chat-input"
        onSubmit={(event) => {
          event.preventDefault();
          ask();
        }}
      >
        <label htmlFor="copilot-question" className="sr-only">
          Ask the AIR CUE assistant a question
        </label>
        <input
          id="copilot-question"
          type="text"
          value={input}
          maxLength={500}
          placeholder={disabled ? 'AI assistant unavailable' : 'Ask about the air at this location…'}
          disabled={disabled || sending}
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={disabled || sending || input.trim().length < 3}>
          {sending ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
          Ask
        </button>
      </form>

      <p className="panel-note">
        AI explanations can be wrong. Location-specific claims are grounded in the loaded AIR CUE data, but verify
        numbers against the dashboard. The assistant does not diagnose conditions or guarantee that air is safe.
      </p>
    </section>
  );
}
