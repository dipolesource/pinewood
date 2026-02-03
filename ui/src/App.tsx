import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './App.css';

interface Scout {
  id: number;
  name: string;
  den: string;
  car_number: number;
  car_weight: number;
  checked_in: boolean;
  created_at: string;
}

const DENS = ['Tiger', 'Wolf', 'Bear', 'Webelos', 'Arrow of Light'];

function App() {
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [name, setName] = useState('');
  const [den, setDen] = useState(DENS[0]);
  const [carNumber, setCarNumber] = useState(1);
  const [carWeight, setCarWeight] = useState(5.0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeDatabase();
    loadScouts();
    loadNextCarNumber();
  }, []);

  async function initializeDatabase() {
    try {
      await invoke('init_database');
    } catch (err) {
      console.error('Failed to initialize database:', err);
      setError(String(err));
    }
  }

  async function loadScouts() {
    try {
      const result = await invoke<Scout[]>('get_checked_in_scouts');
      setScouts(result);
    } catch (err) {
      console.error('Failed to load scouts:', err);
    }
  }

  async function loadNextCarNumber() {
    try {
      const nextNum = await invoke<number>('get_next_car_number');
      setCarNumber(nextNum);
    } catch (err) {
      console.error('Failed to get next car number:', err);
    }
  }

  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Scout name is required');
      return;
    }

    if (carWeight > 5.0) {
      setError('Car weight must be 5.0 oz or less');
      return;
    }

    if (carWeight <= 0) {
      setError('Car weight must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      const newScout = await invoke<Scout>('checkin_scout', {
        name: name.trim(),
        den,
        carNumber,
        carWeight,
      });

      setScouts([newScout, ...scouts]);

      // Reset form
      setName('');
      setDen(DENS[0]);
      setCarWeight(5.0);

      // Get next car number
      await loadNextCarNumber();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>🏁 Pinewood Derby Check-In</h1>
      </header>

      <div className="container">
        <div className="checkin-panel">
          <h2>Scout Check-In</h2>

          <form onSubmit={handleCheckin}>
            <div className="form-group">
              <label htmlFor="den">Den:</label>
              <select
                id="den"
                value={den}
                onChange={(e) => setDen(e.target.value)}
              >
                {DENS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="name">Scout Name:</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter scout name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="carNumber">Car Number:</label>
              <input
                id="carNumber"
                type="number"
                value={carNumber}
                onChange={(e) => setCarNumber(parseInt(e.target.value))}
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="carWeight">Car Weight (oz):</label>
              <input
                id="carWeight"
                type="number"
                step="0.01"
                value={carWeight}
                onChange={(e) => setCarWeight(parseFloat(e.target.value))}
                min="0.01"
                max="5.0"
                required
              />
              {carWeight > 5.0 && (
                <span className="weight-warning">⚠️ Over 5.0 oz limit!</span>
              )}
            </div>

            {error && <div className="error">{error}</div>}

            <button type="submit" disabled={loading || carWeight > 5.0}>
              {loading ? 'Checking In...' : 'Check In'}
            </button>
          </form>
        </div>

        <div className="scouts-panel">
          <h2>Checked-In Scouts ({scouts.length})</h2>

          {scouts.length === 0 ? (
            <p className="empty-message">No scouts checked in yet</p>
          ) : (
            <div className="scouts-list">
              {scouts.map((scout) => (
                <div key={scout.id} className="scout-card">
                  <div className="scout-header">
                    <span className="car-number">#{scout.car_number}</span>
                    <span className="den-badge">{scout.den}</span>
                  </div>
                  <div className="scout-name">{scout.name}</div>
                  <div className="scout-weight">{scout.car_weight.toFixed(2)} oz</div>
                </div>
              ))}
            </div>
          )}

          {scouts.length >= 4 && (
            <button className="start-race-btn">
              Start Race →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
