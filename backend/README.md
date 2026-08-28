# ResQ-Logix Backend

This is the Node.js/Express backend for ResQ-Logix. It provides REST APIs for the Rescue Command Dashboard to read SOS data, and for the Gateway to post SOS data. It uses SQLite for local offline storage.

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Server

Start the backend server:
```bash
npm start
```
The server will run on `http://localhost:3000`.

## Seeding Demo Data

To generate sample SOS alerts and victims for testing:
```bash
node seed.js
```
