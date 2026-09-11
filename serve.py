import http.server
import socketserver
import webbrowser
import os
import sys

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def translate_path(self, path):
        resolved = super().translate_path(path)
        if os.path.exists(resolved):
            return resolved

        # Fallback resolution for flat/root files and (2) duplicate suffixes
        filename = os.path.basename(resolved)
        clean_name = filename.replace(' (2)', '')

        candidates = [
            os.path.join(DIRECTORY, 'assets', 'js', filename),
            os.path.join(DIRECTORY, 'assets', 'js', clean_name),
            os.path.join(DIRECTORY, 'assets', 'textures', filename),
            os.path.join(DIRECTORY, 'assets', 'textures', clean_name),
            os.path.join(DIRECTORY, clean_name),
        ]
        for c in candidates:
            if os.path.exists(c):
                return c
        return resolved

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
