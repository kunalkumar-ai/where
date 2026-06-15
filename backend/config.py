"""Project configuration. Loads secrets from the project-root .env file."""

import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / ".env")

ANTHROPIC_API_KEY: str = os.environ.get("ANTHROPIC_API_KEY", "")

ANTHROPIC_MODEL: str = "claude-sonnet-4-5"

PUE: float = 1.4
LOAD_FACTOR: float = 0.7
