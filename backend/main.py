from fastapi import FastAPI, HTTPException, Body, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import json
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Add the current directory to sys.path to ensure local modules are found
# regardless of how the script is executed.
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

try:
    # Try relative imports first (for package-style execution)
    from .game_logic import GameManager
    from .models import CreateGameRequest, JoinGameRequest, StartRoundRequest, VoteRequest, ChatMessageRequest
    from .words import get_categories
except (ImportError, ValueError):
    # Fallback to absolute imports (for direct execution)
    from game_logic import GameManager
    from models import CreateGameRequest, JoinGameRequest, StartRoundRequest, VoteRequest, ChatMessageRequest, KickPlayerRequest, SubmitClueRequest
    from words import get_categories

app = FastAPI(title="Word Imposter API")

# Add CORS so a separated frontend app can connect easily
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, lock this down!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory dictionary to hold all active sessions 
manager = GameManager()

class ConnectionManager:
    def __init__(self):
        # room_code -> {player_id: websocket}
        self.active_connections: dict[str, dict[str, WebSocket]] = {}

    async def connect(self, room_code: str, player_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_code not in self.active_connections:
            self.active_connections[room_code] = {}
        self.active_connections[room_code][player_id] = websocket

    def disconnect(self, room_code: str, player_id: str):
        if room_code in self.active_connections:
            if player_id in self.active_connections[room_code]:
                self.active_connections[room_code].pop(player_id, None)
            if not self.active_connections[room_code]:
                self.active_connections.pop(room_code, None)

    async def broadcast_to_room(self, room_code: str, message: str, exclude_player_id: Optional[str] = None):
        if room_code in self.active_connections:
            for pid, connection in self.active_connections[room_code].items():
                if pid != exclude_player_id:
                    await connection.send_text(message)
    
    async def send_to_player(self, room_code: str, target_player_id: str, message: str):
        if room_code in self.active_connections:
            if target_player_id in self.active_connections[room_code]:
                await self.active_connections[room_code][target_player_id].send_text(message)

ws_manager = ConnectionManager()


@app.get("/api/categories")
def get_available_categories():
    """Returns all available word categories"""
    return {"categories": get_categories()}

@app.post("/api/create", response_model=dict)
def create_game(req: CreateGameRequest):
    """Host creates a new game room"""
    game = manager.create_game()
    player = game.add_player(req.player_name, is_host=True, avatar=req.avatar)
    return {
        "room_code": game.room_code,
        "player_id": player.player_id,
        "player_name": player.name,
        "avatar": player.avatar
    }

@app.post("/api/join", response_model=dict)
def join_game(req: JoinGameRequest):
    """Player joins an existing game room by code"""
    game = manager.get_game(req.room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    if game.state != "LOBBY":
        raise HTTPException(status_code=400, detail="Game already in progress")
        
    player = game.add_player(req.player_name, avatar=req.avatar)
    return {
        "room_code": game.room_code,
        "player_id": player.player_id,
        "player_name": player.name,
        "avatar": player.avatar
    }

@app.get("/api/game/{room_code}", response_model=dict)
def get_game_state(room_code: str):
    """Frontend polls this to get the public state of the game"""
    game = manager.get_game(room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Trigger bot chatter during discussion
    if game.state == "DISCUSSION":
        import random
        if random.random() < 0.05: # 5% chance per poll to talk
            bot_messages = game.generate_bot_chatter()
            for msg in bot_messages:
                game.add_message(msg["sender"], msg["text"])
                
    return game.get_public_state()

@app.post("/api/game/{room_code}/start")
def start_game(room_code: str, req: StartRoundRequest):
    """Host starts the round"""
    game = manager.get_game(room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    try:
        imposter_count = req.imposter_count if req.imposter_count is not None else 1
        game.start_round(
            category=req.category or "General", 
            imposter_count=imposter_count, 
            custom_words=req.custom_words,
            discussion_time=req.discussion_time or 60,
            voting_time=req.voting_time or 30
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "success", "state": game.state}

@app.post("/api/game/{room_code}/state")
def update_game_state(room_code: str, state: str = Body(..., embed=True)):
    """Manually advance game state (e.g. from VIEWING_WORDS -> DISCUSSION -> VOTING)"""
    game = manager.get_game(room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
        
    valid_states = ["LOBBY", "VIEWING_WORDS", "SUBMITTING_CLUES", "DISCUSSION", "VOTING", "REVEAL"]
    if state not in valid_states:
        raise HTTPException(status_code=400, detail="Invalid state")
        
    game.set_state(state)
    return {"status": "success", "state": game.state}

@app.get("/api/game/{room_code}/player/{player_id}/word")
def get_player_word(room_code: str, player_id: str):
    """Player fetches their secret word securely"""
    game = manager.get_game(room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if game.state == "LOBBY":
        raise HTTPException(status_code=400, detail="Round hasn't started yet")
        
    player = game.players.get(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found in this room")
        
    # Mark that the player has viewed their word so the frontend can check if everyone is ready
    player.has_viewed_word = True
        
    return {
        "role": "Imposter" if player.is_imposter else "Civilian",
        "word": player.word
    }
@app.post("/api/game/{room_code}/vote")
def submit_vote(room_code: str, req: VoteRequest):
    """Player votes for an imposter target"""
    game = manager.get_game(room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
        
    try:
        game.cast_vote(req.voter_id, req.target_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return {"status": "success", "state": game.state}

@app.post("/api/game/{room_code}/clue")
def submit_clue(room_code: str, req: SubmitClueRequest):
    """Player submits a clue for their word"""
    game = manager.get_game(room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
        
    try:
        game.submit_clue(req.player_id, req.clue)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return {"status": "success", "state": game.state}

@app.post("/api/game/{room_code}/chat")
def send_chat_message(room_code: str, req: ChatMessageRequest):
    """Player sends a chat message"""
    game = manager.get_game(room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    game.add_message(req.sender_name, req.text)
    return {"status": "success"}

@app.post("/api/game/{room_code}/reaction")
def send_reaction(room_code: str, emoji: str = Body(..., embed=True), player_id: str = Body(..., embed=True)):
    """Player sends a live emoji reaction"""
    game = manager.get_game(room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    game.add_reaction(emoji, player_id)
    return {"status": "success"}

@app.post("/api/game/{room_code}/sabotage")
def trigger_sabotage(room_code: str, player_id: str = Body(..., embed=True), type: str = Body(..., embed=True)):
    """Imposter triggers a sabotage action"""
    game = manager.get_game(room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    
    player = game.players.get(player_id)
    if not player or not player.is_imposter:
        raise HTTPException(status_code=403, detail="Only the imposter can sabotage")
        
    game.trigger_sabotage(type)
    return {"status": "success"}

@app.websocket("/api/game/{room_code}/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, player_id: str):
    await ws_manager.connect(room_code, player_id, websocket)
    # Notify others that this player joined WebRTC
    await ws_manager.broadcast_to_room(room_code, json.dumps({
        "type": "peer-joined",
        "sender": player_id
    }), exclude_player_id=player_id)

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            target = msg.get("target")
            if target:
                # Retain sender info for WebRTC negotiation
                msg["sender"] = player_id
                await ws_manager.send_to_player(room_code, target, json.dumps(msg))
    except WebSocketDisconnect:
        ws_manager.disconnect(room_code, player_id)
        # Notify others
        await ws_manager.broadcast_to_room(room_code, json.dumps({
            "type": "peer-left",
            "sender": player_id
        }))

@app.post("/api/game/{room_code}/bot")
def add_bot_to_game(room_code: str):
    """Host adds a bot to the game"""
    game = manager.get_game(room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    if game.state != "LOBBY":
        raise HTTPException(status_code=400, detail="Cannot add bots after game starts")
    bot = game.add_bot()
    return {"status": "success", "bot_id": bot.player_id, "bot_name": bot.name}

@app.post("/api/game/{room_code}/kick")
def kick_player(room_code: str, req: KickPlayerRequest):
    """Host kicks a player from the lobby"""
    game = manager.get_game(room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    if game.state != "LOBBY":
        raise HTTPException(status_code=400, detail="Can only kick players in the lobby")
        
    game.remove_player(req.target_id)
    return {"status": "success"}

# Serve Static Files (Frontend)
# In production, we assume frontend/dist exists
frontend_path = os.path.join(os.path.dirname(current_dir), "frontend", "dist")

if os.path.exists(frontend_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Return index.html for all non-API paths (standard SPA behavior)
        if not full_path.startswith("api"):
            return FileResponse(os.path.join(frontend_path, "index.html"))
        raise HTTPException(status_code=404, detail="API route not found")

# Run normally via `uvicorn backend.main:app --reload`
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
