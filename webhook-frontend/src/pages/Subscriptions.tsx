import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { apiFetch } from '../lib/api';

interface Subscription {
  id: string;
  sourceUrl: string;
  callbackUrl: string;
  status: 'ACTIVE' | 'CANCELLED';
  eventTypes: string[];
  createdAt: string;
}

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const data = await apiFetch<Subscription[]>('/webhooks');
      setSubscriptions(data);
    } catch (err) {
      console.error('Failed to fetch subscriptions', err);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  async function handleSubscribe(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/webhooks/subscribe', {
        method: 'POST',
        body: JSON.stringify({ sourceUrl, callbackUrl }),
      });
      setSourceUrl('');
      setCallbackUrl('');
      await fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: string) {
    try {
      await apiFetch(`/webhooks/${id}`, { method: 'DELETE' });
      await fetchSubscriptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel');
    }
  }

  return (
    <div>
      <h1>Webhook Subscriptions</h1>

      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: 4 }}>
        <h2>Subscribe to a Webhook</h2>
        <form onSubmit={handleSubscribe}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label htmlFor="sourceUrl">Source URL</label>
            <input
              id="sourceUrl"
              type="url"
              placeholder="https://example.com/webhooks"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              required
              style={{ display: 'block', width: '100%', padding: '0.5rem' }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label htmlFor="callbackUrl">Callback URL</label>
            <input
              id="callbackUrl"
              type="url"
              placeholder="https://myapp.com/callback"
              value={callbackUrl}
              onChange={(e) => setCallbackUrl(e.target.value)}
              required
              style={{ display: 'block', width: '100%', padding: '0.5rem' }}
            />
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem' }}>
            {loading ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>
      </section>

      <section>
        <h2>Your Subscriptions</h2>
        {listLoading ? (
          <p>Loading...</p>
        ) : subscriptions.length === 0 ? (
          <p>No subscriptions yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Source URL</th>
                <th style={{ padding: '0.5rem' }}>Callback URL</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
                <th style={{ padding: '0.5rem' }}>Created</th>
                <th style={{ padding: '0.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem', wordBreak: 'break-all' }}>{sub.sourceUrl}</td>
                  <td style={{ padding: '0.5rem', wordBreak: 'break-all' }}>{sub.callbackUrl}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: 4,
                      fontSize: '0.85rem',
                      backgroundColor: sub.status === 'ACTIVE' ? '#d4edda' : '#f8d7da',
                      color: sub.status === 'ACTIVE' ? '#155724' : '#721c24',
                    }}>
                      {sub.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem' }}>{new Date(sub.createdAt).toLocaleString()}</td>
                  <td style={{ padding: '0.5rem' }}>
                    {sub.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleCancel(sub.id)}
                        style={{ padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
