#!/usr/bin/env node
/**
 * 赛博人 CLI 交互式客户端
 * 通过 WebSocket 连接 Bot API，发送指令和查看状态
 * Usage: node cli-client.mjs [ws-url]  默认: http://localhost:3000
 */

import { io } from 'socket.io-client';
import readline from 'readline';

const WS_URL = process.argv[2] || 'http://localhost:3000';
const API_URL = WS_URL.replace(/\/$/, '');

console.log(`\n🔌 Connecting to ${WS_URL}...`);
const socket = io(WS_URL);

// ========== State ==========
let botStatus = { online: false, username: '?', health: 0, position: { x: 0, y: 0, z: 0 } };
let rl = null;

// ========== WebSocket Events ==========
socket.on('connect', () => {
  console.log(`✅ Connected. Bot: ${WS_URL}\n`);
  printHelp();
  startReadline();
});

socket.on('disconnect', () => console.log('❌ Disconnected'));
socket.on('connect_error', (e) => console.log('❌ Connection error:', e.message));

socket.on('status', (s) => {
  botStatus = s;
  const emoji = s.online ? '🟢' : '🔴';
  const pos = s.position;
  process.stdout.write(`\r${emoji} ${s.username} | ❤${s.health} 🍗${s.food} | (${pos.x.toFixed(0)},${pos.y.toFixed(0)},${pos.z.toFixed(0)}) | ${s.dimension} | ${s.reconnecting ? '🔄RECONNECTING' : ''}${s.proxyMode ? '🎮PROXY' : ''}  `);
});

socket.on('chat', (msg) => {
  process.stdout.write('\r' + ' '.repeat(80) + '\r'); // clear status line
  if (msg.username === botStatus.username) {
    console.log(`  🤖 ${msg.message}`);
  } else {
    console.log(`  👤 ${msg.username}: ${msg.message}`);
  }
  if (rl) rl.prompt(true);
});

socket.on('proxy:result', (r) => {
  console.log(`  📡 Proxy result: ${JSON.stringify(r)}`);
  if (rl) rl.prompt(true);
});

// ========== Readline ==========
function startReadline() {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\n> ',
    terminal: true,
  });
  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }

    const parts = input.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    try {
      switch (cmd) {
        case '/help':
        case '/h':
          printHelp();
          break;

        case '/status':
        case '/s':
          console.log(JSON.stringify(botStatus, null, 2));
          break;

        case '/say':
        case '/chat':
          if (!args) { console.log('  Usage: /say <message>'); break; }
          socket.emit('chat', args);
          console.log(`  📤 Sent: ${args}`);
          break;

        case '/proxy':
        case '/p':
          if (args === 'on') {
            await fetch(`${API_URL}/api/proxy/enable`, { method: 'POST' });
            console.log('  🎮 Proxy mode: ON');
          } else if (args === 'off') {
            await fetch(`${API_URL}/api/proxy/disable`, { method: 'POST' });
            console.log('  🎮 Proxy mode: OFF');
          } else {
            console.log('  Usage: /proxy on|off');
          }
          break;

        case '/move': {
          // /move forward|back|left|right|jump|sprint|sneak
          const dir = args || 'forward';
          await fetch(`${API_URL}/api/proxy/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'move', params: { direction: dir } }),
          });
          console.log(`  🚶 Moving: ${dir}`);
          break;
        }

        case '/dig':
          await fetch(`${API_URL}/api/proxy/command`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'dig', params: {} }),
          });
          console.log('  ⛏ Digging');
          break;

        case '/place':
          await fetch(`${API_URL}/api/proxy/command`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'place', params: {} }),
          });
          console.log('  🧱 Placing');
          break;

        case '/attack':
          await fetch(`${API_URL}/api/proxy/command`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'attack', params: {} }),
          });
          console.log('  ⚔ Attack');
          break;

        case '/use':
          await fetch(`${API_URL}/api/proxy/command`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'use', params: {} }),
          });
          console.log('  🖐 Using item');
          break;

        case '/look': {
          // /look <direction>  north|south|east|west|up|down
          const yaws = { north: Math.PI, south: 0, east: -Math.PI / 2, west: Math.PI / 2, up: 0, down: 0 };
          const pitches = { up: -Math.PI / 2, down: Math.PI / 2, north: 0, south: 0, east: 0, west: 0 };
          const d = args || 'south';
          await fetch(`${API_URL}/api/proxy/command`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'look', params: { yaw: yaws[d] || 0, pitch: pitches[d] || 0 } }),
          });
          console.log(`  👀 Looking: ${d}`);
          break;
        }

        case '/goto': {
          // /goto <x> <y> <z>
          const coords = args.split(/\s+/).map(Number);
          if (coords.length < 3) { console.log('  Usage: /goto <x> <y> <z>'); break; }
          await fetch(`${API_URL}/api/proxy/command`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'goto', params: { x: coords[0], y: coords[1], z: coords[2] } }),
          });
          console.log(`  🗺 Going to (${coords[0]}, ${coords[1]}, ${coords[2]})`);
          break;
        }

        case '/health':
        case '/hcheck': {
          const res = await fetch(`${API_URL}/api/health`);
          const data = await res.json();
          console.log(JSON.stringify(data, null, 2));
          break;
        }

        case '/exp':
        case '/memory': {
          const res = await fetch(`${API_URL}/api/exp`);
          const data = await res.json();
          console.log(data.content || JSON.stringify(data, null, 2));
          break;
        }

        case '/version':
        case '/v': {
          const res = await fetch(`${API_URL}/api/version`);
          const data = await res.json();
          console.log(JSON.stringify(data, null, 2));
          break;
        }

        case '/exit':
        case '/quit':
        case '/q':
          console.log('👋 Goodbye!');
          process.exit(0);

        default:
          // Treat as chat message
          socket.emit('chat', input);
          console.log(`  📤 Sent: ${input}`);
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
    rl.prompt();
  });

  rl.on('close', () => process.exit(0));
}

function printHelp() {
  console.log(`
╔══════════════════════════════════════════════╗
║        Cyborg CLI Client - Commands         ║
╠══════════════════════════════════════════════╣
║  /help, /h          This help               ║
║  /status, /s        Bot status              ║
║  /health, /hcheck   Health report           ║
║  /version, /v       Version info            ║
║  /exp, /memory      Experience memory       ║
║                                              ║
║  /say <msg>         Send chat message       ║
║  <any text>         Send as chat (default)  ║
║                                              ║
║  /proxy on|off      Toggle proxy mode       ║
║  /move <dir>        Move (forward/back/...) ║
║  /look <dir>        Look (north/south/...)  ║
║  /dig               Dig block               ║
║  /place             Place block             ║
║  /attack            Attack entity           ║
║  /use               Use held item           ║
║  /goto <x> <y> <z>  Pathfind to coords     ║
║                                              ║
║  /exit, /quit, /q   Disconnect             ║
╚══════════════════════════════════════════════╝
  `);
}