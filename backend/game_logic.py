import string
import random
from uuid import uuid4
from typing import Dict, Optional, List
from .words import get_two_words_from_category

class Player:
    def __init__(self, player_id: str, name: str):
        self.player_id = player_id
        self.name = name
        self.is_host = False
        self.is_imposter = False
        self.word = ""
        self.voted_for = None
        self.has_viewed_word = False
        self.is_bot = False

class GameSession:
    def __init__(self, room_code: str):
        self.room_code = room_code
        self.players: Dict[str, Player] = {}
        self.state = "LOBBY" # States: LOBBY, VIEWING_WORDS, DISCUSSION, VOTING, REVEAL
        self.category = "General"
        self.civilian_word = ""
        self.imposter_word = ""
        self.imposter_id = None

    def add_player(self, name: str, is_host: bool = False) -> Player:
        p_id = str(uuid4())
        player = Player(p_id, name)
        player.is_host = is_host
        self.players[p_id] = player
        return player

    def remove_player(self, player_id: str):
        if player_id in self.players:
            del self.players[player_id]

    def start_round(self, category: str = "General", imposter_count: int = 1):
        # Auto-fill bots if there are less than 3 players
        bot_count = 1
        while len(self.players) < 3:
            p_id = str(uuid4())
            bot = Player(p_id, f"Bot {bot_count}")
            bot.is_bot = True
            self.players[p_id] = bot
            bot_count += 1
        
        self.category = category
        self.civilian_word, self.imposter_word = get_two_words_from_category(category)
        
        self.state = "VIEWING_WORDS"
        
        # Reset player state
        for p in self.players.values():
            p.is_imposter = False
            p.word = self.civilian_word
            p.voted_for = None
            p.has_viewed_word = getattr(p, "is_bot", False) # Bots instantly view their words

        # Assign imposters only to humans
        human_players = [p_id for p_id, p in self.players.items() if not getattr(self.players[p_id], "is_bot", False)]
        if not human_players:
            human_players = list(self.players.keys())

        num_imposters = min(imposter_count, len(human_players))
        if num_imposters < 1 and len(human_players) > 0:
            num_imposters = 1
            
        imposter_ids = random.sample(human_players, num_imposters)
        
        self.imposter_id = imposter_ids[0] if imposter_ids else None
        
        for imp_id in imposter_ids:
            self.players[imp_id].is_imposter = True
            self.players[imp_id].word = self.imposter_word
            
    def set_state(self, new_state: str):
        self.state = new_state
        if self.state == "VOTING":
            # Auto-assign votes for bots
            for p in self.players.values():
                if getattr(p, "is_bot", False) and p.voted_for is None:
                    targets = [t.player_id for t in self.players.values() if t.player_id != p.player_id]
                    if targets:
                        p.voted_for = random.choice(targets)
            
            # Check if auto-voting completed the phase
            votes_cast = sum(1 for p in self.players.values() if p.voted_for is not None)
            if votes_cast == len(self.players) and len(self.players) > 0:
                self.state = "REVEAL"

    def cast_vote(self, voter_id: str, target_id: str):
        if self.state != "VOTING":
            raise ValueError("Not currently in VOTING state.")
        voter = self.players.get(voter_id)
        if not voter:
            raise ValueError("Voter not found in game.")
        if target_id not in self.players:
            raise ValueError("Target not found in game.")
        
        voter.voted_for = target_id
        
        # Check if everyone voted
        votes_cast = sum(1 for p in self.players.values() if p.voted_for is not None)
        if votes_cast == len(self.players):
            self.set_state("REVEAL")

    def get_public_state(self):
        players_list = []
        for p_id, p in self.players.items():
            public_info = {
                "id": p_id,
                "name": p.name,
                "is_host": p.is_host,
                "is_bot": getattr(p, "is_bot", False),
                "has_viewed_word": p.has_viewed_word,
                "has_voted": p.voted_for is not None
            }
            
            # If round is over (REVEAL state), show all roles and votes
            if self.state == "REVEAL":
                public_info["is_imposter"] = p.is_imposter
                public_info["word"] = p.word
                public_info["voted_for"] = p.voted_for
                
            players_list.append(public_info)
            
        return {
            "room_code": self.room_code,
            "state": self.state,
            "category": self.category,
            "players": players_list,
            "civilian_word": self.civilian_word if self.state == "REVEAL" else None,
            "imposter_word": self.imposter_word if self.state == "REVEAL" else None
        }

class GameManager:
    def __init__(self):
        self.games: Dict[str, GameSession] = {}

    def create_game(self) -> GameSession:
        # Generate 4-letter room code
        room_code = "".join(random.choices(string.ascii_uppercase, k=4))
        while room_code in self.games:
            room_code = "".join(random.choices(string.ascii_uppercase, k=4))
            
        game = GameSession(room_code)
        self.games[room_code] = game
        return game
        
    def get_game(self, room_code: str) -> Optional[GameSession]:
        return self.games.get(room_code.upper())
