#!/usr/bin/env python3
"""
CritCast Proxy Server

Serves static files (index.html, client.js) and proxies roll creation requests to CritCast API.
"""

import aiohttp
from aiohttp import web
import ssl

PROXY_PORT = 8090
CRITCAST_API_URL = "https://api.critcast.com"

http_session = None

async def init_http_session():
    global http_session
    connector = aiohttp.TCPConnector(ssl=ssl.create_default_context())
    http_session = aiohttp.ClientSession(connector=connector)

async def cleanup_http_session():
    global http_session
    if http_session:
        await http_session.close()

async def serve_index(request):
    try:
        with open('index.html', 'r', encoding='utf-8') as f:
            content = f.read()
        return web.Response(text=content, content_type='text/html')
    except Exception as e:
        return web.Response(text=f"Error: {e}", status=500)

async def serve_client_js(request):
    try:
        with open('client.js', 'r', encoding='utf-8') as f:
            content = f.read()
        return web.Response(text=content, content_type='application/javascript')
    except Exception as e:
        return web.Response(text=f"Error: {e}", status=500)

async def proxy_roll(request):
    try:
        data = await request.json()
        api_key = request.headers.get('X-API-Key')
        headers = {
            'Content-Type': 'application/json',
            'X-API-Key': api_key,
            'User-Agent': 'CritCast-Client-Sample-Proxy/1.0'
        }
        api_endpoint = f"{CRITCAST_API_URL}/api/v1/ingest"
        async with http_session.post(api_endpoint, json=data, headers=headers) as resp:
            resp_data = await resp.text()
            # Remove charset from content_type if present
            content_type = resp.headers.get('Content-Type', 'application/json')
            if ';' in content_type:
                content_type = content_type.split(';')[0].strip()
            return web.Response(text=resp_data, status=resp.status, content_type=content_type)
    except Exception as e:
        return web.Response(text=f"{{'error': '{e}'}}", status=500, content_type='application/json')

app = web.Application()
app.router.add_get('/', serve_index)
app.router.add_get('/client.js', serve_client_js)
app.router.add_post('/api/v1/ingest', proxy_roll)

async def on_startup(app):
    await init_http_session()

async def on_cleanup(app):
    await cleanup_http_session()

app.on_startup.append(on_startup)
app.on_cleanup.append(on_cleanup)

if __name__ == '__main__':
    web.run_app(app, host='localhost', port=PROXY_PORT)
