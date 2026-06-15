from dotenv import load_dotenv
import os

load_dotenv()

ANTHROPIC_API_KEY: str = os.environ.get("ANTHROPIC_API_KEY", "")

PUE: float = 1.4
LOAD_FACTOR: float = 0.7
