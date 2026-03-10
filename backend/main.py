from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from .game_logic import GameManager
from .models import *
from .words import get_categories

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

@app.get("/api/categories")
def get_available_categories():
    """Returns all available word categories"""
    return {"categories": get_categories()}

@app.post("/api/create", response_model=dict)
def create_game(req: CreateGameRequest):
    """Host creates a new game room"""
    game = manager.create_game()
    player = game.add_player(req.player_name, is_host=True)
    return {
        "room_code": game.room_code,
        "player_id": player.player_id,
        "player_name": player.name
    }

@app.post("/api/join", response_model=dict)
def join_game(req: JoinGameRequest):
    """Player joins an existing game room by code"""
    game = manager.get_game(req.room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    if game.state != "LOBBY":
        raise HTTPException(status_code=400, detail="Game already in progress")
        
    player = game.add_player(req.player_name)
    return {
        "room_code": game.room_code,
        "player_id": player.player_id,
        "player_name": player.name
    }

@app.get("/api/game/{room_code}", response_model=dict)
def get_game_state(room_code: str):
    """Frontend polls this to get the public state of the game"""
    game = manager.get_game(room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    return game.get_public_state()

@app.post("/api/game/{room_code}/start")
def start_game(room_code: str, req: StartRoundRequest):
    """Host starts the round"""
    game = manager.get_game(room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    try:
        game.start_round(category=req.category or "General", imposter_count=req.imposter_count)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "success", "state": game.state}

@app.post("/api/game/{room_code}/state")
def update_game_state(room_code: str, state: str = Body(..., embed=True)):
    """Manually advance game state (e.g. from VIEWING_WORDS -> DISCUSSION -> VOTING)"""
    game = manager.get_game(room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
        
    valid_states = ["LOBBY", "VIEWING_WORDS", "DISCUSSION", "VOTING", "REVEAL"]
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

@app.post("/api/game/{room_code}/chat")
def send_chat_message(room_code: str, req: ChatMessageRequest):
    """Player sends a chat message"""
    game = manager.get_game(room_code)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    game.add_message(req.sender_name, req.text)
    return {"status": "success"}

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

# Run normally via `uvicorn backend.main:app --reload`
