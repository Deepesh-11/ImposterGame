import random
import os
import time

# 1. Dictionary of 500 common English words
MY_DICTIONARY = [
    "Apple", "Arm", "Banana", "Bed", "Beef", "Bird", "Book", "Box", "Boy", "Bread", 
    "Breakfast", "Brother", "Cake", "Camera", "Candle", "Car", "Cat", "Chair", "Chicken", "Child", 
    "Chocolate", "City", "Clock", "Cloud", "Coat", "Coffee", "Computer", "Cookie", "Country", "Cup", 
    "Desk", "Dog", "Door", "Dress", "Ear", "Egg", "Eye", "Face", "Family", "Father", 
    "Finger", "Fish", "Floor", "Flower", "Foot", "Fork", "Fruit", "Game", "Garden", "Girl", 
    "Glass", "Glove", "Group", "Guitar", "Hair", "Hand", "Hat", "Head", "Heart", "Horse", 
    "Hospital", "House", "Ice", "Island", "Jacket", "Juice", "Key", "Kitchen", "Knee", "Knife", 
    "Lake", "Lamp", "Leaf", "Leg", "Letter", "Library", "Light", "Lion", "List", "Map", 
    "Market", "Milk", "Money", "Monkey", "Morning", "Mother", "Mountain", "Mouth", "Music", "Name", 
    "Neck", "Night", "Nose", "Nurse", "Ocean", "Office", "Orange", "Page", "Paint", "Paper", 
    "Parent", "Park", "Party", "Pen", "Pencil", "Person", "Phone", "Piano", "Picture", "Pig", 
    "Pizza", "Plant", "Plate", "Player", "Pocket", "Police", "Pool", "Potato", "Queen", "Question", 
    "Radio", "Rain", "River", "Road", "Rock", "Roof", "Room", "Salt", "Sand", "School", 
    "Sea", "Seat", "Shirt", "Shoe", "Shop", "Shoulder", "Sister", "Skin", "Skirt", "Sky", 
    "Sleep", "Smile", "Snake", "Snow", "Soap", "Sock", "Sofa", "Son", "Song", "Soup", 
    "Spoon", "Sport", "Star", "Station", "Stone", "Store", "Street", "Sugar", "Sun", "Table", 
    "Taxi", "Tea", "Teacher", "Team", "Telephone", "Television", "Tennis", "Tent", "Thing", "Tiger", 
    "Time", "Toast", "Toilet", "Tomato", "Tooth", "Town", "Train", "Tree", "T-shirt", "Uncle", 
    "University", "Vegetable", "Village", "Voice", "Waitress", "Walk", "Wall", "Watch", "Water", "Weapon", 
    "Weather", "Wedding", "Week", "Window", "Wine", "Winter", "Woman", "Word", "Work", "World",
    "Writer", "Year", "Yellow", "Zoo", "Action", "Advice", "Age", "Air", "Amount", "Animal",
    "Answer", "Apple", "Area", "Arms", "Army", "Art", "Attack", "Auction", "Baby", "Back",
    "Balance", "Ball", "Bank", "Base", "Battle", "Beauty", "Bell", "Bike", "Bill", "Bird",
    "Birth", "Bit", "Blood", "Blow", "Board", "Boat", "Body", "Bone", "Book", "Border",
    "Bottle", "Bottom", "Bowl", "Box", "Boy", "Brain", "Branch", "Brass", "Bread", "Breath",
    "Bridge", "Brother", "Brush", "Bucket", "Building", "Bulb", "Burn", "Burst", "Bus", "Bush",
    "Business", "Butter", "Button", "Cake", "Camera", "Canvas", "Card", "Care", "Carriage", "Cart",
    "Case", "Castle", "Cat", "Cause", "Cave", "Cellar", "Chain", "Chair", "Chalk", "Chance",
    "Change", "Channel", "Cheese", "Chest", "Chicken", "Child", "Church", "Circle", "City", "Class",
    "Clock", "Cloth", "Cloud", "Coal", "Coat", "Coffee", "Collar", "Color", "Comb", "Comfort",
    "Committee", "Company", "Comparison", "Competition", "Condition", "Connection", "Control", "Cook", "Copper", "Copy",
    "Cord", "Cork", "Cotton", "Cough", "Country", "Cover", "Cow", "Crack", "Credit", "Crime",
    "Crush", "Cry", "Cup", "Current", "Curtain", "Curve", "Cushion", "Damage", "Danger", "Daughter",
    "Day", "Death", "Debt", "Decision", "Degree", "Design", "Desire", "Desk", "Detail", "Device",
    "Dinner", "Direction", "Dirt", "Discovery", "Discussion", "Disease", "Dish", "Distance", "Division", "Dog",
    "Door", "Dot", "Drain", "Drawer", "Dress", "Drink", "Driving", "Drop", "Dust", "Ear",
    "Earth", "Edge", "Education", "Effect", "Egg", "End", "Error", "Event", "Example", "Exchange",
    "Existence", "Expansion", "Experience", "Expert", "Eye", "Face", "Fact", "Fall", "Family", "Farm",
    "Father", "Fear", "Feather", "Feeling", "Field", "Fight", "Finger", "Fire", "Fish", "Flag",
    "Flame", "Flight", "Floor", "Flower", "Fly", "Fog", "Fold", "Food", "Foot", "Force",
    "Fork", "Form", "Frame", "Friend", "Front", "Fruit", "Fuel", "Future", "Game", "Garden",
    "Gate", "General", "Glass", "Glove", "Goat", "Gold", "Government", "Grain", "Grass", "Grip",
    "Group", "Growth", "Guide", "Gun", "Hair", "Hammer", "Hand", "Harbor", "Harmony", "Hat",
    "Hate", "Head", "Health", "Hearing", "Heart", "Heat", "Help", "History", "Hole", "Holiday",
    "Home", "Hope", "Horse", "Hospital", "Hour", "House", "Humor", "Ice", "Idea", "Impulse",
    "Income", "Increase", "Industry", "Ink", "Insect", "Instrument", "Insurance", "Interest", "Invention", "Iron",
    "Island", "Jelly", "Jewel", "Join", "Journey", "Judge", "Juice", "Jump", "Kettle", "Key",
    "Kick", "Kiss", "Knee", "Knife", "Knot", "Knowledge", "Land", "Language", "Laugh", "Law",
    "Lead", "Leaf", "Learning", "Leather", "Leg", "Letter", "Level", "Library", "Lift", "Light",
    "Limit", "Line", "Linen", "Lip", "Liquid", "List", "Look", "Loss", "Love", "Machine"
]

