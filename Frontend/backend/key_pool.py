import os

from dotenv import load_dotenv

load_dotenv()

_raw = os.environ.get("GROQ_API_KEYS", "")
GROQ_API_KEYS = [k.strip() for k in _raw.split(",") if k.strip()]

if not GROQ_API_KEYS:
    GROQ_API_KEYS = [os.environ["GROQ_API_KEY"]]
