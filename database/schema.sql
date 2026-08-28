CREATE TABLE victims (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    phone VARCHAR(20),
    blood_group VARCHAR(5)
);

CREATE TABLE sos_messages (
    id SERIAL PRIMARY KEY,
    victim_id INTEGER REFERENCES victims(id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    emergency_type VARCHAR(50),
    severity INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rescue_status VARCHAR(50) DEFAULT 'PENDING'
);
