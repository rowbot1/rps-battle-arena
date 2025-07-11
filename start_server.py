#!/usr/bin/env python3
"""
Simple HTTP server for RPS Battle Arena
Automatically opens the game in your default browser
"""

import http.server
import socketserver
import webbrowser
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

print(f"🎮 Starting RPS Battle Arena server on port {PORT}...")
print(f"📁 Serving files from: {DIRECTORY}")

# Start the server
with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"✅ Server running at http://localhost:{PORT}")
    print("🌐 Opening game in browser...")
    
    # Open in browser
    webbrowser.open(f'http://localhost:{PORT}')
    
    print("\n🎯 Ready to earn passive income!")
    print("Press Ctrl+C to stop the server\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped. Thanks for playing!")