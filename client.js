// CritCast Client Sample JavaScript
console.log('CritCast client.js loading...');

// Check if Socket.IO is available
if (typeof io === 'undefined') {
    console.error('Socket.IO library not loaded! Make sure the CDN link is working.');
}

let socket = null;
let isConnected = false;
let currentConfig = {
    serverUrl: '',
    apiKey: '',
    tableId: '',
    tenantId: ''
};

// Connection Management
async function toggleConnection() {
    if (isConnected) {
        disconnect();
    } else {
        await connect();
    }
}

async function connect() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const tableId = document.getElementById('tableId').value.trim();

    if (!apiKey || !tableId) {
        showError('Please fill in all required fields');
        return;
    }

    try {
        setStatus('connecting', 'Connecting...');

        // Store config (serverUrl only used for REST calls)
        currentConfig = {
            serverUrl: document.getElementById('serverUrl').value.trim(),
            apiKey,
            tableId,
            tenantId: 'unknown' // Will be determined from API responses
        };

        // Always connect WebSocket to api.critcast.com
        socket = io('wss://api.critcast.com', {
            transports: ['websocket', 'polling'],
            auth: {
                apiKey: apiKey
            }
        });

        socket.on('connect', () => {
            console.log('Socket.IO connected');
            
            // Subscribe to the table using the correct event name
            socket.emit('subscribe:table', {
                tableId: tableId
            });
            
            setStatus('connected', `Connected to server`);
            isConnected = true;
            updateUI();
            showSuccess('Connected successfully! Subscribing to table...');
        });

        socket.on('table:subscribed', (data) => {
            console.log('Subscribed to table:', data);
            updateLastMessage({ type: 'table:subscribed', ...data });
            showSuccess(`Subscribed to table: ${data.tableId}`);
        });

        socket.on('table:history', (data) => {
            console.log('Received table history:', data);
            updateLastMessage({ type: 'table:history', ...data });
            if (data.rolls && data.rolls.length > 0) {
                showSuccess(`Loaded ${data.rolls.length} recent rolls`);
                // Add rolls in reverse order so most recent appears at top
                data.rolls.reverse().forEach(roll => addRollToFeed(roll));
            }
        });

        socket.on('roll:new', (rollData) => {
            console.log('Received new roll:', rollData);
            updateLastMessage({ type: 'roll:new', roll: rollData });
            addRollToFeed(rollData);
        });

        socket.on('message', (data) => {
            console.log('Received message:', data);
            updateLastMessage({ type: 'message', ...data });
            handleIncomingMessage(data);
        });

        socket.on('roll', (rollData) => {
            console.log('Received roll:', rollData);
            updateLastMessage({ type: 'roll', roll: rollData });
            handleIncomingMessage({ type: 'roll', roll: rollData });
        });

        socket.on('disconnect', () => {
            console.log('Socket.IO disconnected');
            setStatus('disconnected', 'Disconnected');
            isConnected = false;
            updateUI();
        });

        socket.on('connect_error', (error) => {
            console.error('Socket.IO connection error:', error);
            showError(`Connection error: ${error.message}`);
            setStatus('disconnected', 'Connection failed');
            isConnected = false;
            updateUI();
        });

        socket.on('error', (error) => {
            console.error('Socket.IO error:', error);
            showError(`Socket error: ${error.message || error}`);
        });

        // Proxy server specific event handlers
        socket.on('connected', (data) => {
            console.log('Proxy server connected:', data);
            showSuccess(`Connected to ${data.server || 'CritCast Proxy'}`);
        });

        socket.on('roll_forwarded', (data) => {
            console.log('Roll forwarded successfully:', data);
            if (data.success) {
                showSuccess(`Roll forwarded to CritCast API successfully!`);
            }
        });

        socket.on('roll_error', (data) => {
            console.error('Roll forwarding error:', data);
            showError(data.message || 'Failed to forward roll');
        });

        socket.on('roll_result', (data) => {
            console.log('Roll result received:', data);
            addRollToFeed({
                rollId: generateRollId(),
                notation: data.notation,
                dice: data.rolls ? data.rolls.map(val => ({ value: val })) : [],
                modifiers: [{ value: data.modifier || 0 }],
                total: data.result,
                context: {
                    rollType: 'forwarded',
                    character: data.player || 'Unknown Player'
                },
                source: {
                    type: 'proxy',
                    appName: 'CritCast Proxy Server'
                },
                timestamp: data.timestamp || new Date().toISOString()
            });
        });

        // Set a timeout for connection
        setTimeout(() => {
            if (!isConnected) {
                showError('Connection timeout - check your server URL and try again');
                if (socket) {
                    socket.close();
                }
            }
        }, 10000);

    } catch (error) {
        console.error('Connection error:', error);
        showError(`Connection failed: ${error.message}`);
        setStatus('disconnected', 'Connection failed');
        updateUI();
    }
}

