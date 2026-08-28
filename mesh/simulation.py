import time
import uuid
import requests
import json

BACKEND_URL = "http://localhost:3000/api/v1"

class Node:
    def __init__(self, node_id, is_gateway=False):
        self.node_id = node_id
        self.is_gateway = is_gateway
        self.message_cache = set()

    def receive_message(self, message, source_node_id):
        msg_id = message['messageId']
        
        print(f"\n[{self.node_id}] Received message {msg_id} from {source_node_id}")
        
        if msg_id in self.message_cache:
            print(f"[{self.node_id}] DROP: Duplicate message")
            return None
            
        self.message_cache.add(msg_id)
        
        if message['ttl'] <= 0:
            print(f"[{self.node_id}] DROP: TTL expired")
            return None

        if self.is_gateway:
            print(f"[GATEWAY {self.node_id}] SUCCESS: Delivered to Backend API")
            message['hopCount'] += 1
            # Send to backend
            try:
                # Log relay
                requests.post(f"{BACKEND_URL}/mesh/relay", json={
                    "messageId": msg_id,
                    "sourceNode": source_node_id,
                    "currentNode": self.node_id,
                    "nextNode": "Backend",
                    "ttl": message['ttl'],
                    "hopCount": message['hopCount']
                })
                # Final delivery
                response = requests.post(f"{BACKEND_URL}/mesh/send", json=message)
                print(f"[GATEWAY] Backend response: {response.json()}")
            except Exception as e:
                print(f"[GATEWAY] Error connecting to backend: {e}")
            return None
        else:
            message['ttl'] -= 1
            message['hopCount'] += 1
            print(f"[{self.node_id}] FORWARD: Relaying to next node (TTL: {message['ttl']}, Hops: {message['hopCount']})")
            
            # Send relay event to backend for demo visualization
            try:
                requests.post(f"{BACKEND_URL}/mesh/relay", json={
                    "messageId": msg_id,
                    "sourceNode": source_node_id,
                    "currentNode": self.node_id,
                    "nextNode": "Unknown",
                    "ttl": message['ttl'],
                    "hopCount": message['hopCount']
                })
            except:
                pass # Ignore if backend is down during relay

            return message

def simulate_mesh():
    print("=== ResQ-Logix Mesh Network Simulation ===")
    
    gateway = Node("Gateway-ESP32", is_gateway=True)
    relay1 = Node("Phone-Relay-01")
    relay2 = Node("Phone-Relay-02")
    relay3 = Node("Phone-Relay-03")
    
    victim_id = "Victim-999"
    sos_message = {
        "messageId": str(uuid.uuid4())[:8],
        "victimId": victim_id,
        "latitude": 28.6300,
        "longitude": 77.2200,
        "emergencyType": "EARTHQUAKE_TRAPPED",
        "description": "Building collapsed, we are trapped under rubble",
        "num_victims": 3,
        "is_trapped": True,
        "is_injured": True,
        "ttl": 4,
        "hopCount": 0
    }
    
    print(f"\n[VICTIM] Broadcasting SOS: {sos_message['messageId']}")
    print(f"ROUTE: {victim_id} -> {relay1.node_id} -> {relay2.node_id} -> {relay3.node_id} -> {gateway.node_id}")
    
    # Victim -> Relay 1
    time.sleep(1)
    msg1 = relay1.receive_message(sos_message.copy(), victim_id)
    
    # Relay 1 -> Relay 2
    if msg1:
        time.sleep(1)
        # Update nextNode for visual accuracy in demo
        try:
            requests.post(f"{BACKEND_URL}/mesh/relay", json={
                "messageId": msg1['messageId'],
                "sourceNode": victim_id,
                "currentNode": relay1.node_id,
                "nextNode": relay2.node_id,
                "ttl": msg1['ttl']+1,
                "hopCount": msg1['hopCount']
            })
        except: pass
        msg2 = relay2.receive_message(msg1, relay1.node_id)
        
        # Relay 2 -> Relay 3
        if msg2:
            time.sleep(1)
            try:
                requests.post(f"{BACKEND_URL}/mesh/relay", json={
                    "messageId": msg2['messageId'],
                    "sourceNode": relay1.node_id,
                    "currentNode": relay2.node_id,
                    "nextNode": relay3.node_id,
                    "ttl": msg2['ttl']+1,
                    "hopCount": msg2['hopCount']
                })
            except: pass
            msg3 = relay3.receive_message(msg2, relay2.node_id)
            
            # Relay 3 -> Gateway
            if msg3:
                time.sleep(1)
                try:
                    requests.post(f"{BACKEND_URL}/mesh/relay", json={
                        "messageId": msg3['messageId'],
                        "sourceNode": relay2.node_id,
                        "currentNode": relay3.node_id,
                        "nextNode": gateway.node_id,
                        "ttl": msg3['ttl']+1,
                        "hopCount": msg3['hopCount']
                    })
                except: pass
                gateway.receive_message(msg3, relay3.node_id)
            
    print("\nSimulation complete.")

if __name__ == "__main__":
    simulate_mesh()
