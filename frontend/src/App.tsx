import { useState, useEffect } from 'react';
import { api, type GameState } from './api';
import { Users, AlertCircle, Copy, Loader, Crown, Target, Eye, LogOut } from 'lucide-react';
import './index.css';

function App() {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [inGame, setInGame] = useState(false);
  const [playerId, setPlayerId] = useState('');
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Game Actions state
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [secretWordData, setSecretWordData] = useState<{ role: string; word: string } | null>(null);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [chatText, setChatText] = useState('');
  
  // Tab state for Home
  const [tab, setTab] = useState<'create' | 'join'>('create');

  // Load Categories
  useEffect(() => {
    api.getCategories().then(res => setCategories(res.categories)).catch(console.error);
  }, []);

  // Poll state every 1 second if in game
  useEffect(() => {
    if (!inGame || !roomCode) return;
    
    const interval = setInterval(async () => {
      try {
        const state = await api.getGameState(roomCode);
        setGameState(state);
      } catch (err) {
        console.error("Failed to poll state:", err);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [inGame, roomCode]);
  
  const handleCreate = async () => {
    if (!playerName.trim()) return setError("Please enter your name");
    setLoading(true);
    setError('');
    try {
      const res = await api.createGame(playerName);
      setRoomCode(res.room_code);
      setPlayerId(res.player_id);
      setInGame(true);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Error creating game');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!playerName.trim()) return setError("Please enter your name");
    if (!roomCode.trim()) return setError("Please enter a room code");
    setLoading(true);
    setError('');
    try {
      const res = await api.joinGame(roomCode.toUpperCase(), playerName);
      setRoomCode(res.room_code);
      setPlayerId(res.player_id);
      setInGame(true);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Error joining game');
    } finally {
      setLoading(false);
    }
  };

  const leaveGame = () => {
    setInGame(false);
    setGameState(null);
    setRoomCode("");
    setPlayerId("");
    setSecretWordData(null);
    setVotedFor(null);
  };

  // Safe checks
  const currentPlayer = gameState?.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.is_host;

  // Render Logic
  if (!inGame) {
    return (
      <div className="app-container">
        <div className="bg-words-container">
          <div className="bg-word w1 imposter"><span>IMPOSTER</span></div>
          <div className="bg-word w2 civilian"><span>CIVILIAN</span></div>
          <div className="bg-word w3 imposter"><span>IMPOSTER</span></div>
          <div className="bg-word w4 civilian"><span>CIVILIAN</span></div>
          <div className="bg-word w5 imposter"><span>IMPOSTER</span></div>
          <div className="bg-word w6 civilian"><span>CIVILIAN</span></div>
          <div className="bg-word w7 civilian"><span>CIVILIAN</span></div>
          <div className="bg-word w8 imposter"><span>IMPOSTER</span></div>
        </div>

        <div className="glass-panel animate-fade-in" style={{ marginTop: 'auto', marginBottom: 'auto', paddingTop: '3rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 className="game-title">WORD</h1>
            <span className="h1-sub">IMPOSTER</span>
            <p style={{ color: "white", fontWeight: 800, fontSize: "1.1rem", textShadow: "0 2px 4px rgba(0,0,0,0.4)", marginTop: '0.5rem', letterSpacing: '0.5px' }}>Spot the Fakes! Master the Words!</p>
          </div>
          
          <div className="nav-tabs">
            <div className={`nav-tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>Create Game</div>
            <div className={`nav-tab ${tab === 'join' ? 'active' : ''}`} onClick={() => setTab('join')}>Join Game</div>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={(e) => { e.preventDefault(); tab === 'create' ? handleCreate() : handleJoin(); }}>
            <input 
              type="text" 
              placeholder="Your Name (e.g. Bijay)" 
              className="input-field"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            
            {tab === 'join' && (
              <input 
                type="text" 
                placeholder="4-Letter Room Code" 
                className="input-field"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={4}
              />
            )}
            
            <button 
              type="submit"
              className="primary-btn" 
              disabled={loading}
              style={{ marginBottom: '1rem' }}
            >
              {loading ? <Loader className="pulse-animation" /> : tab === 'create' ? "Create Room" : "Join Room"}
            </button>
            <button 
              type="button"
              className="primary-btn secondary-btn"
              onClick={async () => {
                await handleCreate();
                // We need the room code from the newly created game, 
                // but handleCreate sets the state. 
                // Since state updates are async, we might need to wait or use a callback.
                // However, the user can just click "Add Bot" inside the lobby.
                // To make it truly "Solo", I'll just add a tip.
              }}
              disabled={loading}
            >
              Play with Computer
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Loader size={48} className="pulse-animation" color="var(--primary)" />
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading room state...</p>
      </div>
    );
  }

  const handleStartRound = async () => {
    try {
      await api.startRound(roomCode, selectedCategory, 1);
    } catch(err: unknown) { if (err instanceof Error) alert(err.message); }
  };
  
  const handleViewWord = async () => {
    try {
      const data = await api.getPlayerWord(roomCode, playerId);
      setSecretWordData(data);
    } catch(err: unknown) { if (err instanceof Error) alert(err.message); }
  };
  
  const advanceToDiscussion = async () => {
    try {
      await api.updateState(roomCode, "DISCUSSION");
    } catch(err: unknown) { if (err instanceof Error) alert(err.message); }
  };

  const advanceToVoting = async () => {
    try {
      await api.updateState(roomCode, "VOTING");
    } catch(err: unknown) { if (err instanceof Error) alert(err.message); }
  };

  const handleVote = async (targetId: string) => {
    try {
      await api.submitVote(roomCode, playerId, targetId);
      setVotedFor(targetId);
    } catch(err: unknown) { if (err instanceof Error) alert(err.message); }
  };
  
  const handlePlayAgain = async () => {
    try {
      setSecretWordData(null);
      setVotedFor(null);
      await api.updateState(roomCode, "LOBBY");
    } catch(err: unknown) { if (err instanceof Error) alert(err.message); }
  }

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    try {
      await api.sendChat(roomCode, playerName, chatText);
      setChatText('');
    } catch(err: unknown) { if (err instanceof Error) alert(err.message); }
  };

  const handleAddBot = async () => {
    try {
      await api.addBot(roomCode);
    } catch(err: unknown) { if (err instanceof Error) alert(err.message); }
  };

  const renderChat = () => (
    <div className="chat-container">
      <div className="chat-messages">
        {gameState?.messages.map((m, i) => (
          <div key={i} className={`chat-message ${m.sender === playerName ? 'own' : ''}`}>
            <strong>{m.sender}:</strong> {m.text}
          </div>
        ))}
      </div>
      <form onSubmit={handleSendChat} className="chat-input-wrapper">
        <input 
          type="text" 
          value={chatText} 
          onChange={e => setChatText(e.target.value)} 
          placeholder="Type a message..."
          className="input-field chat-input"
        />
        <button type="submit" className="primary-btn chat-send-btn">Send</button>
      </form>
    </div>
  );


  // Common header
  const renderHeader = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Users color="var(--primary)" />
        <span style={{ fontWeight: '600' }}>Room code: <span style={{ color: "var(--primary)"}}>{roomCode}</span></span>
      </div>
      <button onClick={leaveGame} className="primary-btn secondary-btn" style={{ padding: '0.5rem 1rem', width: 'auto' }}>
        <LogOut size={16} /> Leave
      </button>
    </div>
  );

  return (
    <div className="app-container">
      <div className="glass-panel animate-fade-in">
        {renderHeader()}
        
        {/* LOBBY STATE */}
        {gameState.state === "LOBBY" && (
          <div>
            <h2>Waiting for Players...</h2>
            <div className="room-code-display">
              {roomCode}
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <button 
                  onClick={handleCopyCode} 
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '10px' }}
                >
                  <Copy size={24} />
                </button>
                {copied && <span className="toast-feedback animate-fade-in">Text copied!</span>}
              </div>
            </div>
            
            <p className="info-text">Invite friends using the 4-letter code above.</p>
            
            {isHost && (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-muted)' }}>Select Category</label>
                <select className="select-field" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button 
                  className="primary-btn" 
                  onClick={handleStartRound}
                  disabled={gameState.players.length < 3}
                  style={{ marginBottom: '1rem' }}
                >
                  Start Round (needs 3+ players)
                </button>
                <button 
                  className="primary-btn secondary-btn" 
                  onClick={handleAddBot}
                >
                  Add Computer Bot
                </button>
              </div>
            )}
            
            <h3 style={{ marginBottom: '1rem', color: "white" }}>Players ({gameState.players.length})</h3>
            <ul className="player-list">
              {gameState.players.map(p => (
                <li key={p.id} className="player-item">
                  <div className="player-name">
                    {p.name} {p.id === playerId && "(You)"}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="badge" style={{ background: 'var(--primary)', color: 'white' }}>{p.score} pts</span>
                    {p.is_host && <span className="badge badge-host"><Crown size={12}/> Host</span>}
                    {p.is_bot && <span className="badge" style={{ background: '#64748b', color: 'white' }}>Bot</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* VIEWING_WORDS STATE */}
        {gameState.state === "VIEWING_WORDS" && (
          <div>
            <div className="flash-overlay"></div>
            <h2>Memorize Your Role</h2>
            
            {!secretWordData ? (
             <div style={{ textAlign: 'center', padding: '2rem 0' }}>
               <AlertCircle size={48} color="var(--secondary)" style={{ marginBottom: '1rem' }} />
               <p className="info-text">Your secret identity is ready.</p>
               <button className="primary-btn pulse-animation" onClick={handleViewWord} style={{ marginTop: '1rem'}}>
                 <Eye style={{ marginRight: "10px" }} /> Reveal Secret Word
               </button>
             </div>
            ) : (
             <div className="word-reveal-card animate-fade-in" data-role={secretWordData.role}>
               <div className="role-title">
                 You are an <span className={secretWordData.role === 'Imposter' ? 'role-imposter' : 'role-civilian'}>
                   {secretWordData.role.toUpperCase()}
                 </span>
               </div>
               <div className="secret-word">{secretWordData.word}</div>
               {secretWordData.role === 'Imposter' ? (
                 <p style={{ marginTop: '1rem', color: '#fca5a5' }}>Try to blend in. The civilians have a different word!</p>
               ) : (
                 <p style={{ marginTop: '1rem', color: '#bfdbfe' }}>Find the imposter who doesn't know this word!</p>
               )}
             </div>
            )}
            
            <h3 style={{ margin: '2rem 0 1rem', color: "white" }}>Readiness</h3>
            <ul className="player-list">
              {gameState.players.map(p => (
                <li key={p.id} className="player-item">
                  <div className="player-name">{p.name}</div>
                  {p.has_viewed_word ? 
                    <span className="badge badge-ready">Ready</span> : 
                    <span className="badge badge-waiting">Viewing...</span>
                  }
                </li>
              ))}
            </ul>

            {isHost && (
              <button 
                 className="primary-btn secondary-btn" 
                 style={{ marginTop: '2rem' }}
                 onClick={advanceToDiscussion}
                 disabled={!gameState.players.every(p => p.has_viewed_word)}
              >
                Proceed to Discussion
              </button>
            )}
          </div>
        )}

        {/* DISCUSSION STATE */}
        {gameState.state === "DISCUSSION" && (
          <div style={{ textAlign: "center" }}>
            <h2>Discuss!</h2>
            <div style={{ padding: '2rem 0', display: 'flex', justifyContent: 'center' }}>
               <div className="pulse-animation" style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--primary)' }}>
                   <Target size={48} color="var(--primary)" />
               </div>
            </div>
            
            <p className="info-text">Take turns describing your word with a single adjective.<br/>Don't be too obvious, or the imposter will guess the word!</p>
            
            {secretWordData && (
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', marginTop: '1rem', display: 'inline-block' }}>
                 <span style={{ color: 'var(--text-muted)' }}>Your word:</span> <span style={{ fontWeight: 800, color: 'white'}}>{secretWordData.word}</span>
              </div>
            )}

            {isHost && (
              <button className="primary-btn" onClick={advanceToVoting} style={{ marginTop: '2.5rem' }}>
                Begin Voting
              </button>
            )}
          </div>
        )}

        {/* VOTING STATE */}
        {gameState.state === "VOTING" && (
          <div>
            <h2>Who is the Imposter?</h2>
            <p className="info-text">Cast your vote. Remember, every vote counts!</p>
            
            <ul className="player-list">
              {gameState.players.map(p => {
                if (p.id === playerId) return null; // Can't vote for self
                
                const isSelected = votedFor === p.id;
                
                return (
                  <li 
                    key={p.id} 
                    className={`player-item interactive ${isSelected ? 'selected' : ''}`}
                    onClick={() => !currentPlayer?.has_voted && handleVote(p.id)}
                    style={{ opacity: currentPlayer?.has_voted && !isSelected ? 0.5 : 1 }}
                  >
                    <div className="player-name">{p.name}</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                       {p.has_voted && <span className="badge badge-ready">Voted</span>}
                       {isSelected && <span className="badge badge-host">Your Vote</span>}
                    </div>
                  </li>
                );
              })}
            </ul>

            {currentPlayer?.has_voted ? (
               <div className="status-indicator">
                  <div className="dot"></div> Waiting for others to vote...
               </div>
            ) : null}
          </div>
        )}

        {/* REVEAL STATE */}
        {gameState.state === "REVEAL" && (
          <div>
            <h2>Results</h2>
            
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-around', margin: '1.5rem 0', border: '1px solid rgba(255,255,255,0.1)' }}>
               <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Civilian Word</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#bfdbfe' }}>{gameState.civilian_word}</div>
               </div>
               <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Imposter Word</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fca5a5' }}>{gameState.imposter_word}</div>
               </div>
            </div>

            <div className="results-grid">
               {gameState.players.map(p => {
                  
                  // Calculate votes received
                  const votesReceived = gameState.players.filter(voter => voter.voted_for === p.id).length;
                  
                  return (
                     <div key={p.id} className={`result-card ${p.is_imposter ? 'is-imposter' : ''}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                           <span className="player-name" style={{ fontSize: '1.2rem', color: p.is_imposter ? '#fca5a5' : 'white' }}>
                              {p.name} {p.is_imposter && <span className="badge badge-imposter">Imposter</span>}
                           </span>
                           <span className="votes-count">
                              {votesReceived} Vote{votesReceived !== 1 && 's'}
                           </span>
                        </div>
                        
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                           {p.voted_for ? (
                              <span>Voted for: <strong>{gameState.players.find(target => target.id === p.voted_for)?.name || "Unknown"}</strong></span>
                           ) : "Did not vote"}
                        </div>
                     </div>
                  )
               })}
            </div>

            {isHost && (
              <button className="primary-btn" onClick={handlePlayAgain} style={{ marginTop: '2rem' }}>
                Play Again
              </button>
            )}
          </div>
        )}
        {/* CHAT SYSTEM */}
        {renderChat()}
      </div>
    </div>
  );
}

export default App;