STATE_FILE = "remaining_words.txt"

def clear_screen():
    # Clears terminal for Windows (cls) or Mac/Linux (clear)
    os.system('cls' if os.name == 'nt' else 'clear')

def load_words():
    if not os.path.exists(STATE_FILE) or os.stat(STATE_FILE).st_size == 0:
        return MY_DICTIONARY[:]
    with open(STATE_FILE, "r") as f:
        return [line.strip() for line in f if line.strip()]

def save_words(words):
    with open(STATE_FILE, "w") as f:
        for word in words:
            f.write(f"{word}\n")

def get_game_words():
    available = load_words()
    
    # If we don't have enough words for a new game, reset
    if len(available) < 2:
        print("Dictionary exhausted! Resetting...")
        available = MY_DICTIONARY[:]
    
    # Pick two unique words
    word_a = random.choice(available)
    available.remove(word_a)
    word_b = random.choice(available)
    available.remove(word_b)
    
    save_words(available)
    return word_a, word_b

def play_game():
    word_normal, word_imposter = get_game_words()
    
    # Randomly pick which player is the imposter (0 to 4)
    imposter_id = random.randint(1, 5)
    
    players = [1, 2, 3, 4, 5]
    
    clear_screen()
    print("=== IMPOSTER GAME SETUP ===")
    print("There are 5 players. Pass the device around.")
    input("Press Enter when you are ready to start...")

    for p in players:
        clear_screen()
        print(f"PLAYER {p}")
        input(f"Player {p}, press Enter to see your word...")
        
        if p == imposter_id:
            print(f"\nYOUR WORD IS: {word_imposter}")
            print("--- YOU ARE THE IMPOSTER ---")
        else:
            print(f"\nYOUR WORD IS: {word_normal}")
            print("--- YOU ARE A CIVILIAN ---")
            
        print("\n" + "!" * 30)
        input("Memorize it and press Enter to CLEAR the screen for the next player...")
        clear_screen()

    print("All players have seen their words!")
    print("Start describing your word one by one.")
    print("Decide who to vote out!")
    
    # Optional: reveal who it was after the game
    input("\nWhen the game is over, press Enter to reveal the imposter...")
    print(f"The Imposter was Player {imposter_id}!")
    print(f"Civilian Word: {word_normal} | Imposter Word: {word_imposter}")

if __name__ == "__main__":
    play_game()