function disconnect() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    isConnected = false;
    setStatus('disconnected', 'Disconnected');
    updateUI();
    showSuccess('Disconnected');
}

function setStatus(type, message) {
    const statusEl = document.getElementById('connectionStatus');
    statusEl.className = `status ${type}`;
    statusEl.textContent = message;
}

function updateUI() {
    const connectBtn = document.getElementById('connectBtn');
    const rollBtn = document.getElementById('rollBtn');
    
    connectBtn.textContent = isConnected ? 'Disconnect' : 'Connect to Table';
    rollBtn.disabled = !isConnected;
}

// Roll Creation
async function sendRoll() {
    if (!isConnected) {
        showError('Not connected to a table');
        return;
    }

    const notation = document.getElementById('notation').value.trim();
    const character = document.getElementById('character').value.trim();
    const rollType = document.getElementById('rollType').value;
    const weapon = document.getElementById('weapon').value.trim();

    if (!notation || !character) {
        showError('Notation and character name are required');
        return;
    }

    try {
        // Parse the dice notation and simulate the roll
        const rollResult = simulateRoll(notation);

        const rollData = {
            rollId: generateRollId(),
            tableId: currentConfig.tableId,
            notation: notation,
            dice: rollResult.dice,
            modifiers: rollResult.modifiers,
            total: rollResult.total,
            context: {
                rollType: rollType,
                character: character,
                ...(weapon && { weapon: weapon })
            },
            source: {
                type: 'app',
                appName: 'CritCast Client Sample',
                version: '1.0.0'
            },
            timestamp: new Date().toISOString()
        };

        // Send the roll via Socket.IO (compatible with proxy server)
        // Always use HTTP POST to proxy for Create Roll
        const serverUrl = document.getElementById('serverUrl').value.trim();
        const response = await fetch(`${serverUrl}/api/v1/ingest`, {
            method: 'POST',
            headers: {
                'X-API-Key': currentConfig.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rollData)
        });

        if (!response.ok) {
            throw new Error(`Failed to send roll: ${response.statusText}`);
        }

        const result = await response.json();
    showSuccess(`Roll sent via HTTP! Roll ID: ${result.rollId}`);
    document.getElementById('weapon').value = '';

    } catch (error) {
        console.error('Error sending roll:', error);
        showError(`Failed to send roll: ${error.message}`);
    }
}

// Dice Simulation
function simulateRoll(notation) {
    try {
        // Parse notation like "1d20+5", "2d6", "1d4+1d6+2"
        const dice = [];
        const modifiers = [];
        let total = 0;

        // Simple parser for basic dice notation
        const parts = notation.toLowerCase().replace(/\s/g, '').split(/(?=[+-])/);
        
        for (const part of parts) {
            const cleanPart = part.replace(/^[+-]/, '');
            const isNegative = part.startsWith('-');
            
            if (cleanPart.includes('d')) {
                // It's a die roll
                const [count, sides] = cleanPart.split('d').map(n => parseInt(n) || 1);
                
                for (let i = 0; i < count; i++) {
                    const value = Math.floor(Math.random() * sides) + 1;
                    dice.push({
                        sides: sides,
                        value: isNegative ? -value : value,
                        type: 'standard'
                    });
                    total += isNegative ? -value : value;
                }
            } else if (!isNaN(parseInt(cleanPart))) {
                // It's a modifier
                const value = parseInt(cleanPart);
                modifiers.push({
                    type: isNegative ? 'subtract' : 'add',
                    value: Math.abs(value),
                    source: 'modifier'
                });
                total += isNegative ? -value : value;
            }
        }

        return { dice, modifiers, total };
    } catch (error) {
        console.error('Error parsing dice notation:', error);
        throw new Error('Invalid dice notation');
    }
}

