import string
import random
from uuid import uuid4
from typing import Dict, Optional, List
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from .words import get_two_words_from_category  # type: ignore
except ImportError:
    from words import get_two_words_from_category  # type: ignore

class Player:
    def __init__(self, player_id: str, name: str):
        self.player_id = player_id
        self.name = name
        self.is_host = False
        self.is_imposter = False
        self.word = ""
        self.voted_for: Optional[str] = None
        self.has_viewed_word = False
        self.is_bot = False
        self.score = 0

class GameSession:
    def __init__(self, room_code: str):
        self.room_code = room_code
        self.players: Dict[str, Player] = {}
        self.state = "LOBBY" # States: LOBBY, VIEWING_WORDS, DISCUSSION, VOTING, REVEAL
        self.category = "General"
        self.civilian_word = ""
        self.imposter_word = ""
        self.imposter_id: Optional[str] = None
        self.messages: List[Dict[str, str]] = []

    def add_player(self, name: str, is_host: bool = False) -> Player:
        p_id = str(uuid4())
        player = Player(p_id, name)
        player.is_host = is_host
        self.players[p_id] = player
        return player

    def remove_player(self, player_id: str):
        self.players.pop(player_id, None)

    def add_bot(self):
        bot_count = sum(1 for p in self.players.values() if p.is_bot) + 1
        p_id = str(uuid4())
        bot = Player(p_id, f"Bot {bot_count}")
        bot.is_bot = True
        self.players[p_id] = bot
        return bot

    def add_message(self, sender_name: str, text: str):
        self.messages.append({"sender": sender_name, "text": text})
        if len(self.messages) > 100:
            self.messages.pop(0)

    def start_round(self, category: str = "General", imposter_count: int = 1):
        # Auto-fill bots if there are less than 3 players
        bot_count = sum(1 for p in self.players.values() if p.is_bot) + 1
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
        human_players = [p_id for p_id, p in self.players.items() if not p.is_bot]
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
                if p.is_bot and p.voted_for is None:
                    targets = [t.player_id for t in self.players.values() if t.player_id != p.player_id]
                    if targets:
                        p.voted_for = random.choice(targets)
            
            # Check if auto-voting completed the phase
            votes_cast = sum(1 for p in self.players.values() if p.voted_for is not None)
            if votes_cast == len(self.players) and len(self.players) > 0:
                self.set_state("REVEAL")
        
        elif self.state == "REVEAL":
            # Scoring logic
            # Scoring logic: 
            # Civilians get 2 points if they catch ANY imposter.
            # Imposters get 3 points if they are NOT caught (not the player with most votes).
            
            imposter_ids = [p.player_id for p in self.players.values() if p.is_imposter]
            vote_counts: Dict[str, int] = {}
            for p in self.players.values():
                voted_target = p.voted_for
                if voted_target is not None:
                    vote_counts[voted_target] = vote_counts.get(voted_target, 0) + 1
            
            # Find who got the most votes
            max_votes = max(vote_counts.values()) if vote_counts else 0
            most_voted_ids = [pid for pid, count in vote_counts.items() if count == max_votes]
            
            for p in self.players.values():
                if not p.is_imposter:
                    # Civilian voted correctly
                    if p.voted_for in imposter_ids:
                        p.score += 2
                else:
                    # Imposter was not caught (no tie or majority for them)
                    if p.player_id not in most_voted_ids:
                        p.score += 3

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
                "is_bot": p.is_bot,
                "has_viewed_word": p.has_viewed_word,
                "has_voted": p.voted_for is not None,
                "score": p.score
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
            "imposter_word": self.imposter_word if self.state == "REVEAL" else None,
            "messages": self.messages
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
