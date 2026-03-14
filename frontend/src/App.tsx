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

const FloatingEmoji = ({ emoji }: { emoji: string }) => {
  return (
    <motion.div
      initial={{ y: '100vh', x: `${Math.random() * 80 + 10}vw`, opacity: 0, scale: 0.5 }}
      animate={{ y: '-10vh', opacity: [0, 1, 1, 0], scale: [0.5, 1.5, 1.5, 1] }}
      transition={{ duration: 4, ease: "easeOut" }}
      className="floating-emoji"
    >
      {emoji}
    </motion.div>
  );
};

const GlitchOverlay = () => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: [0, 0.4, 0.2, 0.5, 0] }}
    transition={{ duration: 0.5, repeat: 14 }}
    className="glitch-overlay"
  />
);

const StaticOverlay = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.35 }}
      exit={{ opacity: 0 }}
      className="static-overlay"
    />
);

const CountdownTimer = ({ seconds, total, onComplete }: { seconds: number; total: number; onComplete: () => void }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (seconds / total) * circumference;
    
    let color = 'var(--color-green)';
    if (seconds <= 15) color = '#fbbf24'; // yellow
    if (seconds <= 8) color = 'var(--color-red)';
    
    useEffect(() => {
        if (seconds === 0) onComplete();
    }, [seconds]);

    return (
        <div className={`countdown-timer-wrapper ${seconds <= 8 ? 'pulse-fast' : ''}`}>
            <svg width="120" height="120">
                <circle 
                    cx="60" cy="60" r={radius} 
                    fill="transparent" 
                    stroke="rgba(255,255,255,0.05)" 
                    strokeWidth="8" 
                />
                <circle 
                    cx="60" cy="60" r={radius} 
                    fill="transparent" 
                    stroke={color} 
                    strokeWidth="8" 
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
                    transform="rotate(-90 60 60)"
                />
            </svg>
            <div className="countdown-number" style={{ color }}>{seconds}</div>
        </div>
    );
};

