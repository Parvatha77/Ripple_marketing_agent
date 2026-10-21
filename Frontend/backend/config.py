import os

from dotenv import load_dotenv

load_dotenv()

GROQ_MODEL_SMALL = os.environ.get("GROQ_MODEL_SMALL", "openai/gpt-oss-20b")
GROQ_MODEL_LARGE = os.environ.get("GROQ_MODEL_LARGE", "openai/gpt-oss-120b")
GROQ_MAX_TOKENS = int(os.environ.get("GROQ_MAX_TOKENS", "1024"))
TEMPERATURE = float(os.environ.get("GROQ_TEMPERATURE", "0.7"))
