import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';

interface Subscription {
  sourceUrl: string;
  callbackUrl: string;
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

export default function Events() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [filterSubId, setFilterSubId] = useState('');

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

  const statusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return { bg: '#d4edda', color: '#155724' };
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
                    <button onClick={() => setSelectedEvent(evt)} style={{ cursor: 'pointer' }}>Details</button>
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
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Event Details</h2>
              <button onClick={() => setSelectedEvent(null)} style={{ cursor: 'pointer' }}>Close</button>
            </div>
            <p><strong>ID:</strong> {selectedEvent.id}</p>
            <p><strong>Type:</strong> {selectedEvent.eventType || '—'}</p>
            <p><strong>Source:</strong> {selectedEvent.source || '—'}</p>
            <p><strong>Status:</strong> {selectedEvent.status}</p>
            <p><strong>Attempts:</strong> {selectedEvent.attempts}</p>
            {selectedEvent.lastError && (
              <p><strong>Last Error:</strong> <span style={{ color: 'red' }}>{selectedEvent.lastError}</span></p>
            )}
            <p><strong>Subscription:</strong> {selectedEvent.subscription.sourceUrl}</p>
            <p><strong>Callback:</strong> {selectedEvent.subscription.callbackUrl}</p>
            <p><strong>Received:</strong> {new Date(selectedEvent.createdAt).toLocaleString()}</p>
            <h3>Payload</h3>
            <pre style={{ background: '#f4f4f4', padding: '0.75rem', borderRadius: 4, overflow: 'auto', maxHeight: 200 }}>
              {JSON.stringify(selectedEvent.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
