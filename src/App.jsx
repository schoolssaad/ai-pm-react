import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [user, setUser] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [tasks, setTasks] = useState([]);
  const [listId, setListId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // ✅ SAFE: No nested destructuring
    const checkSession = async () => {
      const response = await supabase.auth.getSession();
      const session = response?.data?.session;
      setUser(session?.user || null);
    };
    checkSession();

    // ✅ SAFE: Handle subscription without complex destructuring
    const authListener = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    // Cleanup
    return () => {
      if (authListener && authListener.data && authListener.data.subscription) {
        authListener.data.subscription.unsubscribe();
      }
    };
  }, []);

  const handleLogin = () => supabase.auth.signInWithOAuth({ provider: 'google' });
  const handleLogout = () => {
    supabase.auth.signOut();
    setUser(null);
    setTasks([]);
  };

  const generateTasks = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    const sessionResponse = await supabase.auth.getSession();
    const session = sessionResponse?.data?.session;
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await axios.post(
        `${BACKEND_URL}/ai/generate-tasks`,
        { prompt },
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error(err);
      alert('Failed to generate tasks');
    } finally {
      setLoading(false);
    }
  };

  const sendToTrello = async (task) => {
    if (!listId) return alert('Enter Trello List ID');
    
    const sessionResponse = await supabase.auth.getSession();
    const session = sessionResponse?.data?.session;
    if (!session) return;

    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      await axios.post(
        `${BACKEND_URL}/trello/create-card`,
        { list_id: listId, task },
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      alert('✅ Added to Trello!');
    } catch (err) {
      console.error(err);
      alert('Trello sync failed');
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>🤖 AI Project Manager</h1>
        <button onClick={handleLogin}>Login with Google</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>AI Project Manager</h1>
      <button onClick={handleLogout}>Logout</button>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g., Launch a website"
      />
      <button onClick={generateTasks} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Tasks'}
      </button>

      <input
        value={listId}
        onChange={(e) => setListId(e.target.value)}
        placeholder="Trello List ID"
        style={{ width: '100%', marginTop: '1rem' }}
      />

      {tasks.map((task, i) => (
        <div key={i} style={{ border: '1px solid #ccc', margin: '1rem 0', padding: '1rem' }}>
          <h3>{task.title}</h3>
          <p>{task.description}</p>
          <button onClick={() => sendToTrello(task)}>➕ Add to Trello</button>
        </div>
      ))}
    </div>
  );
}
