from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import uuid
from datetime import datetime
import json
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.game_rooms: Dict[str, Dict] = {}
    
    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        
        # Initialize game room if it doesn't exist
        if room_id not in self.game_rooms:
            self.game_rooms[room_id] = {
                "players": {},
                "units": {},
                "resources": {},
                "buildings": {},
                "game_state": "lobby"
            }
    
    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
                if room_id in self.game_rooms:
                    del self.game_rooms[room_id]
    
    async def send_to_room(self, message: str, room_id: str):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                await connection.send_text(message)

manager = ConnectionManager()

# Game Models
class Unit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_id: str
    type: str  # "villager", "archer", "knight", etc.
    x: float
    y: float
    health: int
    max_health: int
    attack: int
    armor: int
    speed: float
    selected: bool = False
    animation_frame: int = 0
    target_x: Optional[float] = None
    target_y: Optional[float] = None
    task: Optional[str] = None  # "idle", "moving", "gathering", "attacking"

class Building(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_id: str
    type: str  # "town_center", "barracks", "archery_range", etc.
    x: float
    y: float
    health: int
    max_health: int
    armor: int
    production_queue: List[str] = []

class Resources(BaseModel):
    player_id: str
    food: int = 200
    wood: int = 200
    gold: int = 100
    stone: int = 100

class Player(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    civilization: str = "generic"
    color: str = "blue"
    age: str = "dark"  # "dark", "feudal", "castle", "imperial"

class GameRoom(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    players: List[Player] = []
    max_players: int = 2
    game_state: str = "lobby"  # "lobby", "playing", "finished"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GameMessage(BaseModel):
    type: str
    data: Dict

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Age of Empires 2 Conquerors Online"}

@api_router.post("/rooms")
async def create_room(room_data: dict):
    room = GameRoom(name=room_data.get("name", "New Game"))
    room_dict = room.dict()
    await db.rooms.insert_one(room_dict)
    return room

@api_router.get("/rooms")
async def get_rooms():
    rooms = await db.rooms.find({"game_state": "lobby"}).to_list(100)
    return [GameRoom(**room) for room in rooms]

@api_router.get("/rooms/{room_id}")
async def get_room(room_id: str):
    room = await db.rooms.find_one({"id": room_id})
    if room:
        return GameRoom(**room)
    return {"error": "Room not found"}

# WebSocket endpoint
@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message["type"] == "player_join":
                await handle_player_join(room_id, message["data"])
            elif message["type"] == "unit_move":
                await handle_unit_move(room_id, message["data"])
            elif message["type"] == "unit_select":
                await handle_unit_select(room_id, message["data"])
            elif message["type"] == "start_game":
                await handle_start_game(room_id)
            elif message["type"] == "get_game_state":
                await send_game_state(room_id)
            
            # Broadcast message to all players in room
            await manager.send_to_room(data, room_id)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)

async def handle_player_join(room_id: str, player_data: dict):
    if room_id not in manager.game_rooms:
        return
    
    player_id = player_data["player_id"]
    player_name = player_data["name"]
    
    # Add player to game room
    manager.game_rooms[room_id]["players"][player_id] = {
        "name": player_name,
        "civilization": "generic",
        "color": "blue" if len(manager.game_rooms[room_id]["players"]) == 0 else "red"
    }
    
    # Initialize player resources
    manager.game_rooms[room_id]["resources"][player_id] = {
        "food": 200,
        "wood": 200,
        "gold": 100,
        "stone": 100
    }

async def handle_start_game(room_id: str):
    if room_id not in manager.game_rooms:
        return
    
    game_room = manager.game_rooms[room_id]
    game_room["game_state"] = "playing"
    
    # Initialize starting units for each player
    for i, (player_id, player_data) in enumerate(game_room["players"].items()):
        # Starting position based on player number
        start_x = 100 if i == 0 else 700
        start_y = 300
        
        # Create town center
        town_center = Building(
            player_id=player_id,
            type="town_center",
            x=start_x,
            y=start_y,
            health=2400,
            max_health=2400,
            armor=0
        )
        game_room["buildings"][town_center.id] = town_center.dict()
        
        # Create starting villagers
        for j in range(3):
            villager = Unit(
                player_id=player_id,
                type="villager",
                x=start_x + (j * 30),
                y=start_y + 50,
                health=25,
                max_health=25,
                attack=3,
                armor=0,
                speed=1.0
            )
            game_room["units"][villager.id] = villager.dict()

async def handle_unit_move(room_id: str, move_data: dict):
    if room_id not in manager.game_rooms:
        return
    
    game_room = manager.game_rooms[room_id]
    unit_id = move_data["unit_id"]
    target_x = move_data["target_x"]
    target_y = move_data["target_y"]
    
    if unit_id in game_room["units"]:
        unit = game_room["units"][unit_id]
        unit["target_x"] = target_x
        unit["target_y"] = target_y
        unit["task"] = "moving"

async def handle_unit_select(room_id: str, select_data: dict):
    if room_id not in manager.game_rooms:
        return
    
    game_room = manager.game_rooms[room_id]
    unit_ids = select_data["unit_ids"]
    player_id = select_data["player_id"]
    
    # Deselect all units for this player
    for unit in game_room["units"].values():
        if unit["player_id"] == player_id:
            unit["selected"] = False
    
    # Select specified units
    for unit_id in unit_ids:
        if unit_id in game_room["units"]:
            game_room["units"][unit_id]["selected"] = True

async def send_game_state(room_id: str):
    if room_id not in manager.game_rooms:
        return
    
    game_state = manager.game_rooms[room_id]
    message = {
        "type": "game_state",
        "data": game_state
    }
    await manager.send_to_room(json.dumps(message), room_id)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Game logic loop (simplified)
async def game_loop():
    while True:
        for room_id, game_room in manager.game_rooms.items():
            if game_room["game_state"] == "playing":
                await update_game_state(room_id)
        await asyncio.sleep(0.1)  # 10 FPS

async def update_game_state(room_id: str):
    game_room = manager.game_rooms[room_id]
    
    # Update unit positions
    for unit_id, unit in game_room["units"].items():
        if unit["task"] == "moving" and unit["target_x"] is not None:
            dx = unit["target_x"] - unit["x"]
            dy = unit["target_y"] - unit["y"]
            distance = (dx**2 + dy**2)**0.5
            
            if distance > 2:
                unit["x"] += (dx / distance) * unit["speed"]
                unit["y"] += (dy / distance) * unit["speed"]
            else:
                unit["x"] = unit["target_x"]
                unit["y"] = unit["target_y"]
                unit["task"] = "idle"
                unit["target_x"] = None
                unit["target_y"] = None

# Start game loop
asyncio.create_task(game_loop())