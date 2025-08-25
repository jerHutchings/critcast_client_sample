# CritCast Client Sample

A simple HTML/JavaScript client that demonstrates how to connect to CritCast, watch live dice rolls, and send your own rolls.

**NEW: Now includes a Python proxy server for easy integration with the production CritCast API!**

## 🚀 Quick Start Options
For testing and demonstrations, test project forwards roll creation requests to the production CritCast API using a local Python proxy server.

1. **Start the proxy server:**
  - On Windows PowerShell:
    ```powershell
    .\start-proxy.ps1
    ```
  - Or use the batch file:
    ```bat
    start-proxy.bat
    ```
  This launches `crit_proxy_server.py` on port 8090.

2. **Serve the client:**
  ```powershell
  .\serve.ps1
  ```
  This serves `index.html` and `client.js` on http://localhost:8090.

3. **Connect:** Open http://localhost:8090 in your browser and use the default settings.

## Features

- **WebSocket Connection**: Real-time connection to CritCast tables
- **Live Roll Feed**: Watch dice rolls from all players in real-time
- **Roll Creation**: Send your own dice rolls with character context
- **Simple UI**: Clean, dark-themed interface
- **Dice Simulation**: Built-in dice rolling simulation for testing

## Getting Started

### Prerequisites

1. **API Key**: Get an API key from your CritCast account
2. **Table ID**: Know the Table ID you want to connect to

### Setup

1. **Open the Client**: Simply open http://localhost:8090 in any modern web browser
2. **Configure Connection**:
   - **Server URL**: Enter your CritCast proxy server URL (e.g., `http://localhost:8090`)
   - **API Key**: Enter your API key from the CritCast web interface
   - **Table ID**: Enter the Table ID you want to connect to
3. **Connect**: Click "Connect to Table"

### Usage

#### Watching Rolls
- Once connected, you'll see live rolls from all players in the "Live Roll Feed"
- Each roll shows:
  - Total result (large number)
  - Dice notation (e.g., "1d20+5")
  - Individual dice results
  - Character name and context tags
  - Timestamp and source

#### Creating Rolls
1. **Dice Notation**: Enter standard dice notation (e.g., `1d20+5`, `2d6`, `1d4+1d6+2`)
2. **Character Name**: Enter your character's name
3. **Roll Type**: Select the type of roll (attack, damage, skill, save, other)
4. **Weapon/Spell**: Optional - add weapon or spell name
5. **Send Roll**: Click "Send Roll" to broadcast your roll

## Supported Dice Notation

The client supports standard dice notation:

- `1d20` - Single twenty-sided die
- `2d6` - Two six-sided dice
- `1d20+5` - Twenty-sided die plus 5
- `2d6+3` - Two six-sided dice plus 3
- `1d8+1d6` - Eight-sided die plus six-sided die
- `3d6-1` - Three six-sided dice minus 1

## File Structure

```
critcast_client_sample/
├── client.js               # JavaScript client logic
├── crit_proxy_server.py    # Python proxy server for REST API
├── index.html              # Main HTML interface
├── README.md               # This file
├── requirements.txt        # Python dependencies for proxy server
├── start-proxy.bat         # Batch script to start proxy server
├── start-proxy.ps1         # PowerShell script to start proxy server
├── serve.ps1               # PowerShell script to serve client files
├── venv/                   # Python virtual environment (auto-created)
└── .git/                   # Git repository metadata
```

## Technical Details

### WebSocket & REST API

- **WebSocket**: The client always connects to CritCast's production WebSocket endpoint (`wss://api.critcast.com`) for live roll feeds.
- **REST API**: Roll creation requests are sent to the server URL specified in the UI. In Proxy Server Mode, this should be `http://localhost:8090` (handled by `crit_proxy_server.py`).

### Roll Data Format

Rolls follow the CritCast standard format:

```json
{
  "rollId": "unique-id",
  "tenantId": "tenant-id",
  "tableId": "table-id",
  "notation": "1d20+5",
  "dice": [{"sides": 20, "value": 15, "type": "standard"}],
  "modifiers": [{"type": "add", "value": 5, "source": "modifier"}],
  "total": 20,
  "context": {
    "rollType": "attack",
    "character": "Roland",
    "weapon": "Longsword"
  },
  "source": {
    "type": "app",
    "appName": "CritCast Client Sample",
    "version": "1.0.0"
  },
  "timestamp": "2025-08-14T14:30:00.000Z"
}
```

## Troubleshooting

### Connection Issues
- **Check Server URL**: Ensure CritCast server is running and accessible
- **Verify API Key**: Check that your API key is valid and active
- **Table ID**: Confirm the table ID exists and you have access

### Roll Issues
- **Invalid Notation**: Check dice notation format (e.g., `1d20+5`)
- **Missing Character**: Character name is required for rolls
- **Authentication**: Ensure you're still connected to the table

### Browser Console
Check the browser's developer console (F12) for detailed error messages.

## Example Session

1. Start the proxy server: `start-proxy.ps1` or `start-proxy.bat`
2. Open http://localhost:8090 in your browser
3. Enter your API key and Table ID
4. Connect and start rolling dice and watching the live feed!

## Development

This is a simple client for demonstration purposes. For production use, consider:

- Error handling improvements
- Reconnection logic
- Input validation
- UI/UX enhancements
- Mobile responsiveness
- Offline support

## License

This sample client is provided as-is for demonstration and testing purposes.
