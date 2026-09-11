import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def main():
    print("=" * 60)
    print(" 🚀 SHAHNOZA RAXMONBERDIYEVA — 3D SPACE PORTFOLIO")
    print("=" * 60)
    print(f" Serving at: http://localhost:{PORT}")
    print(" Press Ctrl+C to stop the server.")
    print("=" * 60)

    # Automatically open the default browser
    webbrowser.open(f"http://localhost:{PORT}")

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server. Safe travels through the cosmos!")
            httpd.server_close()
            sys.exit(0)

if __name__ == '__main__':
    main()
