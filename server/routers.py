from fastapi import Query, FastAPI, APIRouter, WebSocket
from typing import AsyncGenerator
from openai import OpenAI
from fastapi.responses import StreamingResponse
from prompts import prompt_answer, prompt_feedback
from utils import _marshal_llm_to_json, parse_json
import json
import os
import logging
import coloredlogs

coloredlogs.install(
    level="INFO",
    fmt="%(asctime)s %(name)s %(funcName)s() %(filename)s %(lineno)d %(levelname)-8s %(message)s",
)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


router = APIRouter(tags=["User Interface"])


@router.get("/health")
async def health_check():
    # Simple health API
    return dict(status="alive")


async def generate(websocket, messages, feedback, model, custom_url):
    # OpenAI Client
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    custom_url = custom_url.strip()
    if custom_url != "":  # Update custom_url if detected
        client.base_url = custom_url

    if feedback is not None:  # Feedback model
        logger.info("Feedback Mode !")
        messages_feedback = [
            {"role": "user", "content": prompt_feedback.format(feedback=feedback)}
        ]
        # Rephrase feedback to response_feedback
        response_feedback = client.chat.completions.create(
            messages=messages_feedback, model=model
        )
        response_feedback = response_feedback.choices[0].message.content
        try:
            # Try to extract json from output
            response_feedback = _marshal_llm_to_json(response_feedback)
            response_feedback = parse_json(response_feedback)
            response_feedback = response_feedback["feedback"]
        except Exception:
            # If can not write feedback to the formal style, then just use the origial feedback
            response_feedback = feedback
        logger.info(
            f"after _marshal_llm_to_json, response_feedback = {response_feedback}"
        )

        # Send rephrased feedback (response_feedback) to webdocket,
        # in client, messages will be updated
        await websocket.send_json({"type": "feedback", "text": response_feedback})

        messages.append({"role": "user", "content": response_feedback})
    else:  # Query mode
        assert feedback is None
        logger.info("Query Mode !")
        if messages[-1]["role"] == "user":
            # Format the latest message by prompt_answer
            messages[-1]["content"] = prompt_answer.format(
                query=messages[-1]["content"]
            )

    response = client.chat.completions.create(
        messages=messages, model=model, stream=True
    )
    # stream response tokens
    for chunk in response:
        content = chunk.choices[0].delta.content
        if content:
            yield content


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Websocket endpoint for real-time AI responses."""
    await websocket.accept()
    while True:
        input_ws = await websocket.receive_json()
        async for ai_response in generate(
            websocket,
            input_ws.get("messages", None),
            input_ws.get("feedback", None),
            input_ws["model"],
            input_ws["custom_url"],
        ):
            await websocket.send_json({"type": "token", "text": ai_response})

        # Here, exit_token is used to inform client that the response is finished.
        await websocket.send_json({"type": "exit_token"})
