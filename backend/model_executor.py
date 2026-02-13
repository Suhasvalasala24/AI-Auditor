import time
import requests
import httpx
import json
import os
import logging
from typing import Dict, Any

logger = logging.getLogger("ai-auditor")

class ModelExecutor:
    """
    ✅ Enterprise-safe provider-agnostic executor

    - Executes exactly what connector config defines
    - Handles timeouts to prevent zombie threads
    - Safely handles non-JSON responses
    """

    def __init__(self, config: Dict[str, Any]):
        self.endpoint = config.get("endpoint")
        self.method = (config.get("method") or "POST").upper().strip()
        self.headers_template = config.get("headers", {}) or {}
        self.request_template = config.get("request_template")
        self.response_path = config.get("response_path")

        # ✅ UPDATED: Default timeout increased to 30 seconds
        self.timeout_seconds = int(os.environ.get("MODEL_CONNECTOR_TIMEOUT", "30"))

        if not self.endpoint or not self.request_template or not self.response_path:
            raise ValueError("Invalid execution contract: missing endpoint/request_template/response_path")

        if self.method not in ("POST", "GET"):
            raise ValueError("Invalid method. Only POST/GET supported currently.")

    # ✅ ASYNC EXECUTION METHOD
    async def execute_active_prompt_async(self, prompt: str, client: httpx.AsyncClient) -> Dict[str, Any]:
        start = time.time()

        headers = {}
        for k, v in (self.headers_template or {}).items():
            if isinstance(v, str):
                headers[k] = v.replace("{{PROMPT}}", prompt)
            else:
                headers[k] = str(v)

        payload = json.loads(json.dumps(self.request_template))
        payload = self._inject_prompt(payload, prompt)

        try:
            if self.method == "POST":
                response = await client.post(
                    url=self.endpoint,
                    headers=headers,
                    json=payload,
                    timeout=self.timeout_seconds,
                )
            else:
                response = await client.get(
                    url=self.endpoint,
                    headers=headers,
                    timeout=self.timeout_seconds,
                )
            response.raise_for_status()

        except httpx.TimeoutException:
            latency = time.time() - start
            logger.error(f"Async model request timed out after {self.timeout_seconds}s for prompt: {prompt[:50]}...")
            return {
                "raw_response": {"error": "timeout"},
                "content": "ERROR_TIMEOUT",
                "latency": latency,
            }
        except httpx.RequestError as exc:
            latency = time.time() - start
            return {
                "raw_response": {"error": str(exc)},
                "content": f"ERROR_CONNECTION: {str(exc)}",
                "latency": latency,
            }

        latency = time.time() - start

        raw_text_preview = response.text[:1200]
        raw_json = None
        try:
            raw_json = response.json()
        except Exception:
            raw_json = {"raw_text": raw_text_preview}

        try:
            content = self._extract_response(raw_json)
        except Exception:
            content = raw_text_preview

        return {
            "raw_response": raw_json,
            "content": content,
            "latency": latency,
        }

    # SYNC EXECUTION METHOD
    def execute_active_prompt(self, prompt: str) -> Dict[str, Any]:
        start = time.time()

        headers = {}
        for k, v in (self.headers_template or {}).items():
            if isinstance(v, str):
                headers[k] = v.replace("{{PROMPT}}", prompt)
            else:
                headers[k] = str(v)

        payload = json.loads(json.dumps(self.request_template))
        payload = self._inject_prompt(payload, prompt)

        try:
            if self.method == "POST":
                response = requests.post(
                    url=self.endpoint,
                    headers=headers,
                    json=payload,
                    timeout=self.timeout_seconds,
                )
            else:
                response = requests.get(
                    url=self.endpoint,
                    headers=headers,
                    timeout=self.timeout_seconds,
                )

        except requests.Timeout:
            latency = time.time() - start
            logger.error(f"Model request timed out after {self.timeout_seconds}s for prompt: {prompt[:50]}...")
            return {
                "raw_response": {"error": "timeout"},
                "content": "ERROR_TIMEOUT",
                "latency": latency,
            }
        except requests.RequestException as exc:
            raise RuntimeError(f"Model connection failed: {str(exc)}")

        latency = time.time() - start

        if response.status_code >= 400:
            raise RuntimeError(
                f"Model API error HTTP {response.status_code}: {response.text[:300]}"
            )

        raw_text_preview = response.text[:1200]
        raw_json = None
        try:
            raw_json = response.json()
        except Exception:
            raw_json = {"raw_text": raw_text_preview}

        try:
            content = self._extract_response(raw_json)
        except Exception:
            content = raw_text_preview

        return {
            "raw_response": raw_json,
            "content": content,
            "latency": latency,
        }

    def _inject_prompt(self, obj, prompt: str):
        if isinstance(obj, dict):
            return {k: self._inject_prompt(v, prompt) for k, v in obj.items()}
        if isinstance(obj, list):
            return [self._inject_prompt(i, prompt) for i in obj]
        if isinstance(obj, str):
            return obj.replace("{{PROMPT}}", prompt)
        return obj

    def _extract_response(self, data: dict):
        current = data
        for part in self.response_path.replace("]", "").split("."):
            if "[" in part:
                key, index = part.split("[")
                current = current[key][int(index)]
            else:
                current = current[part]
        return current