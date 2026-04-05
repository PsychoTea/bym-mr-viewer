from __future__ import annotations

import json
import mimetypes
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib import parse

from bym_client import BymApiError, BymClient
from config import AppConfig


STATIC_DIR = Path(__file__).with_name("static")


class ViewerRequestHandler(BaseHTTPRequestHandler):
    client: BymClient
    config: AppConfig

    def do_GET(self) -> None:
        self._dispatch()

    def do_POST(self) -> None:
        self._dispatch()

    def log_message(self, format: str, *args: object) -> None:
        print(f"{self.address_string()} - {format % args}")

    def _dispatch(self) -> None:
        parsed_url = parse.urlsplit(self.path)
        path = parsed_url.path

        try:
            if path == "/api/config" and self.command == "GET":
                self._handle_get_config()
                return
            if path == "/api/worlds" and self.command == "GET":
                self._handle_get_worlds()
                return
            if path == "/api/leaderboards" and self.command == "GET":
                self._handle_get_leaderboards(parsed_url.query)
                return
            if path == "/api/auth/login" and self.command == "POST":
                self._handle_login()
                return
            if path == "/api/auth/refresh" and self.command == "POST":
                self._handle_refresh()
                return
            if path == "/api/map/meta" and self.command == "GET":
                self._handle_get_map_meta()
                return
            if path == "/api/map/init" and self.command == "GET":
                self._handle_get_map_init()
                return
            if path == "/api/map/cells" and self.command == "POST":
                self._handle_get_map_cells()
                return

            if self.command != "GET":
                self._send_json(
                    HTTPStatus.METHOD_NOT_ALLOWED,
                    {"error": f"Unsupported route: {path}"},
                )
                return

            self._serve_static(path)
        except BymApiError as exc:
            payload = exc.payload if isinstance(exc.payload, dict) else {}
            self._send_json(
                exc.status_code,
                {
                    "error": exc.message,
                    "details": payload,
                },
            )
        except ValueError as exc:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
        except Exception as exc:  # pragma: no cover - defensive handler
            self._send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {"error": "Viewer server failure", "details": str(exc)},
            )

    def _handle_get_config(self) -> None:
        self._send_json(
            HTTPStatus.OK,
            {
                "bymBaseUrl": self.config.bym_base_url,
                "cdnBaseUrl": self.config.bym_cdn_base_url,
                "apiVersion": self.config.bym_api_version,
                "limitations": {
                    "crossWorldMapBrowsing": False,
                    "message": (
                        "The current BYM API only exposes MR3 cell data for the "
                        "authenticated player's current world."
                    ),
                },
            },
        )

    def _handle_get_worlds(self) -> None:
        worlds_response = self.client.get_worlds()
        self._send_json(HTTPStatus.OK, worlds_response)

    def _handle_get_leaderboards(self, query_string: str) -> None:
        query = parse.parse_qs(query_string)
        world_id = self._require_query_param(query, "worldid")
        map_version = int(query.get("mapversion", ["3"])[0])

        leaderboard = self.client.get_leaderboard(world_id, map_version)
        self._send_json(HTTPStatus.OK, leaderboard)

    def _handle_login(self) -> None:
        payload = self._read_json_body()
        email = self._require_string(payload, "email")
        password = self._require_string(payload, "password")

        login_response = self.client.login(email, password)
        map_meta = self.client.get_map_meta(login_response["token"])
        self._send_json(HTTPStatus.OK, self._build_auth_payload(login_response, map_meta))

    def _handle_refresh(self) -> None:
        token = self._require_auth_token()
        login_response = self.client.relogin_with_token(token)
        map_meta = self.client.get_map_meta(login_response["token"])
        self._send_json(HTTPStatus.OK, self._build_auth_payload(login_response, map_meta))

    def _handle_get_map_meta(self) -> None:
        token = self._require_auth_token()
        response = self.client.get_map_meta(token)
        self._send_json(HTTPStatus.OK, response)

    def _handle_get_map_init(self) -> None:
        token = self._require_auth_token()
        response = self.client.init_world(token)
        self._send_json(HTTPStatus.OK, response)

    def _handle_get_map_cells(self) -> None:
        token = self._require_auth_token()
        payload = self._read_json_body()
        raw_cell_ids = payload.get("cellids")

        if not isinstance(raw_cell_ids, list):
            raise ValueError("cellids must be an array")

        cell_ids = [int(cell_id) for cell_id in raw_cell_ids if int(cell_id) > 0]
        response = self.client.get_cells(token, cell_ids)
        self._send_json(HTTPStatus.OK, response)

    def _serve_static(self, path: str) -> None:
        if path in ("", "/"):
            path = "/index.html"

        requested = (STATIC_DIR / path.lstrip("/")).resolve()
        static_root = STATIC_DIR.resolve()

        if static_root not in requested.parents and requested != static_root:
            self._send_json(HTTPStatus.FORBIDDEN, {"error": "Invalid static path"})
            return

        if requested.is_dir():
            requested = requested / "index.html"

        if not requested.exists():
            requested = STATIC_DIR / "index.html"

        mime_type, _ = mimetypes.guess_type(str(requested))
        data = requested.read_bytes()

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", mime_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_json_body(self) -> dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length).decode("utf-8") if content_length else "{}"

        try:
            parsed = json.loads(raw_body or "{}")
        except json.JSONDecodeError as exc:
            raise ValueError("Request body must be valid JSON") from exc

        if not isinstance(parsed, dict):
            raise ValueError("Request body must be a JSON object")

        return parsed

    def _require_auth_token(self) -> str:
        authorization = self.headers.get("Authorization", "")
        if not authorization.startswith("Bearer "):
            raise ValueError("Missing Authorization bearer token")
        token = authorization.removeprefix("Bearer ").strip()
        if not token:
            raise ValueError("Missing Authorization bearer token")
        return token

    @staticmethod
    def _require_query_param(query: dict[str, list[str]], key: str) -> str:
        values = query.get(key)
        if not values or not values[0].strip():
            raise ValueError(f"Missing query parameter: {key}")
        return values[0].strip()

    @staticmethod
    def _require_string(payload: dict[str, Any], key: str) -> str:
        value = payload.get(key)
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"Missing required field: {key}")
        return value.strip()

    def _build_auth_payload(self, login_response: dict[str, Any], map_meta: dict[str, Any]) -> dict[str, Any]:
        return {
            "token": login_response.get("token"),
            "user": {
                "userid": login_response.get("userid", login_response.get("userId")),
                "username": login_response.get("username"),
                "email": login_response.get("email"),
                "pic_square": login_response.get("pic_square"),
            },
            "map": map_meta,
        }

    def _send_json(self, status: int | HTTPStatus, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(int(status))
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def build_handler(config: AppConfig) -> type[ViewerRequestHandler]:
    class ConfiguredViewerRequestHandler(ViewerRequestHandler):
        pass

    ConfiguredViewerRequestHandler.client = BymClient(config)
    ConfiguredViewerRequestHandler.config = config

    return ConfiguredViewerRequestHandler


def main() -> None:
    config = AppConfig.from_env()
    handler = build_handler(config)
    server = ThreadingHTTPServer((config.host, config.port), handler)
    print(f"BYM MR Viewer listening on http://{config.host}:{config.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
