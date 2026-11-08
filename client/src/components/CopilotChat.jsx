import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Mic, MicOff, Send, TriangleAlert, Volume2, VolumeX } from 'lucide-react';
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

const VOICE_ERRORS = {
  'not-allowed': 'Microphone permission was denied. Allow microphone access in your browser to use voice input.',
  'service-not-allowed': 'Voice input is blocked by the browser. Check microphone permissions and try again.',
  'audio-capture': 'No microphone was found. Check that one is connected and available.',
  'no-speech': 'No speech was detected. Try again and speak clearly.',
  network: 'The browser speech service is unavailable. Check your connection and try again.',
};

export default function CopilotChat({ location, current, aiStatus }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [speakReplies, setSpeakReplies] = useState(false);
  const listRef = useRef(null);
  const recognitionRef = useRef(null);

  const voiceSupported =
    typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    setMessages([]);
    setError(null);
    setInput('');
    setVoiceError(null);
    setListening(false);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, [location?.latitude, location?.longitude]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [],
  );

  const disabled = aiStatus && aiStatus.enabled === false;

  function speakAnswer(text) {
    if (!speechSupported || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = navigator.language || 'en-IN';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }

  async function ask(question) {
    const trimmed = (question ?? input).trim();
    if (!trimmed || sending || disabled) return;

    if (speechSupported) window.speechSynthesis.cancel();
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
      if (speakReplies) speakAnswer(response.answer);
    } catch (err) {
      setError(err?.message || 'AIRCUE Copilot could not answer right now.');
    } finally {
      setSending(false);
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  function toggleListening() {
    if (!voiceSupported || disabled || sending) return;
    if (listening) {
      stopListening();
      return;
    }

    setVoiceError(null);
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || '';
        if (event.results[index].isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }
      const spoken = (finalTranscript || interimTranscript).trim();
      if (spoken) setInput(spoken);
      if (finalTranscript.trim().length >= 3) {
        recognition.stop();
        setListening(false);
        ask(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === 'aborted') return;
      setVoiceError(VOICE_ERRORS[event.error] || 'Voice input could not be completed. Please try again.');
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setVoiceError('Voice input could not start. Check microphone permissions and try again.');
    }
  }

  return (
    <section className="panel chat-panel" aria-labelledby="chat-title">
      <header className="chat-header">
        <div>
          <p className="eyebrow">AIRCUE Copilot</p>
          <h2 id="chat-title">Ask about this location</h2>
          <p className="section-description">
            AIRCUE Copilot receives the current reading, forecast, trend and provenance already loaded for{' '}
            {current?.location?.name || location?.name || 'this location'}.
          </p>
        </div>
        <div className="chat-header-actions">
          <Badge tone={disabled ? 'muted' : 'ai'} icon={Bot}>
            {disabled ? 'Copilot disabled' : 'AIRCUE Copilot'}
          </Badge>
          {speechSupported ? (
            <button
              type="button"
              className={`chat-speak-toggle ${speakReplies ? 'is-on' : ''}`}
              aria-label={speakReplies ? 'Turn spoken replies off' : 'Read replies aloud'}
              aria-pressed={speakReplies}
              title={speakReplies ? 'Spoken replies are on' : 'Read replies aloud'}
              onClick={() =>
                setSpeakReplies((currentValue) => {
                  if (currentValue) window.speechSynthesis.cancel();
                  return !currentValue;
                })
              }
            >
              {speakReplies ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
            </button>
          ) : null}
        </div>
      </header>

      {disabled ? (
        <InlineNotice tone="warning" title="AIRCUE Copilot is not configured">
          {aiStatus?.reason || 'Set GROQ_API_KEYS (or GROQ_API_KEY) on the server to enable AIRCUE Copilot.'} The dashboard, map, forecast,
          Clean Air Finder and alerts all work without it.
        </InlineNotice>
      ) : null}

      <div className="chat-log" ref={listRef} aria-live="polite">
        {!messages.length ? (
          <div className="chat-intro">
            <Bot size={22} aria-hidden="true" />
            <p>
              Ask a practical question, by text or microphone. AIRCUE Copilot is instructed to use only the supplied
              AIR CUE data for location-specific claims, to name the source, and to say when the data is insufficient.
            </p>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`chat-message chat-${message.role}`}>
            <span className="chat-role">{message.role === 'user' ? 'You' : 'AIRCUE Copilot'}</span>
            <div className="chat-bubble">
              <p className="chat-text">{message.content}</p>
              {message.meta ? (
                <p className="chat-meta">
                  AIRCUE Copilot · grounded on a {message.meta.measurementType} reading for{' '}
                  {formatDateTime(message.meta.dataTimestamp, location?.timezone)}
                  {message.meta.standard ? ` · ${STANDARD_LABELS[message.meta.standard]?.short || message.meta.standard}` : ''}
                </p>
              ) : null}
            </div>
          </div>
        ))}

        {sending ? (
          <div className="chat-message chat-assistant">
            <span className="chat-role">AIRCUE Copilot</span>
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

      {listening ? (
        <p className="chat-voice-status" role="status">
          Listening… speak your question. It sends automatically when you finish.
        </p>
      ) : null}
      {voiceError ? (
        <p className="chat-voice-error" role="status">
          {voiceError}
        </p>
      ) : null}

      <form
        className="chat-input"
        onSubmit={(event) => {
          event.preventDefault();
          stopListening();
          ask();
        }}
      >
        <label htmlFor="copilot-question" className="sr-only">
          Ask the AIRCUE Copilot a question
        </label>
        <button
          type="button"
          className={`chat-mic ${listening ? 'is-listening' : ''}`}
          aria-label={listening ? 'Stop voice input' : 'Ask by voice'}
          aria-pressed={listening}
          title={voiceSupported ? (listening ? 'Stop listening' : 'Ask by voice') : 'Voice input is not supported in this browser'}
          onClick={toggleListening}
          disabled={disabled || sending || !voiceSupported}
        >
          {listening ? <MicOff size={17} aria-hidden="true" /> : <Mic size={17} aria-hidden="true" />}
        </button>
        <input
          id="copilot-question"
          type="text"
          value={input}
          maxLength={500}
          placeholder={
            disabled
              ? 'Copilot unavailable'
              : listening
                ? 'Listening…'
                : voiceSupported
                  ? 'Ask by text or tap the microphone…'
                  : 'Ask about the air at this location…'
          }
          disabled={disabled || sending}
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={disabled || sending || input.trim().length < 3}>
          {sending ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
          Ask
        </button>
      </form>

      <p className="panel-note">
        AIRCUE Copilot explanations can be wrong. Location-specific claims are grounded in the loaded AIR CUE data, but
        verify numbers against the dashboard. The Copilot does not diagnose conditions or guarantee that air is safe.
        {voiceSupported
          ? ' Voice input uses your browser’s speech recognition service; AIR CUE does not store audio.'
          : ' Voice input needs a browser with the Web Speech API (Chrome or Edge).'}
      </p>
    </section>
  );
}
