import string
import random
from uuid import uuid4
from typing import Dict, Optional, List, Any
import sys
import os
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
        self.word: str = "" # Explicitly hint as str

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
        self.state_end_time: Optional[float] = None
        self.discussion_time = 60
        self.voting_time = 30
        import time
        self.time_module = time
        self.reactions: List[Dict[str, Any]] = [] # {emoji, player_id, timestamp}
        self.active_sabotage: Optional[Dict[str, Any]] = None # {type, end_time}
        self.player_activity: Dict[str, int] = {} # player_id -> message count during discussion
        self.clues: Dict[str, str] = {} # player_id -> clue string
        self.clue_history: Dict[str, List[str]] = {}
        self.round_number = 1
        self.total_rounds = 4

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
            duration = 12 # Static lasts longer to create more panic
        
        self.active_sabotage = {
            "type": sabotage_type,
            "end_time": self.time_module.time() + duration
        }

        if sabotage_type == "fake_news":
            # Frame a random human player through an existing bot
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
                # Insert the framed message into the game chat
                self.add_message(bot.name, random.choice(templates))

    def start_round(self, category: str = "General", imposter_count: int = 1, custom_words: Optional[str] = None, discussion_time: int = 60, voting_time: int = 30):
        self.discussion_time = discussion_time
        self.voting_time = voting_time
        # Auto-fill bots if there are less than 3 players
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
        
        self.set_state("VIEWING_WORDS")
        self.player_activity = {p_id: 0 for p_id in self.players} # Reset activity counts
        
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
        for p_id in imposter_ids:
            self.players[p_id].is_imposter = True
            self.players[p_id].word = self.imposter_word
            
        self.imposter_id = imposter_ids[0] if imposter_ids else None
        self.clues = {} 
        self.clue_history = {}
        self.round_number = 1

    def submit_clue(self, player_id: str, clue: str):
        if self.state != "SUBMITTING_CLUES":
            raise ValueError("Not currently in SUBMITTING_CLUES state.")
        self.clues[player_id] = clue[:100]
        
        # Check if everyone (humans) has submitted
        humans = [p_id for p_id, p in self.players.items() if not p.is_bot]
        if all(h_id in self.clues for h_id in humans):
            # Save current batch to history
            for p_id in self.players:
                if p_id not in self.clue_history:
                    self.clue_history[p_id] = []
                if p_id in self.clues:
                    self.clue_history[p_id].append(self.clues[p_id])

            if self.round_number < self.total_rounds:
                self.round_number += 1
                self.clues = {} # Clear for next round check
                self.set_state("SUBMITTING_CLUES")
            else:
                self.set_state("DISCUSSION")
            
    def set_state(self, new_state: str):
        self.state = new_state
        if new_state == "SUBMITTING_CLUES":
            self.state_end_time = self.time_module.time() + 45 # 45 seconds to write clues
            # Bots auto-submit clues
            for p_id, p in self.players.items():
                if p.is_bot:
                    bot_word = p.word or "something"
                    
                    # Pre-calculate hints to help type checker and readability
                    first_char = bot_word[0] if bot_word else "?"
                    start_chars = bot_word[:2] if len(bot_word) > 1 else bot_word
                    
                    clue_options = [
                        f"It's something {first_char}...", 
                        f"Starts with {start_chars}" if len(bot_word) > 1 else "A mystery item.", 
                        "Very common item."
                    ]
                    self.clues[p_id] = random.choice(clue_options)
                    
        elif new_state == "DISCUSSION":
            self.state_end_time = self.time_module.time() + self.discussion_time
        elif new_state == "VOTING":
            self.state_end_time = self.time_module.time() + self.voting_time
        else:
            self.state_end_time = None

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
        
        elif self.state == "DISCUSSION":
            # Bot chatter will be triggered by main.py during status checks
            pass
            
        elif self.state == "REVEAL":
            # Scoring logic
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
    
    def generate_bot_chatter(self):
        """Generates random messages from bots based on their personalities and player activity"""
        messages = []
        humans = [p for p in self.players.values() if not p.is_bot]
        human_names = [p.name for p in humans]
        
        # Identify quiet humans
        quiet_humans = [p for p in humans if self.player_activity.get(p.player_id, 0) == 0]
        
        for p in self.players.values():
            if not p.is_bot: continue
            
            # Chance to talk
            if random.random() > 0.6: # 40% chance to say something
                options = []
                if p.bot_personality == "aggressive":
                    options = ["Stop lying!", "I know it's you.", "Sus.", "Reveal yourself!", "I'm watching everyone."]
                    if quiet_humans and random.random() < 0.5:
                        target = random.choice(quiet_humans)
                        options.append(f"@{target.name} is being very quiet... sus.")
                    elif human_names:
                        target = random.choice(human_names)
                        options.append(f"I think {target} is the imposter!")
                        options.append(f"{target} is acting very strange.")
                elif p.bot_personality == "quiet":
                    options = ["...", "Hmm.", "?", "I'm civilian.", "Thinking...", "Watching."]
                else: # normal
                    options = ["Not sure yet.", "Who do we think it is?", "Let's hear more.", "Interesting.", "My word is pretty common."]
                    if not quiet_humans and human_names:
                        target = random.choice(human_names)
                        options.append(f"What do you think, {target}?")
                
                if options:
                    msg = random.choice(options)
                    messages.append({"sender": p.name, "text": msg})
        
        return messages

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
        end_time = self.state_end_time
        if end_time is not None and self.time_module.time() > end_time:
            if self.state == "DISCUSSION":
                self.set_state("VOTING")
            elif self.state == "VOTING":
                self.set_state("REVEAL")

        players_list = []
        for p_id, p in self.players.items():
            public_info = {
                "id": p_id,
                "name": p.name,
                "avatar": p.avatar,
                "is_host": p.is_host,
                "is_bot": p.is_bot,
                "has_viewed_word": p.has_viewed_word,
                "has_voted": p.voted_for is not None,
                "has_submitted_clue": p_id in self.clues,
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
            "messages": self.messages,
            "reactions": [r for r in self.reactions if self.time_module.time() - r["timestamp"] < 3],
            "sabotage": self.active_sabotage if self.active_sabotage and self.time_module.time() < self.active_sabotage["end_time"] else None,
            "time_remaining": max(0, int(end_time - self.time_module.time())) if end_time is not None else None,
            "clues": self.clues,
            "clue_history": self.clue_history,
            "round_number": self.round_number,
            "total_rounds": self.total_rounds
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
