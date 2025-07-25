import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

const CIVILIZATIONS = [
  { id: 'britons', name: 'Britons', color: '#0066CC' },
  { id: 'franks', name: 'Franks', color: '#0099FF' },
  { id: 'goths', name: 'Goths', color: '#CC0000' },
  { id: 'celts', name: 'Celts', color: '#009900' },
  { id: 'vikings', name: 'Vikings', color: '#FF6600' },
  { id: 'teutons', name: 'Teutons', color: '#660066' }
];

const UNIT_TYPES = {
  villager: { name: 'Villager', size: 8, color: '#FFD700' },
  archer: { name: 'Archer', size: 8, color: '#8B4513' },
  knight: { name: 'Knight', size: 10, color: '#C0C0C0' },
  spearman: { name: 'Spearman', size: 8, color: '#696969' }
};

const BUILDING_TYPES = {
  town_center: { name: 'Town Center', width: 60, height: 60, color: '#8B4513' },
  barracks: { name: 'Barracks', width: 40, height: 40, color: '#654321' },
  archery_range: { name: 'Archery Range', width: 40, height: 40, color: '#8B4513' },
  stable: { name: 'Stable', width: 40, height: 40, color: '#A0522D' }
};

function GameCanvas({ gameState, onUnitSelect, onUnitMove, playerId }) {
  const canvasRef = useRef(null);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    draw();
  }, [gameState, selectedUnits, selectionBox]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw buildings
    if (gameState.buildings) {
      Object.values(gameState.buildings).forEach(building => {
        const buildingType = BUILDING_TYPES[building.type];
        if (buildingType) {
          ctx.fillStyle = buildingType.color;
          ctx.fillRect(building.x, building.y, buildingType.width, buildingType.height);
          
          // Draw health bar
          const healthPercentage = building.health / building.max_health;
          ctx.fillStyle = healthPercentage > 0.6 ? '#00FF00' : healthPercentage > 0.3 ? '#FFFF00' : '#FF0000';
          ctx.fillRect(building.x, building.y - 10, buildingType.width * healthPercentage, 5);
          
          // Draw building name
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '10px Arial';
          ctx.fillText(buildingType.name, building.x, building.y - 15);
        }
      });
    }

    // Draw units
    if (gameState.units) {
      Object.values(gameState.units).forEach(unit => {
        const unitType = UNIT_TYPES[unit.type];
        if (unitType) {
          // Draw unit
          ctx.fillStyle = unit.player_id === playerId ? '#4CAF50' : '#F44336';
          ctx.beginPath();
          ctx.arc(unit.x, unit.y, unitType.size, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw selection circle
          if (unit.selected) {
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(unit.x, unit.y, unitType.size + 5, 0, 2 * Math.PI);
            ctx.stroke();
          }
          
          // Draw health bar
          const healthPercentage = unit.health / unit.max_health;
          ctx.fillStyle = healthPercentage > 0.6 ? '#00FF00' : healthPercentage > 0.3 ? '#FFFF00' : '#FF0000';
          ctx.fillRect(unit.x - 8, unit.y - 15, 16 * healthPercentage, 3);
          
          // Draw target line
          if (unit.target_x !== null && unit.target_y !== null) {
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(unit.x, unit.y);
            ctx.lineTo(unit.target_x, unit.target_y);
            ctx.stroke();
          }
        }
      });
    }

    // Draw selection box
    if (selectionBox) {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 1;
      ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
    }
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setSelectionStart({ x, y });
    setSelectionBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isSelecting) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectionBox({
      x: Math.min(selectionStart.x, x),
      y: Math.min(selectionStart.y, y),
      width: Math.abs(x - selectionStart.x),
      height: Math.abs(y - selectionStart.y)
    });
  };

  const handleMouseUp = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isSelecting) {
      // Select units in selection box
      const selectedUnitIds = [];
      if (gameState.units) {
        Object.entries(gameState.units).forEach(([unitId, unit]) => {
          if (unit.player_id === playerId && selectionBox) {
            const unitX = unit.x;
            const unitY = unit.y;
            if (unitX >= selectionBox.x && unitX <= selectionBox.x + selectionBox.width &&
                unitY >= selectionBox.y && unitY <= selectionBox.y + selectionBox.height) {
              selectedUnitIds.push(unitId);
            }
          }
        });
      }

      setSelectedUnits(selectedUnitIds);
      onUnitSelect(selectedUnitIds);
      setIsSelecting(false);
      setSelectionBox(null);
    } else {
      // Right click - move selected units
      if (e.button === 2 && selectedUnits.length > 0) {
        selectedUnits.forEach(unitId => {
          onUnitMove(unitId, x, y);
        });
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="border border-gray-400 bg-green-100"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

function ResourcePanel({ resources }) {
  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg">
      <div className="flex space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span>Food: {resources?.food || 0}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-600 rounded"></div>
          <span>Wood: {resources?.wood || 0}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-400 rounded"></div>
          <span>Gold: {resources?.gold || 0}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-500 rounded"></div>
          <span>Stone: {resources?.stone || 0}</span>
        </div>
      </div>
    </div>
  );
}

function GameLobby({ onJoinGame }) {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [selectedCiv, setSelectedCiv] = useState('britons');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API}/rooms`);
      setRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    
    try {
      const response = await axios.post(`${API}/rooms`, {
        name: newRoomName
      });
      await fetchRooms();
      setNewRoomName('');
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const joinRoom = (roomId) => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    onJoinGame(roomId, playerName, selectedCiv);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Age of Empires 2: Conquerors Online</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Player Setup */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Player Setup</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Civilization</label>
                <select
                  value={selectedCiv}
                  onChange={(e) => setSelectedCiv(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600"
                >
                  {CIVILIZATIONS.map(civ => (
                    <option key={civ.id} value={civ.id}>{civ.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Room Creation */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Create Game</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Room Name</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600"
                  placeholder="Enter room name"
                />
              </div>
              <button
                onClick={createRoom}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Create Room
              </button>
            </div>
          </div>
        </div>

        {/* Available Rooms */}
        <div className="mt-8 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Available Games</h2>
          <div className="space-y-2">
            {rooms.length === 0 ? (
              <p className="text-gray-400">No games available. Create one!</p>
            ) : (
              rooms.map(room => (
                <div key={room.id} className="flex justify-between items-center p-3 bg-gray-700 rounded">
                  <div>
                    <h3 className="font-bold">{room.name}</h3>
                    <p className="text-sm text-gray-400">Players: {room.players.length}/{room.max_players}</p>
                  </div>
                  <button
                    onClick={() => joinRoom(room.id)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded"
                  >
                    Join
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GameRoom({ roomId, playerId, playerName, civilization }) {
  const [gameState, setGameState] = useState(null);
  const [websocket, setWebsocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/${roomId}`);
    
    ws.onopen = () => {
      setConnected(true);
      setWebsocket(ws);
      
      // Join the game
      ws.send(JSON.stringify({
        type: 'player_join',
        data: {
          player_id: playerId,
          name: playerName,
          civilization: civilization
        }
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'game_state') {
        setGameState(message.data);
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [roomId, playerId, playerName, civilization]);

  const startGame = () => {
    if (websocket) {
      websocket.send(JSON.stringify({
        type: 'start_game',
        data: {}
      }));
    }
  };

  const handleUnitSelect = (unitIds) => {
    if (websocket) {
      websocket.send(JSON.stringify({
        type: 'unit_select',
        data: {
          unit_ids: unitIds,
          player_id: playerId
        }
      }));
    }
  };

  const handleUnitMove = (unitId, targetX, targetY) => {
    if (websocket) {
      websocket.send(JSON.stringify({
        type: 'unit_move',
        data: {
          unit_id: unitId,
          target_x: targetX,
          target_y: targetY
        }
      }));
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connecting to game...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="mb-4">
        <ResourcePanel resources={gameState?.resources?.[playerId]} />
      </div>
      
      <div className="flex space-x-4">
        <div className="flex-1">
          <GameCanvas
            gameState={gameState || {}}
            onUnitSelect={handleUnitSelect}
            onUnitMove={handleUnitMove}
            playerId={playerId}
          />
        </div>
        
        <div className="w-64 bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xl font-bold mb-4">Game Info</h3>
          
          {gameState?.game_state === 'lobby' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold mb-2">Players:</h4>
                <div className="space-y-1">
                  {gameState?.players && Object.entries(gameState.players).map(([id, player]) => (
                    <div key={id} className="text-sm">
                      {player.name} ({player.civilization})
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={startGame}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Start Game
              </button>
            </div>
          )}
          
          {gameState?.game_state === 'playing' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold mb-2">Age: Dark Age</h4>
                <p className="text-sm text-gray-400">Research technologies to advance</p>
              </div>
              
              <div>
                <h4 className="font-bold mb-2">Controls:</h4>
                <p className="text-xs text-gray-400">
                  • Left click + drag to select units<br/>
                  • Right click to move selected units<br/>
                  • Select villagers to gather resources
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [currentScreen, setCurrentScreen] = useState('lobby');
  const [gameData, setGameData] = useState({});

  const handleJoinGame = (roomId, playerName, civilization) => {
    setGameData({
      roomId,
      playerId: Date.now().toString(),
      playerName,
      civilization
    });
    setCurrentScreen('game');
  };

  return (
    <div className="App">
      {currentScreen === 'lobby' && (
        <GameLobby onJoinGame={handleJoinGame} />
      )}
      {currentScreen === 'game' && (
        <GameRoom
          roomId={gameData.roomId}
          playerId={gameData.playerId}
          playerName={gameData.playerName}
          civilization={gameData.civilization}
        />
      )}
    </div>
  );
}

export default App;