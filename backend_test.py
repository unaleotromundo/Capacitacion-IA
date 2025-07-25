#!/usr/bin/env python3
"""
Age of Empires 2 Backend Testing Suite
Tests WebSocket functionality, game room management, and multiplayer game flow
"""

import asyncio
import json
import requests
import websockets
import uuid
from datetime import datetime
import sys
import os

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
        return None

BACKEND_URL = get_backend_url()
if not BACKEND_URL:
    print("ERROR: Could not get REACT_APP_BACKEND_URL from frontend/.env")
    sys.exit(1)

API_BASE = f"{BACKEND_URL}/api"
WS_BASE = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://')

print(f"Testing backend at: {API_BASE}")
print(f"WebSocket base: {WS_BASE}")

class BackendTester:
    def __init__(self):
        self.test_results = []
        self.room_id = None
        self.player_id = str(uuid.uuid4())
        
    def log_result(self, test_name, success, message="", details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if message:
            print(f"    {message}")
        if details and not success:
            print(f"    Details: {details}")
        print()

    def test_health_check(self):
        """Test basic API health check"""
        try:
            response = requests.get(f"{API_BASE}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "Age of Empires" in data.get("message", ""):
                    self.log_result("API Health Check", True, f"Response: {data}")
                    return True
                else:
                    self.log_result("API Health Check", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("API Health Check", False, f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("API Health Check", False, f"Request failed: {str(e)}")
            return False

    def test_create_room(self):
        """Test room creation"""
        try:
            room_data = {
                "name": "Test Game Room",
                "max_players": 2
            }
            response = requests.post(f"{API_BASE}/rooms", json=room_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "name" in data:
                    self.room_id = data["id"]
                    self.log_result("Room Creation", True, f"Created room: {data['name']} (ID: {self.room_id})")
                    return True
                else:
                    self.log_result("Room Creation", False, f"Invalid response format: {data}")
                    return False
            else:
                self.log_result("Room Creation", False, f"Status code: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Room Creation", False, f"Request failed: {str(e)}")
            return False

    def test_get_rooms(self):
        """Test getting room list"""
        try:
            response = requests.get(f"{API_BASE}/rooms", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    room_found = False
                    if self.room_id:
                        room_found = any(room.get("id") == self.room_id for room in data)
                    
                    self.log_result("Get Rooms List", True, 
                                  f"Found {len(data)} rooms. Test room found: {room_found}")
                    return True
                else:
                    self.log_result("Get Rooms List", False, f"Expected list, got: {type(data)}")
                    return False
            else:
                self.log_result("Get Rooms List", False, f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Get Rooms List", False, f"Request failed: {str(e)}")
            return False

    async def test_websocket_connection(self):
        """Test WebSocket connection"""
        if not self.room_id:
            self.log_result("WebSocket Connection", False, "No room ID available for testing")
            return False
            
        try:
            ws_url = f"{WS_BASE}/ws/{self.room_id}"
            print(f"Connecting to WebSocket: {ws_url}")
            
            # Connect without timeout parameter in websockets.connect
            websocket = await asyncio.wait_for(websockets.connect(ws_url), timeout=5)
            self.log_result("WebSocket Connection", True, f"Connected to room {self.room_id}")
            return websocket
        except asyncio.TimeoutError:
            self.log_result("WebSocket Connection", False, "WebSocket connection timed out - likely due to Kubernetes ingress configuration not supporting WebSockets")
            return None
        except Exception as e:
            self.log_result("WebSocket Connection", False, f"Connection failed: {str(e)}")
            return None

    async def test_player_join(self, websocket):
        """Test player join functionality"""
        try:
            join_message = {
                "type": "player_join",
                "data": {
                    "player_id": self.player_id,
                    "name": "TestPlayer",
                    "civilization": "Britons"
                }
            }
            
            await websocket.send(json.dumps(join_message))
            
            # Wait for response
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            response_data = json.loads(response)
            
            if response_data.get("type") == "player_join":
                self.log_result("Player Join", True, f"Player joined successfully: {response_data}")
                return True
            else:
                self.log_result("Player Join", False, f"Unexpected response: {response_data}")
                return False
                
        except Exception as e:
            self.log_result("Player Join", False, f"Failed: {str(e)}")
            return False

    async def test_start_game(self, websocket):
        """Test game start functionality"""
        try:
            start_message = {
                "type": "start_game",
                "data": {}
            }
            
            await websocket.send(json.dumps(start_message))
            
            # Wait for response
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            response_data = json.loads(response)
            
            if response_data.get("type") == "start_game":
                self.log_result("Start Game", True, f"Game started successfully")
                return True
            else:
                self.log_result("Start Game", False, f"Unexpected response: {response_data}")
                return False
                
        except Exception as e:
            self.log_result("Start Game", False, f"Failed: {str(e)}")
            return False

    async def test_get_game_state(self, websocket):
        """Test getting game state"""
        try:
            state_message = {
                "type": "get_game_state",
                "data": {}
            }
            
            await websocket.send(json.dumps(state_message))
            
            # Wait for game state response
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            response_data = json.loads(response)
            
            if response_data.get("type") == "game_state":
                game_data = response_data.get("data", {})
                has_players = "players" in game_data
                has_units = "units" in game_data
                has_resources = "resources" in game_data
                
                self.log_result("Get Game State", True, 
                              f"Game state received - Players: {has_players}, Units: {has_units}, Resources: {has_resources}")
                return game_data
            else:
                self.log_result("Get Game State", False, f"Expected game_state, got: {response_data.get('type')}")
                return None
                
        except Exception as e:
            self.log_result("Get Game State", False, f"Failed: {str(e)}")
            return None

    async def test_unit_selection(self, websocket, game_state):
        """Test unit selection functionality"""
        try:
            # Find a unit to select
            units = game_state.get("units", {})
            if not units:
                self.log_result("Unit Selection", False, "No units available for selection")
                return False
                
            unit_id = list(units.keys())[0]
            
            select_message = {
                "type": "unit_select",
                "data": {
                    "unit_ids": [unit_id],
                    "player_id": self.player_id
                }
            }
            
            await websocket.send(json.dumps(select_message))
            
            # Wait for response
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            response_data = json.loads(response)
            
            if response_data.get("type") == "unit_select":
                self.log_result("Unit Selection", True, f"Unit {unit_id} selected successfully")
                return True
            else:
                self.log_result("Unit Selection", False, f"Unexpected response: {response_data}")
                return False
                
        except Exception as e:
            self.log_result("Unit Selection", False, f"Failed: {str(e)}")
            return False

    async def test_unit_movement(self, websocket, game_state):
        """Test unit movement functionality"""
        try:
            # Find a unit to move
            units = game_state.get("units", {})
            if not units:
                self.log_result("Unit Movement", False, "No units available for movement")
                return False
                
            unit_id = list(units.keys())[0]
            
            move_message = {
                "type": "unit_move",
                "data": {
                    "unit_id": unit_id,
                    "target_x": 200,
                    "target_y": 200
                }
            }
            
            await websocket.send(json.dumps(move_message))
            
            # Wait for response
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            response_data = json.loads(response)
            
            if response_data.get("type") == "unit_move":
                self.log_result("Unit Movement", True, f"Unit {unit_id} movement command sent successfully")
                return True
            else:
                self.log_result("Unit Movement", False, f"Unexpected response: {response_data}")
                return False
                
        except Exception as e:
            self.log_result("Unit Movement", False, f"Failed: {str(e)}")
            return False

    def test_game_logic_simulation(self):
        """Test game logic without WebSocket by simulating game state"""
        try:
            # Test game room creation and management
            response = requests.get(f"{API_BASE}/rooms/{self.room_id}", timeout=10)
            
            if response.status_code == 200:
                room_data = response.json()
                if "id" in room_data and room_data["id"] == self.room_id:
                    self.log_result("Game Room Retrieval", True, f"Successfully retrieved room data: {room_data}")
                    return True
                else:
                    self.log_result("Game Room Retrieval", False, f"Room ID mismatch or invalid data: {room_data}")
                    return False
            else:
                self.log_result("Game Room Retrieval", False, f"Failed to retrieve room: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Game Room Retrieval", False, f"Request failed: {str(e)}")
            return False

    def test_backend_models_validation(self):
        """Test backend data models and validation"""
        try:
            # Test creating multiple rooms to verify model consistency
            rooms_created = []
            for i in range(3):
                room_data = {
                    "name": f"Test Room {i+1}",
                    "max_players": 2
                }
                response = requests.post(f"{API_BASE}/rooms", json=room_data, timeout=10)
                if response.status_code == 200:
                    rooms_created.append(response.json())
                else:
                    self.log_result("Backend Models Validation", False, f"Failed to create room {i+1}")
                    return False
            
            # Verify all rooms were created with proper structure
            all_valid = True
            for room in rooms_created:
                if not all(key in room for key in ["id", "name", "players", "max_players", "game_state"]):
                    all_valid = False
                    break
            
            if all_valid:
                self.log_result("Backend Models Validation", True, f"Created {len(rooms_created)} rooms with valid structure")
                return True
            else:
                self.log_result("Backend Models Validation", False, "Room structure validation failed")
                return False
                
        except Exception as e:
            self.log_result("Backend Models Validation", False, f"Test failed: {str(e)}")
            return False

    async def run_websocket_tests(self):
        """Run all WebSocket-related tests"""
        websocket = await self.test_websocket_connection()
        if not websocket:
            return False
            
        try:
            # Test player join
            await self.test_player_join(websocket)
            
            # Test game start
            await self.test_start_game(websocket)
            
            # Test game state
            game_state = await self.test_get_game_state(websocket)
            
            if game_state:
                # Test unit operations
                await self.test_unit_selection(websocket, game_state)
                await self.test_unit_movement(websocket, game_state)
            
            return True
            
        except Exception as e:
            self.log_result("WebSocket Tests", False, f"Test suite failed: {str(e)}")
            return False
        finally:
            await websocket.close()

    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("STARTING AGE OF EMPIRES 2 BACKEND TESTS")
        print("=" * 60)
        
        # Test basic API endpoints
        print("\n--- API ENDPOINT TESTS ---")
        self.test_health_check()
        self.test_create_room()
        self.test_get_rooms()
        
        # Test additional backend functionality
        print("\n--- BACKEND LOGIC TESTS ---")
        self.test_game_logic_simulation()
        self.test_backend_models_validation()
        
        # Test WebSocket functionality
        print("\n--- WEBSOCKET TESTS ---")
        asyncio.run(self.run_websocket_tests())
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # List failed tests
        failed_tests = [result for result in self.test_results if not result['success']]
        if failed_tests:
            print(f"\nFAILED TESTS:")
            for test in failed_tests:
                print(f"  ❌ {test['test']}: {test['message']}")
        
        print("\n" + "=" * 60)
        
        return passed == total

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)