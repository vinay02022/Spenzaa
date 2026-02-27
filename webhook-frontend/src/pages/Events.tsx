import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Subscription {
  sourceUrl: string;
  callbackUrl: string;
}

interface DeliveryAttempt {
  id: string;
  attemptNumber: number;
  status: 'SUCCESS' | 'FAILED';
  httpStatus: number | null;
  responseBodySnippet: string | null;
  errorMessage: string | null;
  nextRetryAt: string | null;
  createdAt: string;
}

interface WebhookEvent {
  id: string;
  payload: Record<string, unknown>;
  eventType: string | null;
  source: string | null;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  subscriptionId: string;
  subscription: Subscription;
}

interface EventDetail extends WebhookEvent {
  deliveryAttempts: DeliveryAttempt[];
}

interface SseEventData {
  eventId: string;
  subscriptionId: string;
  eventType?: string | null;
  source?: string | null;
  status: string;
  attempts: number;
  lastError?: string | null;
  timestamp: string;
}

export default function Events() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filterSubId, setFilterSubId] = useState('');
  const [streamConnected, setStreamConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const query = filterSubId ? `?subscriptionId=${filterSubId}` : '';
      const data = await apiFetch<WebhookEvent[]>(`/events${query}`);
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch events', err);
    } finally {
      setLoading(false);
    }
  }, [filterSubId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // SSE stream connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const url = `${API_URL}/events/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setStreamConnected(true);
    };

    const handleSseEvent = (e: MessageEvent) => {
      const data: SseEventData = JSON.parse(e.data);

      setEvents((prev) => {
        const idx = prev.findIndex((evt) => evt.id === data.eventId);
        if (idx >= 0) {
          // Update existing event in-place
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            status: data.status,
            attempts: data.attempts,
            lastError: data.lastError ?? updated[idx].lastError,
          };
          return updated;
        }
        // New event — we only have partial data from SSE, refetch for full list
        fetchEvents();
        return prev;
      });
    };

    es.addEventListener('event.received', handleSseEvent);
    es.addEventListener('event.delivered', handleSseEvent);
    es.addEventListener('event.failed', handleSseEvent);
    es.addEventListener('event.processing', handleSseEvent);

    es.onerror = () => {
      setStreamConnected(false);
      // EventSource auto-reconnects by default
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setStreamConnected(false);
    };
  }, [fetchEvents]);

  async function openDetail(eventId: string) {
    setDetailLoading(true);
    try {
      const detail = await apiFetch<EventDetail>(`/events/${eventId}`);
      setSelectedEvent(detail);
    } catch (err) {
      console.error('Failed to fetch event detail', err);
    } finally {
      setDetailLoading(false);
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': case 'SUCCESS': return { bg: '#d4edda', color: '#155724' };
      case 'FAILED': return { bg: '#f8d7da', color: '#721c24' };
      case 'PROCESSING': return { bg: '#fff3cd', color: '#856404' };
      default: return { bg: '#d1ecf1', color: '#0c5460' };
    }
  };

  return (
    <div>
      <h1>Webhook Events</h1>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          placeholder="Filter by subscription ID..."
          value={filterSubId}
          onChange={(e) => setFilterSubId(e.target.value)}
          style={{ padding: '0.5rem', flex: 1 }}
        />
        <button onClick={fetchEvents} style={{ padding: '0.5rem 1rem' }}>Refresh</button>
        <span
          title={streamConnected ? 'Live stream connected' : 'Stream disconnected'}
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: streamConnected ? '#28a745' : '#dc3545',
          }}
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : events.length === 0 ? (
        <p>No events received yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem' }}>Type</th>
              <th style={{ padding: '0.5rem' }}>Source</th>
              <th style={{ padding: '0.5rem' }}>Status</th>
              <th style={{ padding: '0.5rem' }}>Attempts</th>
              <th style={{ padding: '0.5rem' }}>Received</th>
              <th style={{ padding: '0.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((evt) => {
              const sc = statusColor(evt.status);
              return (
                <tr key={evt.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem' }}>{evt.eventType || '—'}</td>
                  <td style={{ padding: '0.5rem' }}>{evt.source || evt.subscription.sourceUrl}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{ padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.85rem', backgroundColor: sc.bg, color: sc.color }}>
                      {evt.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem' }}>{evt.attempts}</td>
                  <td style={{ padding: '0.5rem' }}>{new Date(evt.createdAt).toLocaleString()}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <button onClick={() => openDetail(evt.id)} disabled={detailLoading} style={{ cursor: 'pointer' }}>
                      Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {selectedEvent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, maxWidth: 700, width: '90%', maxHeight: '85vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Event Details</h2>
              <button onClick={() => setSelectedEvent(null)} style={{ cursor: 'pointer' }}>Close</button>
            </div>
            <p><strong>ID:</strong> {selectedEvent.id}</p>
            <p><strong>Type:</strong> {selectedEvent.eventType || '—'}</p>
            <p><strong>Source:</strong> {selectedEvent.source || '—'}</p>
            <p>
              <strong>Status:</strong>{' '}
              {(() => { const sc = statusColor(selectedEvent.status); return (
                <span style={{ padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.85rem', backgroundColor: sc.bg, color: sc.color }}>
                  {selectedEvent.status}
                </span>
              ); })()}
            </p>
            <p><strong>Attempts:</strong> {selectedEvent.attempts}</p>
            {selectedEvent.lastError && (
              <p><strong>Last Error:</strong> <span style={{ color: 'red' }}>{selectedEvent.lastError}</span></p>
            )}
            <p><strong>Subscription:</strong> {selectedEvent.subscription.sourceUrl}</p>
            <p><strong>Callback:</strong> {selectedEvent.subscription.callbackUrl}</p>
            <p><strong>Received:</strong> {new Date(selectedEvent.createdAt).toLocaleString()}</p>

            <h3>Payload</h3>
            <pre style={{ background: '#f4f4f4', padding: '0.75rem', borderRadius: 4, overflow: 'auto', maxHeight: 150 }}>
              {JSON.stringify(selectedEvent.payload, null, 2)}
            </pre>

            <h3>Delivery Attempts</h3>
            {selectedEvent.deliveryAttempts.length === 0 ? (
              <p style={{ color: '#666' }}>No delivery attempts yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                    <th style={{ padding: '0.4rem' }}>#</th>
                    <th style={{ padding: '0.4rem' }}>Status</th>
                    <th style={{ padding: '0.4rem' }}>HTTP</th>
                    <th style={{ padding: '0.4rem' }}>Error</th>
                    <th style={{ padding: '0.4rem' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEvent.deliveryAttempts.map((attempt) => {
                    const asc = statusColor(attempt.status);
                    return (
                      <tr key={attempt.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.4rem' }}>{attempt.attemptNumber}</td>
                        <td style={{ padding: '0.4rem' }}>
                          <span style={{ padding: '0.15rem 0.4rem', borderRadius: 4, fontSize: '0.8rem', backgroundColor: asc.bg, color: asc.color }}>
                            {attempt.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.4rem' }}>{attempt.httpStatus ?? '—'}</td>
                        <td style={{ padding: '0.4rem', color: 'red', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {attempt.errorMessage || '—'}
                        </td>
                        <td style={{ padding: '0.4rem' }}>{new Date(attempt.createdAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
