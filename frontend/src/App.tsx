import { useState, useEffect, useRef } from 'react';
import { api, type GameState } from './api';
import { jwtDecode } from "jwt-decode";
import { 
  Users, Copy, Target, Eye, LogOut, 
  Share2, Settings, BarChart3, Moon, Sun, User, Mic, MicOff,
  Volume2, VolumeX
} from 'lucide-react';
import { useWebRTC } from './useWebRTC';

const AudioPlayer = ({ stream }: { stream: MediaStream }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);
  return <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />;
};
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import './index.css';

const SOUNDS = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  tick: 'https://assets.mixkit.co/active_storage/sfx/2382/2382-preview.mp3',
  reveal: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  fail: 'https://assets.mixkit.co/active_storage/sfx/253/253-preview.mp3'
};

const playSound = (name: keyof typeof SOUNDS, enabled: boolean) => {
  if (!enabled) return;
  const audio = new Audio(SOUNDS[name]);
  audio.volume = 0.4;
  audio.play().catch(() => {});
};

const GAME_WORDS = ["IMPOSTOR", "DECEIVE", "BLUFF", "SPY", "MASK", "VOTE", "LIE", "TRICK", "CIPHER", "REVEAL"];
const THEME_COLORS = ['#ff2d55', '#4361ff', '#00e676', '#ffd600', '#f0f0f8'];
const bgParticles = Array.from({ length: 55 }).map((_, i) => ({
  id: i,
  word: GAME_WORDS[Math.floor(Math.random() * GAME_WORDS.length)],
  color: THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)],
  left: `${Math.random() * 100}vw`,
  duration: `${15 + Math.random() * 20}s`,
  delay: `${-Math.random() * 20}s`,
  opacity: 0.08 + Math.random() * 0.25,
  fontSize: `${1.5 + Math.random() * 3}rem`
}));

