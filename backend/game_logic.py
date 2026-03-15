import string
import random
from uuid import uuid4
from typing import Dict, Optional, List, Any
import sys
import os
import time

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from .words import get_two_words_from_category  # type: ignore
except ImportError:
    from words import get_two_words_from_category  # type: ignore

class Player:
    def __init__(self, player_id: str, name: str, avatar: str = "🤠"):
        self.player_id = player_id
        self.name = name
        self.avatar = avatar
        self.is_host = False
        self.is_imposter = False
        self.word = ""
        self.voted_for: Optional[str] = None
        self.has_viewed_word = False
        self.is_bot = False
        self.score = 0
        self.bot_personality: Optional[str] = None # aggressive, quiet, normal

class GameSession:
    def __init__(self, room_code: str):
        self.room_code = room_code
        self.players: Dict[str, Player] = {}
        self.state = "LOBBY" # States: LOBBY, VIEWING_WORDS, SUBMITTING_CLUES, DISCUSSION, VOTING, REVEAL
        self.category = "General"
        self.civilian_word = ""
        self.imposter_word = ""
        self.imposter_id: Optional[str] = None
        self.messages: List[Dict[str, str]] = []
        self.state_end_time: Optional[float] = None
        self.discussion_time = 60
        self.voting_time = 30
        self.time_module = time
        self.reactions: List[Dict[str, Any]] = [] # {emoji, player_id, timestamp}
        self.active_sabotage: Optional[Dict[str, Any]] = None # {type, end_time}
        self.player_activity: Dict[str, int] = {} # player_id -> message count during discussion
        self.clues: Dict[str, str] = {} # player_id -> clue string
        self.clue_history: Dict[str, List[str]] = {}
        self.round_number = 1
        self.total_rounds = 4
        
        # Turn-based clue submission variables
        self.clue_order: List[str] = []
        self.current_clue_turn_index = 0
        self.turn_start_time: Optional[float] = None

    def add_player(self, name: str, is_host: bool = False, avatar: str = "🤠") -> Player:
        p_id = str(uuid4())
        player = Player(p_id, name, avatar)
        player.is_host = is_host
        self.players[p_id] = player
        return player

    def remove_player(self, player_id: str):
        self.players.pop(player_id, None)

    def add_bot(self):
        bot_count = sum(1 for p in self.players.values() if p.is_bot) + 1
        p_id = str(uuid4())
        personalities = ["aggressive", "quiet", "normal"]
        bot = Player(p_id, f"Bot {bot_count}", "🤖")
        bot.is_bot = True
        bot.bot_personality = random.choice(personalities)
        self.players[p_id] = bot
        return bot

    def add_message(self, sender_name: str, text: str):
        self.messages.append({"sender": sender_name, "text": text})
        if len(self.messages) > 100:
            self.messages.pop(0)

        # Track human activity during discussion
        if self.state == "DISCUSSION":
            for p_id, p in self.players.items():
                if p.name == sender_name and not p.is_bot:
                    self.player_activity[p_id] = self.player_activity.get(p_id, 0) + 1
            
        # Optional: Bot chance to reply to human messages
        if any(p.name == sender_name and not p.is_bot for p in self.players.values()):
            lowered_text = text.lower()
            for p in self.players.values():
                if p.is_bot and random.random() < 0.25: # 25% chance to respond
                    response = None
                    if any(word in lowered_text for word in ["who", "imposter", "spy", "fake"]):
                        if p.bot_personality == "aggressive":
                            response = f"I'm leaning towards {sender_name}." 
                        elif p.bot_personality == "quiet":
                            response = "I'm still observing..."
                        else:
                            response = "We need more clues before voting."
                    elif "sus" in lowered_text:
                        response = "Totally sus." if p.bot_personality != "quiet" else "..."
                    elif "word" in lowered_text:
                        response = "Wait, don't reveal too much!" if p.bot_personality == "normal" else "Careful with your words."
                    elif "me" in lowered_text or "i am" in lowered_text or "not me" in lowered_text:
                        if p.bot_personality == "aggressive":
                            response = f"That's exactly what an imposter would say, {sender_name}."
                    
                    if response:
                        self.messages.append({"sender": p.name, "text": response})

    def add_reaction(self, emoji: str, player_id: str):
        self.reactions.append({
            "emoji": emoji, 
            "player_id": player_id, 
            "timestamp": self.time_module.time()
        })
        if len(self.reactions) > 20:
            self.reactions.pop(0)

    def trigger_sabotage(self, sabotage_type: str):
        duration = 7
        if sabotage_type == "static":
            duration = 12 
        
        self.active_sabotage = {
            "type": sabotage_type,
            "end_time": self.time_module.time() + duration
        }

        if sabotage_type == "fake_news":
            bots = [p for p in self.players.values() if p.is_bot]
            humans = [p for p in self.players.values() if not p.is_bot and not p.is_imposter]
            
            if bots and humans:
                bot = random.choice(bots)
                target = random.choice(humans)
                templates = [
                    f"Wait, I think I saw {target.name} sweating...",
                    f"Honestly, {target.name} is giving me weird vibes.",
                    f"Is it just me or is {target.name} acting too quiet?",
                    f"I'm voting for {target.name}. Just saying.",
                    f"Wait, {target.name}, are you the imposter?"
                ]
                self.add_message(bot.name, random.choice(templates))

    def start_round(self, category: str = "General", imposter_count: int = 1, custom_words: Optional[str] = None, discussion_time: int = 60, voting_time: int = 30, total_rounds: int = 3):
        self.discussion_time = discussion_time
        self.voting_time = voting_time
        self.total_rounds = total_rounds
        bot_count = sum(1 for p in self.players.values() if p.is_bot) + 1
        while len(self.players) < 3:
            p_id = str(uuid4())
            bot = Player(p_id, f"Bot {bot_count}", "🤖")
            bot.is_bot = True
            self.players[p_id] = bot
            bot_count += 1
        
        self.category = category
        if custom_words and isinstance(custom_words, str) and len(custom_words.split(',')) >= 2:
            wordsList = [w.strip() for w in custom_words.split(',')]
            random.shuffle(wordsList)
            self.civilian_word, self.imposter_word = wordsList[0], wordsList[1]
        else:
            self.civilian_word, self.imposter_word = get_two_words_from_category(category)
        
        self.player_activity = {p_id: 0 for p_id in self.players}
        
        for p in self.players.values():
            p.is_imposter = False
            p.word = self.civilian_word
            p.voted_for = None
            p.has_viewed_word = getattr(p, "is_bot", False)

        all_player_ids = list(self.players.keys())
        num_imposters = min(imposter_count, len(all_player_ids))
        if num_imposters < 1 and len(all_player_ids) > 0:
            num_imposters = 1
            
        imposter_ids = random.sample(all_player_ids, num_imposters)
        for p_id in imposter_ids:
            self.players[p_id].is_imposter = True
            self.players[p_id].word = self.imposter_word
            
        self.imposter_id = imposter_ids[0] if imposter_ids else None
        self.clues = {} 
        self.clue_history = {}
        self.round_number = 1
        
        # Initialize turn-based clue submission
        self.clue_order = list(self.players.keys())
        random.shuffle(self.clue_order)
        self.current_clue_turn_index = 0
        self.turn_start_time = None 
        
        self.set_state("VIEWING_WORDS")

    def submit_clue(self, player_id: str, clue: str):
        if self.state != "SUBMITTING_CLUES":
            raise ValueError("Not currently in SUBMITTING_CLUES state.")
        
        current_turn_id = self.clue_order[self.current_clue_turn_index]
        if player_id != current_turn_id:
            raise ValueError("It is not your turn to submit a clue.")

        self.clues[player_id] = str(clue)
        self._advance_clue_turn()

    def _advance_clue_turn(self):
        self.current_clue_turn_index += 1
        self.turn_start_time = self.time_module.time()

        if self.current_clue_turn_index >= len(self.clue_order):
            # All players have gone in this round
            for p_id in self.players:
                if p_id not in self.clue_history:
                    self.clue_history[p_id] = []
                self.clue_history[p_id].append(self.clues.get(p_id, "Skipped"))
            
            if self.round_number < self.total_rounds:
                # Move to next round of clues
                self.round_number += 1
                self.clues = {}
                self.current_clue_turn_index = 0
                self.turn_start_time = self.time_module.time()
                # If the first player in the new round is a bot, handle it
                self._handle_bot_turn()
            else:
                # Everyone has submitted all rounds, proceed to discussion
                self.set_state("DISCUSSION")
        else:
            # Handle next bot turn if applicable
            self._handle_bot_turn()

    def _handle_bot_turn(self):
        if self.state != "SUBMITTING_CLUES":
            return
            
        current_turn_id = self.clue_order[self.current_clue_turn_index]
        p = self.players.get(current_turn_id)
        if p and p.is_bot:
            bot_word = p.word or "something"
            first_char = bot_word[0] if bot_word else "?"
            start_chars = bot_word[:2] if len(bot_word) > 1 else bot_word
            
            clue_options = [
                f"It's something {first_char}...", 
                f"Starts with {start_chars}" if len(bot_word) > 1 else "A mystery item.", 
                "Very common item."
            ]
            self.clues[current_turn_id] = random.choice(clue_options)
            self._advance_clue_turn()
            self._handle_bot_turn()

    def set_state(self, new_state: str):
        self.state = new_state
        if new_state == "SUBMITTING_CLUES":
            self.turn_start_time = self.time_module.time()
            self.state_end_time = None 
            self._handle_bot_turn()
        elif new_state == "DISCUSSION":
            self.state_end_time = self.time_module.time() + self.discussion_time
        elif new_state == "VOTING":
            self.state_end_time = self.time_module.time() + self.voting_time
        elif new_state == "REVEAL":
            self.state_end_time = None
            self._calculate_scores()
        else:
            self.state_end_time = None

        if self.state == "VOTING":
            for p in self.players.values():
                if p.is_bot and p.voted_for is None:
                    targets = [t.player_id for t in self.players.values() if t.player_id != p.player_id]
                    if targets:
                        p.voted_for = random.choice(targets)
            
            votes_cast = sum(1 for p in self.players.values() if p.voted_for is not None)
            if votes_cast == len(self.players) and len(self.players) > 0:
                self.set_state("REVEAL")

    def _calculate_scores(self):
        imposter_ids = [p.player_id for p in self.players.values() if p.is_imposter]
        vote_counts: Dict[str, int] = {}
        for p in self.players.values():
            voted_target = p.voted_for
            if voted_target is not None:
                vote_counts[voted_target] = vote_counts.get(voted_target, 0) + 1
        
        max_votes = max(vote_counts.values()) if vote_counts else 0
        most_voted_ids = [pid for pid, count in vote_counts.items() if count == max_votes]
        
        for p in self.players.values():
            if not p.is_imposter:
                if p.voted_for in imposter_ids:
                    p.score += 2
            else:
                if p.player_id not in most_voted_ids:
                    p.score += 3

    def generate_bot_chatter(self):
        messages = []
        humans = [p for p in self.players.values() if not p.is_bot]
        human_names = [p.name for p in humans]
        quiet_humans = [p for p in humans if self.player_activity.get(p.player_id, 0) == 0]
        
        for p in self.players.values():
            if not p.is_bot: continue
            if random.random() > 0.6: 
                options = []
                if p.bot_personality == "aggressive":
                    options = ["Stop lying!", "I know it's you.", "Sus.", "Reveal yourself!", "I'm watching everyone."]
                    if quiet_humans and random.random() < 0.5:
                        target = random.choice(quiet_humans)
                        options.append(f"@{target.name} is being very quiet... sus.")
                    elif human_names:
                        target = random.choice(human_names)
                        options.append(f"I think {target} is the imposter!")
                elif p.bot_personality == "quiet":
                    options = ["...", "Hmm.", "?", "I'm civilian.", "Thinking..."]
                else: # normal
                    options = ["Not sure yet.", "Who do we think it is?", "Let's hear more.", "Interesting."]
                
                if options:
                    msg = random.choice(options)
                    messages.append({"sender": p.name, "text": msg})
        return messages

    def cast_vote(self, voter_id: str, target_id: str):
        if self.state != "VOTING":
            raise ValueError("Not currently in VOTING state.")
        voter = self.players.get(voter_id)
        if not voter: raise ValueError("Voter not found in game.")
        if target_id not in self.players: raise ValueError("Target not found in game.")
        
        voter.voted_for = target_id
        votes_cast = sum(1 for p in self.players.values() if p.voted_for is not None)
        if votes_cast == len(self.players):
            self.set_state("REVEAL")

    def get_public_state(self):
        # Auto-advance logic
        if self.state == "SUBMITTING_CLUES":
            t_start = self.turn_start_time
            if t_start is not None:
                elapsed = self.time_module.time() - t_start
                if elapsed > 30.0:
                    current_turn_id = self.clue_order[self.current_clue_turn_index]
                    if current_turn_id not in self.clues:
                        self.clues[current_turn_id] = "Skipped (Timeout)"
                    self._advance_clue_turn()
                    self._handle_bot_turn()
        
        elif self.state == "DISCUSSION" or self.state == "VOTING":
            if self.state_end_time and self.time_module.time() > self.state_end_time:
                if self.state == "DISCUSSION":
                    self.set_state("VOTING")
                elif self.state == "VOTING":
                    self.set_state("REVEAL")

        players_list = []
        for p_id, p in self.players.items():
            public_info = {
                "id": p_id, "name": p.name, "avatar": p.avatar,
                "is_host": p.is_host, "is_bot": p.is_bot,
                "has_viewed_word": p.has_viewed_word,
                "has_voted": p.voted_for is not None,
                "has_submitted_clue": p_id in self.clues,
                "score": p.score
            }
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
            "messages": self.messages,
            "reactions": [r for r in self.reactions if self.time_module.time() - r["timestamp"] < 3],
            "sabotage": self.active_sabotage if self.active_sabotage and self.time_module.time() < self.active_sabotage["end_time"] else None,
            "time_remaining": self._get_time_remaining(),
            "clues": self.clues,
            "clue_history": self.clue_history,
            "round_number": self.round_number,
            "total_rounds": self.total_rounds,
            "current_clue_turn_id": self.clue_order[self.current_clue_turn_index] if self.state == "SUBMITTING_CLUES" else None
        }

    def _get_time_remaining(self):
        if self.state == "SUBMITTING_CLUES":
            t_start = self.turn_start_time
            if t_start is None: return 30
            return max(0, int(30 - (self.time_module.time() - t_start)))
        
        e_time = self.state_end_time
        if e_time is not None:
            return max(0, int(e_time - self.time_module.time()))
        return None

class GameManager:
    def __init__(self):
        self.games: Dict[str, GameSession] = {}

    def create_game(self) -> GameSession:
        room_code = "".join(random.choices(string.ascii_uppercase, k=4))
        while room_code in self.games:
            room_code = "".join(random.choices(string.ascii_uppercase, k=4))
        game = GameSession(room_code)
        self.games[room_code] = game
        return game
        
    def get_game(self, room_code: str) -> Optional[GameSession]:
        return self.games.get(room_code.upper())
