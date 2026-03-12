import { useState, useEffect } from 'react';
import { api, type GameState } from './api';
import { 
  Users, Copy, Target, Eye, LogOut, 
  Share2, Trophy, Settings, BarChart3, Moon, Sun, User 
} from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  interface UserProfile {
    name: string;
    email?: string;
    picture?: string;
  }
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Word Imposter',
      text: `Join my game room: ${roomCode}! My current score is ${currentPlayer?.score || 0} pts.`,
      url: window.location.href
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(shareData.text);
    } catch (err) { console.error(err); }
  };
  
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [secretWordData, setSecretWordData] = useState<{ role: string; word: string } | null>(null);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [chatText, setChatText] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>('create');

  useEffect(() => {
    api.getCategories().then(res => setCategories(res.categories)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!inGame || !roomCode) return;
    const interval = setInterval(async () => {
      try {
        const state = await api.getGameState(roomCode);
        setGameState(state);
      } catch (err) { console.error("Poll error:", err); }
    }, 1000);
    return () => clearInterval(interval);
  }, [inGame, roomCode]);

  useEffect(() => {
    if (gameState?.state === 'REVEAL') {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  }, [gameState?.state]);
  
  const handleCreate = async () => {
    if (!playerName.trim()) return setError("Please enter your name");
    setLoading(true);
    setError('');
    try {
      const res = await api.createGame(playerName);
      setRoomCode(res.room_code);
      setPlayerId(res.player_id);
      setInGame(true);
    } catch (err) { 
      setError(err instanceof Error ? err.message : 'Error creating game'); 
    }
    finally { setLoading(false); }
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
    } catch (err) { 
      setError(err instanceof Error ? err.message : 'Error joining game'); 
    }
    finally { setLoading(false); }
  };

  const leaveGame = () => {
    setInGame(false);
    setGameState(null);
    setRoomCode("");
    setPlayerId("");
    setSecretWordData(null);
    setVotedFor(null);
  };

  const currentPlayer = gameState?.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.is_host;

  const handleStartRound = async () => {
    try { await api.startRound(roomCode, selectedCategory, 1); } 
    catch(err) { alert(err instanceof Error ? err.message : 'Error starting round'); }
  };
  
  const handleViewWord = async () => {
    try {
      const data = await api.getPlayerWord(roomCode, playerId);
      setSecretWordData(data);
    } catch(err) { alert(err instanceof Error ? err.message : 'Error viewing word'); }
  };
  
  const advanceState = async (next: string) => {
    try { await api.updateState(roomCode, next); }
    catch(err) { alert(err instanceof Error ? err.message : 'Error updating state'); }
  };

  const handleVote = async (targetId: string) => {
    try {
      await api.submitVote(roomCode, playerId, targetId);
      setVotedFor(targetId);
    } catch(err) { alert(err instanceof Error ? err.message : 'Error voting'); }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    try {
      await api.sendChat(roomCode, playerName, chatText);
      setChatText('');
    } catch(err) { alert(err instanceof Error ? err.message : 'Error sending chat'); }
  };

  // Home Screen View
  if (!inGame) {
    return (
      <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
        {/* Animated Particles */}
        <div className="particles-container">
          <div className="particle">W</div>
          <div className="particle">O</div>
          <div className="particle">R</div>
          <div className="particle">D</div>
          <div className="particle">?</div>
          <div className="particle">!</div>
          <div className="particle">🔎</div>
          <div className="particle">🎭</div>
        </div>

        <div className="app-container">
          <div className="game-title-container float-anim">
            <span className="game-title-main">WORD</span>
            <span className="game-title-sub">IMPOSTER</span>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel"
          >
            {error && <div className="error-message">{error}</div>}
            
            <input 
              type="text" 
              placeholder="ENTER NICKNAME" 
              className="input-custom"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />

            {tab === 'join' && (
              <input 
                type="text" 
                placeholder="4-LETTER CODE" 
                className="input-custom"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={4}
              />
            )}
            
            <button className="btn-textured btn-stone" onClick={handleCreate} disabled={loading}>
              CREATE GAME
            </button>
            <button className="btn-textured btn-wood" onClick={() => setTab(tab === 'create' ? 'join' : 'create')}>
              {tab === 'create' ? "JOIN GAME" : "BACK TO START"}
            </button>
            
            {tab === 'join' && (
              <button className="btn-textured btn-stone" onClick={handleJoin} disabled={loading} style={{ background: '#84cc16' }}>
                CONFIRM JOIN
              </button>
            )}

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
              {!userProfile ? (
                 <GoogleLogin
                   onSuccess={credentialResponse => {
                     console.log(credentialResponse);
                     setUserProfile({ name: "Demo User" }); // Replace with actual decode logic
                   }}
                   onError={() => console.log('Login Failed')}
                 />
              ) : (
                <div style={{ fontWeight: 'bold' }}>Welcome, {userProfile.name}!</div>
              )}
            </div>
          </motion.div>

          <div className="menu-grid">
            <div className="menu-item stone" onClick={handleShare}><Share2 /></div>
            <div className="menu-item green"><Trophy /></div>
            <div className="menu-item blue"><BarChart3 /></div>
            <div className="menu-item dark" onClick={() => setShowSettings(true)}><Settings /></div>
            <div className="menu-item" style={{ background: '#ff7043' }} onClick={() => setShowProfile(true)}><User /></div>
          </div>

          {/* Settings Modal */}
          <AnimatePresence>
            {showSettings && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overlay">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="modal">
                  <h2>SETTINGS</h2>
                  <div style={{ margin: '2rem 0' }}>
                    <button className="btn-textured btn-stone" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                      {theme === 'light' ? <Moon /> : <Sun />} TOGGLE THEME
                    </button>
                  </div>
                  <button className="btn-textured btn-wood" onClick={() => setShowSettings(false)}>CLOSE</button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

           {/* Profile Modal */}
           <AnimatePresence>
            {showProfile && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overlay">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="modal">
                  <h2>YOUR PROFILE</h2>
                  <div style={{ margin: '1rem 0' }}>
                    <Target size={64} style={{ margin: '0 auto 1rem' }} />
                    <p>Name: {playerName || "Guest"}</p>
                    <p>Global Score: 0</p>
                  </div>
                  <button className="btn-textured btn-wood" onClick={() => setShowProfile(false)}>CLOSE</button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GoogleOAuthProvider>
    );
  }

  if (!gameState) {
    return (
      <div className="app-container">
        <div className="glass-panel">
          <h2>Loading Game State...</h2>
          <button className="btn-textured btn-wood" style={{ marginTop: '1rem' }} onClick={leaveGame}>
            BACK TO HOME
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container-ingame">
       {/* Animated Particles */}
       <div className="particles-container">
          <div className="particle">W</div>
          <div className="particle">O</div>
          <div className="particle">R</div>
          <div className="particle">D</div>
          <div className="particle">?</div>
          <div className="particle">!</div>
          <div className="particle">🔎</div>
          <div className="particle">🎭</div>
       </div>

       <div className="game-main-area">
         <div className="glass-panel" style={{ padding: '1rem', background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                 <span title="Leave Room" style={{ display: 'flex', alignItems: 'center' }}>
                   <LogOut size={16} onClick={leaveGame} style={{ cursor: 'pointer', opacity: 0.5 }} />
                 </span> 
                 <span style={{opacity: 0.7}}>ROOM</span> 
                 <Users size={18} style={{marginLeft: '10px'}}/> <span style={{letterSpacing: '2px', fontSize: '1.2rem'}}>{roomCode}</span>
              </div>
            </div>
         </div>

         <motion.div 
           key={gameState.state}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           className="glass-panel" 
           style={{ marginTop: '1rem' }}
         >
          {gameState.state === "LOBBY" && (
            <div>
              <h2 style={{ fontSize: '1.8rem', letterSpacing: '4px', marginBottom: '1rem' }}>LOBBY</h2>
              <div className="room-code-display" onClick={handleCopyCode} style={{ 
                position: 'relative', 
                fontSize: '2rem', 
                background: 'rgba(255,255,255,0.05)', 
                padding: '1rem', 
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '2rem'
              }}>
                <span style={{letterSpacing: '5px'}}>{roomCode}</span> 
                <Copy size={20} style={{ marginLeft: '10px', opacity: 0.5 }} />
                {copied && <span style={{ 
                  position: 'absolute', 
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '0.8rem', 
                  color: '#4caf50',
                  fontWeight: 'bold'
                }}>COPIED!</span>}
              </div>
              
              {isHost && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <select className="input-custom" style={{width: 'auto', textAlign: 'center'}} value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button className="btn-textured btn-stone" onClick={handleStartRound}>START ROUND</button>
                </div>
              )}

              <h3 style={{ marginTop: '2rem' }}>PLAYERS ({gameState.players.length})</h3>
              <div className="player-list">
                {gameState.players.map(p => (
                  <div key={p.id} className="player-item">
                     <span className="player-item-name" title={p.name}>
                        {p.name} {p.id === playerId && <strong style={{color: 'var(--theme-accent)'}}>(YOU)</strong>}
                     </span>
                     <span className="badge" style={{ background: '#f59e0b', color: '#fff' }}>{p.score} PTS</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameState.state === "VIEWING_WORDS" && (
            <div>
              <h2>YOUR ROLE</h2>
              {!secretWordData ? (
                <button className="btn-textured btn-stone" onClick={handleViewWord}><Eye /> REVEAL ROLE</button>
              ) : (
                <motion.div 
                  initial={{ scale: 0.5, rotateY: 90 }}
                  animate={{ scale: 1, rotateY: 0 }}
                  className={`word-reveal-card`} 
                  data-role={secretWordData.role}
                >
                   <div className="role-title">YOU ARE: <strong>{secretWordData.role}</strong></div>
                   <div className="secret-word">{secretWordData.word}</div>
                </motion.div>
              )}
              {isHost && (
                <button className="btn-textured btn-wood" style={{ marginTop: '2rem' }} onClick={() => advanceState("DISCUSSION")}>GO TO DISCUSSION</button>
              )}
            </div>
          )}

          {gameState.state === "DISCUSSION" && (
            <div style={{ textAlign: 'center' }}>
               <h2>DISCUSSION</h2>
               <Target size={80} className="float-anim" style={{ margin: '0 auto 2rem' }} />
               <p style={{ fontWeight: 800 }}>Explain your word subtly!</p>
               {isHost && (
                <button className="btn-textured btn-stone" style={{ marginTop: '2rem' }} onClick={() => advanceState("VOTING")}>START VOTING</button>
              )}
            </div>
          )}

          {gameState.state === "VOTING" && (
            <div>
              <h2>VOTE!</h2>
              <div className="player-list">
                {gameState.players.map(p => {
                  if (p.id === playerId) return null;
                  return (
                    <div 
                      key={p.id} 
                      className={`player-item interactive ${votedFor === p.id ? 'selected' : ''}`}
                      onClick={() => !currentPlayer?.has_voted && handleVote(p.id)}
                    >
                      <span className="player-item-name" title={p.name}>{p.name}</span>
                      {p.has_voted && <span>✅</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {gameState.state === "REVEAL" && (
            <div>
              <h2>RESULTS</h2>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '10px', flex: 1 }}>
                   <small>CIVILIAN</small><br/><strong>{gameState.civilian_word}</strong>
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '10px', flex: 1 }}>
                   <small>IMPOSTER</small><br/><strong>{gameState.imposter_word}</strong>
                </div>
              </div>
              <div className="player-list">
                {gameState.players.map(p => (
                  <div key={p.id} className={`player-item ${p.is_imposter ? 'selected' : ''}`}>
                     <span className="player-item-name" title={p.name}>
                       {p.name} {p.is_imposter && <strong>(IMPOSTER)</strong>}
                     </span>
                     <span className="badge" style={{ background: '#f59e0b', color: '#fff' }}>{p.score} PTS</span>
                  </div>
                ))}
              </div>
              {isHost && (
                <button className="btn-textured btn-stone" style={{ marginTop: '2rem' }} onClick={() => advanceState("LOBBY")}>PLAY AGAIN</button>
              )}
            </div>
          )}
         </motion.div>
       </div>

       {/* Chat Section */}
       <div className="chat-container">
          <div className="chat-messages">
             {gameState.messages.map((m, i) => (
               <div key={i} className={`chat-message ${m.sender === playerName ? 'own' : ''}`}>
                 <strong>{m.sender}:</strong> {m.text}
               </div>
             ))}
          </div>
          <form className="chat-input-wrapper" onSubmit={handleSendChat}>
             <input className="input-custom" value={chatText} onChange={e => setChatText(e.target.value)} placeholder="Say something..." />
             <button type="submit" className="btn-textured btn-stone">SEND</button>
          </form>
       </div>
    </div>
  );
}

export default App;
