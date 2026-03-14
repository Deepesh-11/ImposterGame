const isProd = import.meta.env.PROD;
export const BASE_URL = isProd ? "/api" : "http://localhost:8000/api";
export const WS_URL = isProd 
  ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api` 
  : "ws://localhost:8000/api";

export interface PlayerPublic {
  id: string;
  name: string;
  avatar: string;
  is_host: boolean;
  has_viewed_word: boolean;
  has_voted: boolean;
  is_imposter?: boolean;
  word?: string;
  voted_for?: string;
  score: number;
  is_bot: boolean;
  has_submitted_clue: boolean;
}

export interface GameState {
  room_code: string;
  state: "LOBBY" | "VIEWING_WORDS" | "SUBMITTING_CLUES" | "DISCUSSION" | "VOTING" | "REVEAL";
  category: string;
  players: PlayerPublic[];
  civilian_word: string | null;
  imposter_word: string | null;
  messages: { sender: string; text: string }[];
  reactions: { emoji: string; player_id: string; timestamp: number }[];
  sabotage?: { type: string; end_time: number } | null;
  time_remaining?: number | null;
  clues: Record<string, string>;
  clue_history: Record<string, string[]>;
  round_number: number;
  total_rounds: number;
  current_clue_turn_id?: string | null;
}

export const api = {
  createGame: async (playerName: string, avatar: string = "🤠") => {
    const res = await fetch(`${BASE_URL}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_name: playerName, avatar }),
    });
    if (!res.ok) throw new Error("Failed to create game");
    return res.json() as Promise<{
      room_code: string;
      player_id: string;
      player_name: string;
    }>;
  },

  joinGame: async (roomCode: string, playerName: string, avatar: string = "🤠") => {
    const res = await fetch(`${BASE_URL}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_code: roomCode, player_name: playerName, avatar }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{
      room_code: string;
      player_id: string;
      player_name: string;
    }>;
  },

  getGameState: async (roomCode: string) => {
    const res = await fetch(`${BASE_URL}/game/${roomCode}`);
    if (!res.ok) throw new Error("Failed to fetch game state");
    return res.json() as Promise<GameState>;
  },

  startRound: async (
    roomCode: string,
    category: string,
    imposterCount: number = 1,
    customWords?: string,
    discussionTime: number = 60,
    votingTime: number = 30
  ) => {
    const res = await fetch(`${BASE_URL}/game/${roomCode}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        category, 
        imposter_count: imposterCount, 
        custom_words: customWords,
        discussion_time: discussionTime,
        voting_time: votingTime
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  updateState: async (roomCode: string, state: string) => {
    const res = await fetch(`${BASE_URL}/game/${roomCode}/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    if (!res.ok) throw new Error("Failed to update state");
    return res.json();
  },

  getPlayerWord: async (roomCode: string, playerId: string) => {
    const res = await fetch(`${BASE_URL}/game/${roomCode}/player/${playerId}/word`);
    if (!res.ok) throw new Error("Failed to fetch word");
    return res.json() as Promise<{ role: string; word: string }>;
  },

  submitVote: async (roomCode: string, voterId: string, targetId: string) => {
    const res = await fetch(`${BASE_URL}/game/${roomCode}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voter_id: voterId, target_id: targetId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getCategories: async () => {
    const res = await fetch(`${BASE_URL}/categories`);
    if (!res.ok) throw new Error("Failed to fetch categories");
    return res.json() as Promise<{ categories: string[] }>;
  },

  sendChat: async (roomCode: string, senderName: string, text: string) => {
    const res = await fetch(`${BASE_URL}/game/${roomCode}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_name: senderName, text }),
    });
    if (!res.ok) throw new Error("Failed to send chat");
    return res.json();
  },

  addBot: async (roomCode: string) => {
    const res = await fetch(`${BASE_URL}/game/${roomCode}/bot`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to add bot");
    return res.json();
  },

  kickPlayer: async (roomCode: string, targetId: string) => {
    const res = await fetch(`${BASE_URL}/game/${roomCode}/kick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_id: targetId }),
    });
    if (!res.ok) throw new Error("Failed to kick player");
    return res.json();
  },

  sendReaction: async (roomCode: string, emoji: string, playerId: string) => {
    const res = await fetch(`${BASE_URL}/game/${roomCode}/reaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji, player_id: playerId }),
    });
    return res.json();
  },

  triggerSabotage: async (roomCode: string, playerId: string, type: string) => {
    const res = await fetch(`${BASE_URL}/game/${roomCode}/sabotage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, type }),
    });
    return res.json();
  },
  
  submitClue: async (roomCode: string, playerId: string, clue: string) => {
    const res = await fetch(`${BASE_URL}/game/${roomCode}/clue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, clue }),
    });
    if (!res.ok) throw new Error("Failed to submit clue");
    return res.json();
  },
};
