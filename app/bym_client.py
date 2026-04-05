from __future__ import annotations

import json
from typing import Any
from urllib import error, parse, request

from config import AppConfig


class BymApiError(Exception):
    def __init__(self, status_code: int, message: str, payload: Any | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.payload = payload


class BymClient:
    def __init__(self, config: AppConfig) -> None:
        self._config = config

    def login(self, email: str, password: str) -> dict[str, Any]:
        return self._request(
            path=f"/api/{self._config.bym_api_version}/player/getinfo",
            method="POST",
            form={
                "email": email,
                "password": password,
                "sessionType": "game",
            },
        )

    def relogin_with_token(self, token: str) -> dict[str, Any]:
        return self._request(
            path=f"/api/{self._config.bym_api_version}/player/getinfo",
            method="POST",
            form={
                "token": token,
                "sessionType": "game",
            },
        )

    def get_worlds(self) -> dict[str, Any]:
        return self._request(
            path=f"/api/{self._config.bym_api_version}/worlds",
            method="GET",
        )

    def get_leaderboard(self, world_id: str, map_version: int = 3) -> dict[str, Any]:
        return self._request(
            path=f"/api/{self._config.bym_api_version}/leaderboards",
            method="GET",
            query={
                "worldid": world_id,
                "mapversion": str(map_version),
            },
        )

    def get_map_meta(self, token: str) -> dict[str, Any]:
        return self._request(
            path=f"/api/{self._config.bym_api_version}/bm/getnewmap",
            method="POST",
            token=token,
            form={},
        )

    def init_world(self, token: str) -> dict[str, Any]:
        return self._request(
            path="/worldmapv3/initworldmap",
            method="GET",
            token=token,
        )

    def get_cells(self, token: str, cell_ids: list[int]) -> dict[str, Any]:
        return self._request(
            path="/worldmapv3/getcells",
            method="POST",
            token=token,
            form={
                "cellids": json.dumps(cell_ids),
            },
        )

    def _request(
        self,
        *,
        path: str,
        method: str,
        token: str | None = None,
        form: dict[str, str] | None = None,
        query: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        url = self._build_url(path, query)
        headers = {
            "Accept": "application/json",
        }

        if token:
            headers["Authorization"] = f"Bearer {token}"

        body: bytes | None = None
        if method.upper() != "GET" and form is not None:
            headers["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8"
            body = parse.urlencode(form).encode("utf-8")

        req = request.Request(url=url, data=body, headers=headers, method=method.upper())

        try:
            with request.urlopen(req, timeout=self._config.request_timeout_seconds) as response:
                raw_body = response.read().decode("utf-8")
                return self._decode_json(raw_body)
        except error.HTTPError as exc:
            raw_body = exc.read().decode("utf-8")
            payload = self._try_decode_json(raw_body)
            message = self._extract_error_message(payload) or exc.reason or "BYM request failed"
            raise BymApiError(exc.code, message, payload) from exc
        except error.URLError as exc:
            raise BymApiError(502, f"Unable to reach BYM server: {exc.reason}") from exc

    def _build_url(self, path: str, query: dict[str, str] | None) -> str:
        normalized_path = path if path.startswith("/") else f"/{path}"
        base_url = f"{self._config.bym_base_url}{normalized_path}"

        if not query:
            return base_url

        return f"{base_url}?{parse.urlencode(query)}"

    def _decode_json(self, raw_body: str) -> dict[str, Any]:
        parsed = self._try_decode_json(raw_body)
        if not isinstance(parsed, dict):
            raise BymApiError(502, "BYM server returned an unexpected response", parsed)
        return parsed

    @staticmethod
    def _try_decode_json(raw_body: str) -> Any:
        raw_body = raw_body.strip()
        if not raw_body:
            return {}

        try:
            return json.loads(raw_body)
        except json.JSONDecodeError:
            return {"raw": raw_body}

    @staticmethod
    def _extract_error_message(payload: Any) -> str | None:
        if isinstance(payload, dict):
            for key in ("error", "message"):
                value = payload.get(key)
                if isinstance(value, str) and value.strip():
                    return value

            details = payload.get("errorDetails")
            if isinstance(details, dict):
                message = details.get("message")
                if isinstance(message, str) and message.strip():
                    return message

        return None
