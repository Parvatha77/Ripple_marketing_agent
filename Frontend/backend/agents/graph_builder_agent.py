import json

from config import GROQ_MODEL_LARGE
from llm_client import call_json
from prompts.graph_builder import SYSTEM_TEMPLATE
from schemas.graph import GraphResult


async def run(event_log, financial_analysis):
    prompt = SYSTEM_TEMPLATE.format(
        event_log_json=json.dumps(event_log, indent=2),
        financial_analysis_json=json.dumps(financial_analysis, indent=2),
    )
    return await call_json(prompt, task_label="graph_builder_agent", model=GROQ_MODEL_LARGE, schema=GraphResult)