const SOUNDS = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  tick: 'https://assets.mixkit.co/active_storage/sfx/2382/2382-preview.mp3',
  reveal: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  fail: 'https://assets.mixkit.co/active_storage/sfx/253/253-preview.mp3',
  heartbeat: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  drumroll: 'https://assets.mixkit.co/active_storage/sfx/2402/2402-preview.mp3'
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
  const [clueInput, setClueInput] = useState("");
  const [chatMessage, setChatMessage] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [discussionTime, setDiscussionTime] = useState(60);
  const [votingTime, setVotingTime] = useState(30);
  const [revealIndex, setRevealIndex] = useState(-1);
  const [isShaking, setIsShaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const heartbeatRef = useRef<HTMLAudioElement | null>(null);

  const toggleAudio = () => {
    if (!audioEnabled) {
      playSound('click', true);
      setAudioEnabled(true);
    } else {
      setAudioEnabled(false);
    }
  };

  const [activeReactions, setActiveReactions] = useState<{ id: string; emoji: string }[]>([]);
  const reactionIdsSeen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (gameState?.reactions) {
      const newReactions = gameState.reactions.filter(r => !reactionIdsSeen.current.has(`${r.player_id}-${r.timestamp}`));
      if (newReactions.length > 0) {
        setLoading(false); // Side effect: reactions indicate active game
        newReactions.forEach(r => reactionIdsSeen.current.add(`${r.player_id}-${r.timestamp}`));
        const toAdd = newReactions.map(r => ({ id: `${r.player_id}-${r.timestamp}`, emoji: r.emoji }));
        setActiveReactions(prev => [...prev, ...toAdd]);
        // Cleanup after animation
        setTimeout(() => {
          setActiveReactions(prev => prev.filter(a => !toAdd.find(ta => ta.id === a.id)));
        }, 5000);
      }
    }
  }, [gameState?.reactions]);

  const handleReaction = async (emoji: string) => {
    if (!roomCode || !playerId) return;
    playSound('click', audioEnabled);
    try { await api.sendReaction(roomCode, emoji, playerId); }
    catch(err) { console.error(err); }
  };

  const handleSabotage = async (type: string) => {
    if (!roomCode || !playerId) return;
    playSound('click', audioEnabled);
    try { await api.triggerSabotage(roomCode, playerId, type); }
    catch(err) { alert(err instanceof Error ? err.message : 'Error triggering sabotage'); }
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
    setClueInput("");
  }, [gameState?.round_number]);

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
    if (gameState?.time_remaining && gameState.time_remaining <= 10 && gameState.time_remaining > 0) {
      if ((gameState.state === "DISCUSSION" || gameState.state === "VOTING") && audioEnabled) {
        if (!heartbeatRef.current) {
          heartbeatRef.current = new Audio(SOUNDS.heartbeat);
          heartbeatRef.current.loop = true;
          heartbeatRef.current.play().catch(() => {});
        }
        const progress = (10 - gameState.time_remaining) / 10;
        heartbeatRef.current.playbackRate = 1 + progress * 0.5;
        heartbeatRef.current.volume = 0.2 + progress * 0.4;
        
        if (gameState.time_remaining <= 5) {
          playSound('tick', audioEnabled);
        }
      }
    } else {
      if (heartbeatRef.current) {
        heartbeatRef.current.pause();
        heartbeatRef.current = null;
      }
    }
  }, [gameState?.time_remaining, gameState?.state, audioEnabled]);

  useEffect(() => {
    if (revealIndex !== -1 && gameState?.state === "REVEAL" && gameState?.players) {
      if (revealIndex === gameState.players.length - 1) {
        const imposter = gameState.players.find(p => p.is_imposter);
        if (imposter) {
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
  
  const handleClueSubmit = async () => {
    if (!roomCode || !playerId || clueInput.length < 2) return;
    try {
      await api.submitClue(roomCode, playerId, clueInput);
      playSound('click', audioEnabled);
    } catch(err) { alert(err instanceof Error ? err.message : 'Error submitting clue'); }
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

  if (!inGame) {
    return (
      <GoogleOAuthProvider clientId="686718360649-jdasq3d690csvs00kn9ck11iv78plrmn.apps.googleusercontent.com">
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

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="glass-panel">
            {error && <div className="error-message">{error}</div>}
            
            <div className="avatar-row">
               {avatars.map(a => (
                 <div key={a} onClick={() => setAvatar(a)} className={`avatar-item ${avatar === a ? 'selected' : ''}`}>
                   {a}
                 </div>
               ))}
            </div>

            <input type="text" placeholder="ENTER NICKNAME" className="input-custom" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />

            {tab === 'join' && (
              <input type="text" placeholder="4-LETTER CODE" className="input-custom" value={inputRoomCode} onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())} maxLength={4} />
            )}
            
            <button className="btn-textured btn-stone" onClick={handleCreate} disabled={loading}>CREATE GAME</button>
            <button className="btn-textured btn-wood" onClick={() => setTab(tab === 'create' ? 'join' : 'create')}>
              {tab === 'create' ? "JOIN GAME" : "BACK TO START"}
            </button>
            
            {tab === 'join' && (
              <button className="btn-textured btn-stone" onClick={handleJoin} disabled={loading} style={{ background: '#84cc16' }}>CONFIRM JOIN</button>
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

       {gameState.sabotage?.type === 'glitch' && <GlitchOverlay />}
       {gameState.sabotage?.type === 'static' && <StaticOverlay />}
       
       <div className="reactions-layer">
          {activeReactions.map(r => (
            <FloatingEmoji key={r.id} emoji={r.emoji} />
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
            <button onClick={toggleMic} className={`mic-btn ${micActive ? 'active' : ''}`}>
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

       {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <AudioPlayer key={peerId} stream={stream} />
       ))}

       {(() => {
          const ChatPanel = (
             <div className="chat-container">
                <div className="chat-history-header" style={{ padding: '0.8rem 1.2rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-blue)', fontFamily: 'var(--font-display)', letterSpacing: '2px' }}>
                   <Share2 size={18} />
                   <span>VIBE CHECK</span>
                </div>
                <div className="chat-messages">
                   {gameState.messages.map((m, i) => (
                      <div key={i} className={`chat-message ${m.sender === playerName ? "own" : ""}`}>
                         <strong>{m.sender}:</strong> {m.text}
                      </div>
                   ))}
                   <div ref={chatEndRef} />
                </div>
                <div className="lobby-chat-bar">
                   <form className="chat-input-wrapper" style={{padding:0, border: "none"}} onSubmit={handleSendChat}>
                      <input className="lobby-chat-input" value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="SAY SOMETHING..." />
                      <button type="submit" className="lobby-chat-send">SEND</button>
                   </form>
                </div>
             </div>
          );

          const ClueHistoryPanel = (
             <div className="clue-history-container">
                <div className="clue-history-header">
                   <Target size={18} />
                   <span>CLUE CHRONICLES</span>
                </div>
                <div className="clue-history-content">
                   {gameState.players.map(p => (
                      <div key={p.id} className="player-history-track">
                         <div className="player-meta">
                            <span className="avatar">{p.avatar}</span>
                            <span className="name">{p.name}</span>
                         </div>
                         <div className="rounds-timeline">
                            {[1, 2, 3, 4].map(rNum => {
                               const clue = (gameState.clue_history[p.id] || [])[rNum - 1] || (gameState.round_number === rNum ? gameState.clues[p.id] : null);
                               return (
                                  <div key={rNum} className={`round-slot ${gameState.round_number === rNum ? 'active' : ''} ${clue ? 'filled' : ''}`}>
                                     <div className="round-marker">R{rNum}</div>
                                     <div className="clue-preview">
                                        {clue || (gameState.round_number === rNum ? (p.has_submitted_clue ? "Clue submitted" : "Typing...") : "---")}
                                     </div>
                                  </div>
                               );
                            })}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          );

          if (gameState.state === "SUBMITTING_CLUES") {
             return (
                <div className="clue-writing-grid-fullscreen">
                   <div className="left-panel-chat">
                      {ChatPanel}
                   </div>

                   <div className="left-panel-status">
                      <div className="round-pill">ROUND {gameState.round_number} / {gameState.total_rounds}</div>
                      <div className="status-word-pack">// {gameState.category.toUpperCase()}</div>
                      <div className="section-label" style={{ marginTop: '2rem' }}>PLAYER STATUS</div>
                      <div className="status-player-list">
                         {gameState.players.map(p => (
                            <div key={p.id} className="status-player-row-with-clue">
                               <div className="status-player-info">
                                  <span className="status-avatar">{p.avatar}</span>
                                  <span className="status-name">{p.name}</span>
                                  <span className="status-icon">{p.has_submitted_clue ? '✅' : '⏳'}</span>
                               </div>
                               {gameState.clues[p.id] && (
                                 <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="player-clue-bubble">
                                   {gameState.clues[p.id]}
                                 </motion.div>
                               )}
                            </div>
                         ))}
                      </div>
                   </div>

                   <div className="right-panel-input">
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="clue-input-card">
                         <div className="clue-card-header">
                            <h2>YOUR TURN</h2>
                            <p>Give a clue for your word without saying it</p>
                            {secretWordData && (
                              <div className="secret-word-display" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '12px', marginTop: '1rem', border: '1px dashed rgba(255,255,255,0.2)' }}>
                                YOUR WORD: <strong style={{ color: 'var(--color-red)', fontSize: '1.2rem', letterSpacing: '2px' }}>{secretWordData.word.toUpperCase()}</strong>
                              </div>
                            )}
                            <div className="red-divider" style={{ marginTop: '1.5rem' }}></div>
                         </div>

                         <div className="clue-timer-container">
                            <CountdownTimer 
                               seconds={gameState.time_remaining || 0} 
                               total={45} 
                               onComplete={() => !currentPlayer?.has_submitted_clue && handleClueSubmit()} 
                            />
                         </div>

                         {!currentPlayer?.has_submitted_clue ? (
                            <>
                               <div className="clue-input-wrapper">
                                  <textarea className="clue-textarea" placeholder="TYPE YOUR CLUE HERE..." maxLength={40} value={clueInput} onChange={(e) => setClueInput(e.target.value)} />
                                  <div className={`char-counter ${clueInput.length >= 35 ? 'danger' : ''}`}>{clueInput.length} / 40</div>
                               </div>
                               {secretWordData && clueInput.toLowerCase().includes(secretWordData.word.toLowerCase()) && (
                                  <div className="subtlety-warning">⚠️ Be subtle. Don't make it too obvious!</div>
                               )}
                               <button className="btn-textured btn-stone submit-clue-btn" onClick={handleClueSubmit} disabled={clueInput.length < 2}>SUBMIT CLUE →</button>
                            </>
                         ) : (
                            <div className="clue-submitted-state">
                               <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="submitted-badge">✅ CLUE SUBMITTED</motion.div>
                               <p className="waiting-text">Waiting for other players...</p>
                            </div>
                         )}
                      </motion.div>
                   </div>

                   <div className="right-panel-history">
                      {ClueHistoryPanel}
                   </div>
                </div>
             );
          }

          return (
             <div className="ingame-content-grid">
                <div className="left-panel-chat">
                   {ChatPanel}
                </div>

                <div className="left-panel">
                   <motion.div key={gameState.state} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className={gameState.state === "LOBBY" ? "lobby-card" : "glass-panel"}>
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
 
                            <div className="section-label" style={{ marginTop: '1.5rem' }}>LIVE REACTIONS</div>
                            <div className="reaction-bar">
                               {["🤨", "😂", "🔥", "🤔", "😱", "🤡"].map(emoji => (
                                 <button key={emoji} className="reaction-btn" onClick={() => handleReaction(emoji)}>
                                   {emoji}
                                 </button>
                               ))}
                            </div>
 
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
                         <div style={{textAlign: 'center'}}>
                            <h2>YOUR ROLE</h2>
                            {!secretWordData ? (
                               <button className="btn-textured btn-stone" onClick={handleViewWord}><Eye /> REVEAL ROLE</button>
                            ) : (
                               <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="word-reveal-card" data-role={secretWordData.role}>
                                  <div className="role-title">YOU ARE: <strong>{secretWordData.role}</strong></div>
                                  <div className="secret-word">{secretWordData.word}</div>
                               </motion.div>
                            )}
                            {isHost && (
                               <button className="btn-textured btn-wood" style={{ marginTop: '2rem' }} onClick={() => advanceState("SUBMITTING_CLUES")}>START CLUE SUBMISSION</button>
                            )}
                         </div>
                      )}

                      {gameState.state === "DISCUSSION" && (
                         <div style={{ textAlign: 'center' }}>
                            <div className="section-label">ROUND {gameState.round_number} CLUES</div>
                            <h2>DISCUSSION</h2>
                            <div className="discussion-clues-grid">
                               {gameState.players.map(p => (
                                  <div key={p.id} className="discussion-clue-card">
                                     <div className="discussion-clue-header">
                                       <span className="avatar">{p.avatar}</span>
                                       <span className="name">{p.name}</span>
                                     </div>
                                     <div className="clue-text">{gameState.clues[p.id] || "No clue provided."}</div>
                                  </div>
                               ))}
                            </div>
 
                            {currentPlayer?.is_imposter && (
                               <div className="sabotage-control">
                                 <div className="section-label">SABOTAGE TOOLS (IMPOSTER)</div>
                                 <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
                                   <button className="btn-textured btn-stone" onClick={() => handleSabotage('glitch')}>⚡ GLITCH UI</button>
                                   <button className="btn-textured btn-stone" onClick={() => handleSabotage('static')}>📺 STATIC NOISE</button>
                                 </div>
                               </div>
                            )}
 
                            {isHost && (
                               <button className="btn-textured btn-stone" style={{ marginTop: '2rem' }} onClick={() => advanceState("VOTING")}>START VOTING</button>
                            )}
                         </div>
                      )}

                      {gameState.state === "VOTING" && (
                         <div>
                            <div className="section-label">TIME TO DECIDE</div>
                            <h2>WHO IS THE IMPOSTER?</h2>
                            <div className="player-list">
                               {gameState.players.map(p => {
                                  if (p.id === playerId) return null;
                                  return (
                                     <div key={p.id} className={`player-item interactive ${votedFor === p.id ? 'selected' : ''}`} onClick={() => !currentPlayer?.has_voted && handleVote(p.id)}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 800 }}>{p.avatar} {p.name}</span>
                                            {votedFor === p.id && <span style={{ color: 'var(--color-red)', fontSize: '0.8rem' }}>VOTED ✓</span>}
                                          </div>
                                          <div style={{ fontSize: '0.85rem', opacity: 0.6, fontStyle: 'italic', textAlign: 'left', paddingLeft: '2rem' }}>
                                            "{gameState.clues[p.id] || "No clue provided"}"
                                          </div>
                                        </div>
                                     </div>
                                  );
                               })}
                            </div>
                         </div>
                      )}

                      {gameState.state === "REVEAL" && (
                         <div style={{textAlign: 'center'}} className={isShaking ? 'screen-shake' : ''}>
 
                            <h2 style={{ letterSpacing: '8px' }}>IDENTITY REVEAL</h2>
                            
                            <div className="reveal-words-grid">
                               <div className="reveal-word-item civilian">
                                  <div className="label">CIVILIANS SAW</div>
                                  <div className="word">{gameState.civilian_word}</div>
                               </div>
                               <div className="reveal-word-item imposter">
                                  <div className="label">IMPOSTER SAW</div>
                                  <div className="word">{gameState.imposter_word}</div>
                               </div>
                            </div>
 
                            <div className="player-list" style={{ marginTop: '2rem' }}>
                               {gameState.players.map((p, idx) => (
                                  <motion.div 
                                     initial={{ opacity: 0, x: -20 }}
                                     animate={{ opacity: idx <= revealIndex ? 1 : 0.2, x: 0 }}
                                     key={p.id} 
                                     className={`lobby-player-row ${p.is_imposter && idx <= revealIndex ? 'selected' : ''}`}
                                     style={{ borderLeft: p.is_imposter && idx <= revealIndex ? '4px solid var(--color-red)' : '1px solid rgba(255,255,255,0.05)' }}
                                  >
                                     <div className="lobby-player-avatar">{p.avatar}</div>
                                     <div className="lobby-player-name">
                                        {p.name} {p.is_imposter && idx <= revealIndex && <span className="imposter-badge">IMPOSTER</span>}
                                     </div>
                                     <div className="lobby-player-pts">{p.score} PTS</div>
                                  </motion.div>
                               ))}
                            </div>
 
                            {isHost && revealIndex >= gameState.players.length - 1 && (
                               <motion.button 
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="btn-textured btn-start" 
                                  style={{ marginTop: '2rem' }} 
                                  onClick={() => advanceState("LOBBY")}
                               >
                                  PLAY AGAIN
                               </motion.button>
                            )}
                         </div>
                      )}
                   </motion.div>
                </div>

                <div className="right-panel">
                   {ClueHistoryPanel}
                </div>
             </div>
          );
       })()}
    </div>
  );
}

export default App;
