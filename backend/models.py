from pydantic import BaseModel
from typing import Optional

class CreateGameRequest(BaseModel):
    player_name: str
    avatar: Optional[str] = "🤠"

class JoinGameRequest(BaseModel):
    room_code: str
    player_name: str
    avatar: Optional[str] = "🤠"

class StartRoundRequest(BaseModel):
    category: Optional[str] = "General"
    imposter_count: Optional[int] = 1
    custom_words: Optional[str] = None
    discussion_time: Optional[int] = 60
    voting_time: Optional[int] = 30
    total_rounds: Optional[int] = 4

class KickPlayerRequest(BaseModel):
    target_id: str

class VoteRequest(BaseModel):
    voter_id: str
    target_id: str

class ChatMessageRequest(BaseModel):
    sender_name: str
    text: str

class SubmitClueRequest(BaseModel):
    player_id: str
    clue: str
