from pydantic import BaseModel
from typing import Optional

class CreateGameRequest(BaseModel):
    player_name: str

class JoinGameRequest(BaseModel):
    room_code: str
    player_name: str

class StartRoundRequest(BaseModel):
    category: Optional[str] = "General"
    imposter_count: Optional[int] = 1

class VoteRequest(BaseModel):
    voter_id: str
    target_id: str

class ChatMessageRequest(BaseModel):
    sender_name: str
    text: str
