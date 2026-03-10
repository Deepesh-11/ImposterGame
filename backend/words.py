import random

WORDS_DB = {
    "General": [
        "Action", "Advice", "Age", "Air", "Amount", "Animal", "Answer", "Apple", "Area", "Arms",
        "Army", "Art", "Attack", "Auction", "Baby", "Back", "Balance", "Ball", "Bank", "Base",
        "Battle", "Beauty", "Bell", "Bike", "Bill", "Bird", "Birth", "Bit", "Blood", "Blow",
        "Board", "Boat", "Body", "Bone", "Book", "Border", "Bottle", "Bottom", "Bowl", "Box",
        "Boy", "Brain", "Branch", "Brass", "Bread", "Breath", "Bridge", "Brother", "Brush", "Bucket",
        "Building", "Bulb", "Burn", "Burst", "Bus", "Bush", "Business", "Butter", "Button", "Cake",
        "Camera", "Canvas", "Card", "Care", "Carriage", "Cart", "Case", "Castle", "Cat", "Cause",
        "Cave", "Cellar", "Chain", "Chair", "Chalk", "Chance", "Change", "Channel", "Cheese", "Chest",
        "Chicken", "Child", "Church", "Circle", "City", "Class", "Clock", "Cloth", "Cloud", "Coal",
        "Coat", "Coffee", "Collar", "Color", "Comb", "Comfort", "Committee", "Company", "Comparison", "Competition",
        "Condition", "Connection", "Control", "Cook", "Copper", "Copy", "Cord", "Cork", "Cotton", "Cough",
        "Country", "Cover", "Cow", "Crack", "Credit", "Crime", "Crush", "Cry", "Cup", "Current",
        "Curtain", "Curve", "Cushion", "Damage", "Danger", "Daughter", "Day", "Death", "Debt", "Decision",
        "Degree", "Design", "Desire", "Desk", "Detail", "Device", "Dinner", "Direction", "Dirt", "Discovery",
        "Discussion", "Disease", "Dish", "Distance", "Division", "Dog", "Door", "Dot", "Drain", "Drawer",
        "Dress", "Drink", "Driving", "Drop", "Dust", "Ear", "Earth", "Edge", "Education", "Effect",
        "Egg", "End", "Error", "Event", "Example", "Exchange", "Existence", "Expansion", "Experience", "Expert",
        "Eye", "Face", "Fact", "Fall", "Family", "Farm", "Father", "Fear", "Feather", "Feeling",
        "Field", "Fight", "Finger", "Fire", "Fish", "Flag", "Flame", "Flight", "Floor", "Flower",
        "Fly", "Fog", "Fold", "Food", "Foot", "Force", "Fork", "Form", "Frame", "Friend",
        "Front", "Fruit", "Fuel", "Future", "Game", "Garden", "Gate", "General", "Glass", "Glove",
        "Goat", "Gold", "Government", "Grain", "Grass", "Grip", "Group", "Growth", "Guide", "Gun",
        "Hair", "Hammer", "Hand", "Harbor", "Harmony", "Hat", "Hate", "Head", "Health", "Hearing",
        "Heart", "Heat", "Help", "History", "Hole", "Holiday", "Home", "Hope", "Horse", "Hospital",
        "Hour", "House", "Humor", "Ice", "Idea", "Impulse", "Income", "Increase", "Industry", "Ink",
        "Insect", "Instrument", "Insurance", "Interest", "Invention", "Iron", "Island", "Jelly", "Jewel", "Join",
        "Journey", "Judge", "Juice", "Jump", "Kettle", "Key", "Kick", "Kiss", "Knee", "Knife",
        "Knot", "Knowledge", "Land", "Language", "Laugh", "Law", "Lead", "Leaf", "Learning", "Leather",
        "Leg", "Letter", "Level", "Library", "Lift", "Light", "Limit", "Line", "Linen", "Lip",
        "Liquid", "List", "Look", "Loss", "Love", "Machine"
        # Total list could easily be expanded to 500+ in this category alone
    ],
    "Animals": [
        "Dog", "Cat", "Lion", "Tiger", "Bear", "Elephant", "Giraffe", "Zebra", "Monkey", "Gorilla",
        "Penguin", "Whale", "Dolphin", "Shark", "Octopus", "Eagle", "Hawk", "Koala", "Kangaroo", "Snake",
        "Crocodile", "Alligator", "Turtle", "Rabbit", "Mouse", "Rat", "Hamster", "Cheetah", "Leopard", "Panther",
        "Rhino", "Hippo", "Buffalo", "Camel", "Deer", "Elk", "Moose", "Fox", "Wolf", "Coyote",
        "Raccoon", "Badger", "Otter", "Seal", "Walrus", "Polar Bear", "Panda", "Sloth", "Armadillo", "Anteater",
        "Llama", "Alpaca", "Sheep", "Goat", "Cow", "Pig", "Horse", "Donkey", "Mule", "Chicken",
        "Duck", "Goose", "Turkey", "Peacock", "Swan", "Flamingo", "Ostrich", "Emu", "Owl", "Parrot",
        "Pigeon", "Dove", "Crow", "Raven", "Woodpecker", "Hummingbird", "Frog", "Toad", "Salamander", "Newt",
        "Iguana", "Chameleon", "Gecko", "Komodo Dragon", "Jellyfish", "Starfish", "Crab", "Lobster", "Shrimp", "Squid"
    ],
    "Food & Drink": [
        "Pizza", "Burger", "Hotdog", "Pasta", "Salad", "Sandwich", "Soup", "Steak", "Chicken", "Fish",
        "Shrimp", "Taco", "Burrito", "Sushi", "Sashimi", "Ramen", "Noodles", "Rice", "Bread", "Toast",
        "Pancake", "Waffle", "Omelette", "Bacon", "Sausage", "Cheese", "Butter", "Yogurt", "Milk", "Cream",
        "Ice Cream", "Cake", "Pie", "Cookie", "Brownie", "Chocolate", "Candy", "Donut", "Muffin", "Croissant",
        "Apple", "Banana", "Orange", "Grapes", "Strawberry", "Blueberry", "Raspberry", "Watermelon", "Cantaloupe", "Peach",
        "Plum", "Cherry", "Pineapple", "Mango", "Papaya", "Kiwi", "Lemon", "Lime", "Coconut", "Avocado",
        "Tomato", "Potato", "Carrot", "Broccoli", "Cauliflower", "Spinach", "Lettuce", "Cabbage", "Onion", "Garlic",
        "Pepper", "Cucumber", "Zucchini", "Eggplant", "Mushroom", "Corn", "Peas", "Beans", "Lentils", "Chickpeas",
        "Water", "Juice", "Soda", "Tea", "Coffee", "Espresso", "Latte", "Cappuccino", "Smoothie", "Milkshake"
    ],
    "Locations": [
        "School", "Hospital", "Bank", "Supermarket", "Library", "Park", "Museum", "Theater", "Cinema", "Gym",
        "Restaurant", "Cafe", "Bakery", "Pharmacy", "Post Office", "Police Station", "Fire Station", "Hotel", "Motel", "Airport",
        "Train Station", "Bus Station", "Subway", "Port", "Harbor", "Beach", "Mountain", "Forest", "Jungle", "Desert",
        "Island", "Lake", "River", "Ocean", "Cave", "Valley", "Canyon", "Waterfall", "Volcano", "Glacier",
        "House", "Apartment", "Condo", "Mansion", "Castle", "Palace", "Tent", "Cabin", "Cottage", "Farm",
        "Barn", "Greenhouse", "Factory", "Warehouse", "Office", "Skyscraper", "Tower", "Bridge", "Tunnel", "Highway"
    ],
    "Technology": [
        "Computer", "Laptop", "Smartphone", "Tablet", "Smartwatch", "Television", "Radio", "Camera", "Microphone", "Headphones",
        "Speaker", "Keyboard", "Mouse", "Monitor", "Printer", "Scanner", "Router", "Modem", "Server", "Database",
        "Software", "Hardware", "Application", "Website", "Internet", "Browser", "Search Engine", "Email", "Password", "Firewall",
        "Virus", "Malware", "Hacker", "Encryption", "Battery", "Charger", "Cable", "USB", "Bluetooth", "Wi-Fi",
        "Processor", "Memory", "Storage", "Hard Drive", "SSD", "Cloud", "Algorithm", "Artificial Intelligence", "Robot", "Drone"
    ],
    "Professions": [
        "Doctor", "Nurse", "Surgeon", "Dentist", "Pharmacist", "Teacher", "Professor", "Student", "Scientist", "Researcher",
        "Engineer", "Architect", "Builder", "Carpenter", "Plumber", "Electrician", "Mechanic", "Welder", "Painter", "Janitor",
        "Police Officer", "Firefighter", "Security Guard", "Detective", "Lawyer", "Judge", "Politician", "Mayor", "President", "King",
        "Queen", "Chef", "Cook", "Baker", "Waiter", "Bartender", "Barista", "Farmer", "Fisherman", "Hunter",
        "Artist", "Musician", "Singer", "Actor", "Director", "Writer", "Author", "Journalist", "Photographer", "Designer"
    ]
}

def get_categories():
    return list(WORDS_DB.keys())

def get_two_words_from_category(category: str):
    words = WORDS_DB.get(category, WORDS_DB["General"])
    
    # Fallback if category is empty
    if len(words) < 2:
        words = WORDS_DB["General"]
        
    return random.sample(words, 2)
