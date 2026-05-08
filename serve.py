#!/usr/bin/env python3
"""Tiny dev server for HOO's Dino Run.

Usage:
  python serve.py            # default http://127.0.0.1:8000
  python serve.py 8080       # custom port

Why we need this:
  Just opening index.html via file:// works for most things, but some browsers
  block localStorage / module loading on file://. Run this from the project
  folder and visit the printed URL.
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
    }

    # Disable client caching so refreshing actually picks up changes during dev.
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    addr = ("127.0.0.1", port)
    with ThreadingHTTPServer(addr, Handler) as httpd:
        url = f"http://{addr[0]}:{addr[1]}/"
        print(f"Serving on {url}  (Ctrl+C to stop)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nbye.")


if __name__ == "__main__":
    main()