// Message Handling
function handleIncomingMessage(data) {
    console.log('Received message:', data);
    
    // Update the last message display
    updateLastMessage(data);
    
    if (data.type === 'roll') {
        addRollToFeed(data.roll);
    } else if (data.type === 'subscribed') {
        showSuccess(`Subscribed to table: ${data.tableId}`);
        if (data.recentRolls && data.recentRolls.length > 0) {
            showSuccess(`Loaded ${data.recentRolls.length} recent rolls`);
            data.recentRolls.forEach(roll => addRollToFeed(roll));
        }
    } else if (data.type === 'error') {
        showError(`Server error: ${data.message}`);
    }
}

function updateLastMessage(data) {
    const lastMessageEl = document.getElementById('lastMessage');
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${JSON.stringify(data, null, 2)}`;
    lastMessageEl.value = formattedMessage;
    
    // Auto-scroll to top of the textarea
    lastMessageEl.scrollTop = 0;
}

function addRollToFeed(roll) {
    const rollFeed = document.getElementById('rollFeed');
    
    const rollItem = document.createElement('div');
    rollItem.className = 'roll-item';
    
    const diceDetails = roll.dice.map(die => `d${die.sides}(${die.value})`).join(' + ');
    const modifierDetails = roll.modifiers && roll.modifiers.length > 0 
        ? roll.modifiers.map(mod => `${mod.type === 'add' ? '+' : '-'}${mod.value}`).join(' ')
        : '';
    
    rollItem.innerHTML = `
        <div class="roll-total">${roll.total}</div>
        <div class="roll-notation">${roll.notation}</div>
        <div class="dice-details">${diceDetails}${modifierDetails ? ' ' + modifierDetails : ''}</div>
        ${roll.context ? createContextTags(roll.context) : ''}
        <div style="font-size: 11px; color: #6b7280; margin-top: 8px;">
            ${new Date(roll.timestamp).toLocaleTimeString()} • ${roll.source?.type || 'unknown'}
        </div>
    `;
    
    // Add to top of feed
    rollFeed.insertBefore(rollItem, rollFeed.firstChild);
    
    // Limit feed to 50 items
    while (rollFeed.children.length > 50) {
        rollFeed.removeChild(rollFeed.lastChild);
    }
}

function createContextTags(context) {
    let html = '<div class="roll-context">';
    
    if (context.character) {
        html += `<span class="context-tag character">${context.character}</span>`;
    }
    if (context.rollType) {
        html += `<span class="context-tag rollType">${context.rollType}</span>`;
    }
    if (context.weapon) {
        html += `<span class="context-tag">${context.weapon}</span>`;
    }
    if (context.spell) {
        html += `<span class="context-tag">${context.spell}</span>`;
    }
    if (context.skill) {
        html += `<span class="context-tag">${context.skill}</span>`;
    }
    
    html += '</div>';
    return html;
}

function clearRollFeed() {
    const rollFeed = document.getElementById('rollFeed');
    const lastMessage = document.getElementById('lastMessage');
    
    rollFeed.innerHTML = '<div style="text-align: center; color: #6b7280; margin-top: 50px;">Roll feed cleared</div>';
    lastMessage.value = '';
    lastMessage.placeholder = 'Feed cleared - waiting for new messages...';
}

// Utility Functions
function generateRollId() {
    return 'roll_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function showError(message) {
    showMessage(message, 'error');
}

function showSuccess(message) {
    showMessage(message, 'success');
}

function showMessage(message, type) {
    const statusDiv = document.getElementById('rollStatus');
    statusDiv.className = type;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    
    // Add enter key support for form fields
    document.getElementById('tableId').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isConnected) {
            connect();
        }
    });
    
    document.getElementById('notation').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && isConnected) {
            sendRoll();
        }
    });
});

// Expose functions to global scope for onclick handlers
try {
    window.toggleConnection = toggleConnection;
    window.sendRoll = sendRoll;
    window.clearRollFeed = clearRollFeed;
    console.log('Functions exposed to global scope successfully');
} catch (error) {
    console.error('Error exposing functions to global scope:', error);
}

// Add a backup function definition in case of issues
if (typeof window.toggleConnection === 'undefined') {
    window.toggleConnection = function() {
        console.error('toggleConnection was not properly defined, using backup');
        alert('There was an issue loading the JavaScript. Please refresh the page.');
    };
}

console.log('CritCast client.js loaded successfully');