function App() {
  const [playerName, setPlayerName] = useState("");
  const [avatar, setAvatar] = useState("🤠");
  const [roomCode, setRoomCode] = useState("");
  const [inputRoomCode, setInputRoomCode] = useState("");
  const [inGame, setInGame] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  
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

  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [customWords, setCustomWords] = useState("");
  const [secretWordData, setSecretWordData] = useState<{ role: string; word: string } | null>(null);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [discussionTime, setDiscussionTime] = useState(60);
  const [votingTime, setVotingTime] = useState(30);
  const [revealIndex, setRevealIndex] = useState(-1);
  const [isShaking, setIsShaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const toggleAudio = () => {
    if (!audioEnabled) {
      playSound('click', true);
      setAudioEnabled(true);
    } else {
      setAudioEnabled(false);
    }
  };

  const { micActive, toggleMic, remoteStreams } = useWebRTC(
    roomCode, 
    playerId, 
    true
  );

  const chatEndRef = useRef<HTMLDivElement>(null);

  const avatars = ["🤠", "👽", "🤖", "👻", "🤓", "😎"];

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
  
  useEffect(() => {
    api.getCategories().then(res => setCategories(res.categories)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!roomCode || !playerId) {
      setInGame(false);
      return;
    }
    setInGame(true);
    const interval = setInterval(async () => {
      try {
        const state = await api.getGameState(roomCode);
        setGameState(state);
      } catch (err) { console.error("Poll error:", err); }
    }, 1000);
    return () => clearInterval(interval);
  }, [roomCode, playerId]);

  useEffect(() => {
    if (gameState?.state === 'REVEAL') {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  }, [gameState?.state]);

  useEffect(() => {
    if (gameState?.state === "REVEAL") {
      setRevealIndex(0);
      const timer = setInterval(() => {
        setRevealIndex(prev => {
          if (prev < (gameState.players?.length || 0) - 1) {
            playSound('click', audioEnabled);
            return prev + 1;
          }
          clearInterval(timer);
          return prev;
        });
      }, 800);
      return () => clearInterval(timer);
    } else {
      setRevealIndex(-1);
      setIsShaking(false);
    }
  }, [gameState?.state, gameState?.players?.length, audioEnabled]);

  useEffect(() => {
    if (gameState?.time_remaining && gameState.time_remaining <= 5 && gameState.time_remaining > 0) {
      if (gameState.state === "DISCUSSION" || gameState.state === "VOTING") {
        playSound('tick', audioEnabled);
      }
    }
  }, [gameState?.time_remaining, gameState?.state, audioEnabled]);

  useEffect(() => {
    if (revealIndex !== -1 && gameState?.state === "REVEAL" && gameState?.players) {
      if (revealIndex === gameState.players.length - 1) {
        // Last reveal
        const imposter = gameState.players.find(p => p.is_imposter);
        if (imposter) {
          // If we just revealed the imposter or it's the end
          playSound('reveal', audioEnabled);
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 1000);
        }
      }
    }
  }, [revealIndex, gameState?.state, gameState?.players, audioEnabled]);

  const handleCreate = async () => {
    playSound('click', audioEnabled);
    if (!playerName) return setError("Please enter your name");
    setLoading(true);
    setError('');
    try {
      const res = await api.createGame(playerName, avatar);
      setRoomCode(res.room_code);
      setPlayerId(res.player_id);
    } catch (err) { 
      setError(err instanceof Error ? err.message : 'Error creating game'); 
    }
    finally { setLoading(false); }
  };

  const handleJoin = async () => {
    playSound('click', audioEnabled);
    if (!playerName || !inputRoomCode) return setError("Please enter your name and a room code");
    setLoading(true);
    setError('');
    try {
      const res = await api.joinGame(inputRoomCode.toUpperCase(), playerName, avatar);
      setRoomCode(res.room_code);
      setPlayerId(res.player_id);
    } catch (err) { 
      setError(err instanceof Error ? err.message : 'Error joining game'); 
    }
    finally { setLoading(false); }
  };

  const leaveGame = () => {
    setInGame(false);
    setGameState(null);
    setRoomCode("");
    setPlayerId(null);
    setSecretWordData(null);
    setVotedFor(null);
  };

  const currentPlayer = gameState?.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.is_host;

  const handleStartRound = async () => {
    if (!roomCode) return;
    try { await api.startRound(roomCode, selectedCategory, 1, customWords, discussionTime, votingTime); } 
    catch(err) { alert(err instanceof Error ? err.message : 'Error starting round'); }
  };
  
  const handleViewWord = async () => {
    if (!playerId) return;
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
    if (!playerId) return;
    try {
      await api.submitVote(roomCode, playerId, targetId);
      setVotedFor(targetId);
    } catch(err) { alert(err instanceof Error ? err.message : 'Error voting'); }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !playerName) return;
    try {
      await api.sendChat(roomCode, playerName, chatMessage);
      setChatMessage('');
    } catch(err) { alert(err instanceof Error ? err.message : 'Error sending chat'); }
  };

  const handleAddBot = async () => {
    try {
      await api.addBot(roomCode);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error adding bot');
    }
  };

  // Home Screen View
  if (!inGame) {
    return (
      <GoogleOAuthProvider clientId="686718360649-jdasq3d690csvs00kn9ck11iv78plrmn.apps.googleusercontent.com">
        {/* Animated Particles */}
        <div className="particles-container">
          {bgParticles.map(p => (
            <div key={p.id} className="particle" style={{
              color: p.color,
              left: p.left,
              animationDuration: p.duration,
              animationDelay: p.delay,
              opacity: p.opacity,
              fontSize: p.fontSize
            }}>
              {p.word}
            </div>
          ))}
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
            
            <div className="avatar-row">
               {avatars.map(a => (
                 <div 
                   key={a} 
                   onClick={() => setAvatar(a)} 
                   className={`avatar-item ${avatar === a ? 'selected' : ''}`}
                 >
                   {a}
                 </div>
               ))}
            </div>

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
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
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

            <div className="google-login-wrapper">
              {!userProfile ? (
                 <GoogleLogin
                   theme="filled_black"
                   shape="pill"
                   onSuccess={credentialResponse => {
                     if (credentialResponse.credential) {
                       const decoded = jwtDecode<UserProfile>(credentialResponse.credential);
                       setUserProfile(decoded);
                       setPlayerName(decoded.name || playerName);
                     }
                   }}
                   onError={() => console.log('Login Failed')}
                 />
              ) : (
                <div style={{ fontWeight: 800, color: 'var(--color-green)', fontFamily: 'var(--font-body)', marginTop: '0.5rem', letterSpacing: '1px' }}>
                  WELCOME, {userProfile.name.toUpperCase()}!
                </div>
              )}
            </div>
          </motion.div>

          <div className="menu-grid">
            <div className="menu-item stone" onClick={handleShare}><Share2 /></div>
            <div className="menu-item green" onClick={toggleAudio}>
              {audioEnabled ? <Volume2 /> : <VolumeX />}
            </div>
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
          {bgParticles.map(p => (
            <div key={p.id} className="particle" style={{
              color: p.color,
              left: p.left,
              animationDuration: p.duration,
              animationDelay: p.delay,
              opacity: p.opacity,
              fontSize: p.fontSize
            }}>
              {p.word}
            </div>
          ))}
       </div>

       <div className="top-nav-bar">
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="nav-pill" onClick={leaveGame} title="Leave Room">
              <LogOut size={16} /> ROOM
            </div>
            <div className="nav-pill">
              <Users size={16} /> {roomCode}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button 
              onClick={toggleMic} 
              className={`mic-btn ${micActive ? 'active' : ''}`}
            >
              {micActive ? <><Mic size={18} /> MIC ON</> : <><MicOff size={18} /> MIC OFF</>}
            </button>
            {gameState.time_remaining != null && (
               <div style={{ 
                  fontFamily: 'var(--font-display)', 
                  color: gameState.time_remaining <= 10 ? 'var(--theme-accent)' : '#fff',
                  fontSize: '1.5rem'
               }}>
                 ⏱ {gameState.time_remaining}s
               </div>
            )}
          </div>
       </div>

       {/* Render Remote Audio Streams Globally */}
       {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <AudioPlayer key={peerId} stream={stream} />
       ))}

       <div className="ingame-content-grid">
         <div className="left-panel">
          <motion.div 
            key={gameState.state}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={gameState.state === "LOBBY" ? "lobby-card" : "glass-panel"}
          >
          {gameState.state === "LOBBY" && (
            <div>
              <h2 className="lobby-title">LOBBY</h2>
              <div className="lobby-title-underline"></div>

              <div className="section-label">ROOM CODE</div>
              <div className="room-code-row">
                 <span className="room-code-text">{roomCode}</span>
                 <button className="copy-btn" onClick={handleCopyCode}>
                    <Copy size={16} /> {copied ? 'COPIED!' : 'COPY'}
                 </button>
              </div>

              {isHost && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div className="section-label">SETTINGS</div>
                  
                  <div className="word-pack-row" style={{ position: 'relative', cursor: 'pointer', zIndex: isDropdownOpen ? 50 : 1 }} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                    <span className="word-pack-slash">//</span>
                    
                    <div style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 700, color: 'var(--color-white)', letterSpacing: '2px', textAlign: 'left', userSelect: 'none' }}>
                      {selectedCategory === "Custom" ? "Custom Words" : selectedCategory}
                    </div>

                    {isDropdownOpen && (
                      <div className="custom-dropdown-menu">
                        <div className="custom-dropdown-option" onClick={(e) => { e.stopPropagation(); setSelectedCategory("Custom"); setIsDropdownOpen(false); }}>
                          <span style={{width: '20px', display: 'inline-block'}}>{selectedCategory === "Custom" ? "✓" : ""}</span> Custom Words
                        </div>
                        {categories.map(c => (
                          <div key={c} className="custom-dropdown-option" onClick={(e) => { e.stopPropagation(); setSelectedCategory(c); setIsDropdownOpen(false); }}>
                            <span style={{width: '20px', display: 'inline-block'}}>{selectedCategory === c ? "✓" : ""}</span> {c}
                          </div>
                        ))}
                      </div>
                    )}

                    <span className={`word-pack-badge ${selectedCategory === 'Custom' ? 'custom' : ''}`}>
                      {selectedCategory === 'Custom' ? 'CUSTOM' : 'DEFAULT'}
                    </span>
                    <span className="word-pack-chevron" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                  </div>

                  {selectedCategory === "Custom" && (
                    <div className="word-pack-row">
                      <span className="word-pack-slash">//</span>
                      <input type="text" placeholder="Enter words separated by commas..." value={customWords} onChange={(e) => setCustomWords(e.target.value)} />
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <div className="section-label" style={{ marginTop: '0.5rem' }}>DISCUSSION (S)</div>
                      <div className="word-pack-row">
                        <span className="word-pack-slash">//</span>
                        <input 
                          type="number" 
                          min="10" 
                          max="300"
                          value={discussionTime} 
                          onChange={(e) => setDiscussionTime(Number(e.target.value))}
                          style={{ width: '100%', outline: 'none', background: 'transparent', border: 'none', color: 'white', fontWeight: 600 }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="section-label" style={{ marginTop: '0.5rem' }}>VOTING (S)</div>
                      <div className="word-pack-row">
                        <span className="word-pack-slash">//</span>
                        <input 
                          type="number" 
                          min="5" 
                          max="120"
                          value={votingTime} 
                          onChange={(e) => setVotingTime(Number(e.target.value))}
                          style={{ width: '100%', outline: 'none', background: 'transparent', border: 'none', color: 'white', fontWeight: 600 }}
                        />
                      </div>
                    </div>
                  </div>

                  <button className="btn-textured btn-start" onClick={handleStartRound}>▶ START ROUND</button>
                  {gameState.players.length < 3 && (
                     <button className="btn-textured btn-bot" onClick={handleAddBot}>+ ADD BOT</button>
                  )}
                </div>
              )}

              <div className="players-header">
                 <span className="players-title">PLAYERS</span>
                 <span className="players-count-badge">{gameState.players.length} ONLINE</span>
              </div>
              <div className="player-list">
                {gameState.players.map(p => (
                   <div key={p.id} className="lobby-player-row">
                      <div className="lobby-player-avatar">{p.avatar}</div>
                      <div className="lobby-player-name">
                         {p.name} {p.id === playerId && <span className="lobby-player-you">(YOU)</span>}
                      </div>
                      <div className="lobby-player-pts">{p.score} PTS</div>
                      {isHost && p.id !== playerId && (
                        <span title="Kick Player" style={{ display: 'flex', alignItems: 'center' }}>
                          <LogOut size={16} className="lobby-player-kick" onClick={() => api.kickPlayer(roomCode, p.id)} />
                        </span>
                      )}
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
                      <span className="player-item-name" title={p.name}>{p.avatar} {p.name}</span>
                      {p.has_voted && <span>✅</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {gameState.state === "REVEAL" && (
            <div className={isShaking ? 'screen-shake' : ''}>
              <h2 className="lobby-title">RESULTS</h2>
              <div className="lobby-title-underline"></div>
              
              <div style={{ display: 'flex', gap: '15px', marginBottom: '2rem', marginTop: '1rem' }}>
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  style={{ 
                    background: 'rgba(67, 97, 255, 0.1)', 
                    border: '1px solid var(--color-blue)', 
                    padding: '1.5rem', 
                    borderRadius: '12px', 
                    flex: 1, 
                    boxShadow: '0 0 15px rgba(67, 97, 255, 0.2)' 
                  }}
                >
                   <small style={{ fontFamily: 'var(--font-body)', fontWeight: 800, letterSpacing: '2px', color: 'rgba(255,255,255,0.6)' }}>CIVILIAN</small><br/>
                   <strong style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', letterSpacing: '3px', color: 'var(--color-blue)', textShadow: '0 0 10px rgba(67, 97, 255, 0.5)' }}>{gameState.civilian_word}</strong>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 }}
                  style={{ 
                    background: 'rgba(255, 45, 85, 0.1)', 
                    border: '1px solid var(--color-red)', 
                    padding: '1.5rem', 
                    borderRadius: '12px', 
                    flex: 1, 
                    boxShadow: '0 0 15px rgba(255, 45, 85, 0.2)' 
                  }}>
                   <small style={{ fontFamily: 'var(--font-body)', fontWeight: 800, letterSpacing: '2px', color: 'rgba(255,255,255,0.6)' }}>IMPOSTER</small><br/>
                   <strong style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', letterSpacing: '3px', color: 'var(--color-red)', textShadow: '0 0 10px rgba(255, 45, 85, 0.5)' }}>{gameState.imposter_word}</strong>
                </motion.div>
              </div>
              <div className="player-list">
                <AnimatePresence>
                  {gameState.players.slice(0, revealIndex + 1).map((p) => (
                    <motion.div 
                      key={p.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`lobby-player-row ${p.is_imposter ? 'selected' : ''}`} 
                      style={{ transform: 'none', animation: 'none' }}
                    >
                       <div className="lobby-player-avatar">{p.avatar}</div>
                       <div className="lobby-player-name" title={p.name}>
                         {p.name} {p.is_imposter && <span className="lobby-player-you" style={{color: 'var(--color-red)'}}>(IMPOSTER)</span>}
                       </div>
                       <div className="lobby-player-pts">{p.score} PTS</div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {isHost && (
                <button 
                  className="btn-textured btn-start" 
                  style={{ marginTop: '2rem' }} 
                  onClick={() => { playSound('click', audioEnabled); advanceState("LOBBY"); }}
                >
                  PLAY AGAIN
                </button>
              )}
            </div>
          )}
         </motion.div>
         </div>

         {/* Chat Section & Right Panel Elements */}
         <div className="right-panel">
           <div className="chat-container">
              <div className="chat-messages">
                 {gameState.messages.map((m, i) => (
                   <div key={i} className={`chat-message ${m.sender === playerName ? 'own' : ''}`}>
                     <strong>{m.sender}:</strong> {m.text}
                   </div>
                 ))}
                 <div ref={chatEndRef} />
              </div>
              <div className="lobby-chat-bar">
                <form className="chat-input-wrapper" style={{padding:0, border: 'none'}} onSubmit={handleSendChat}>
                   <input className="lobby-chat-input" value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="SAY SOMETHING..." />
                   <button type="submit" className="lobby-chat-send">SEND</button>
                </form>
              </div>
           </div>
         </div>
       </div>
    </div>
  );
}

export default App;
