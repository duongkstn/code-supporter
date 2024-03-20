from fastapi import Query, FastAPI, APIRouter, WebSocket
from typing import AsyncGenerator
from openai import OpenAI
from fastapi.responses import StreamingResponse
from schemas import *
import json, time, os




router = APIRouter(
    tags = ['User Interface']
)

@router.get("/health")    
async def health_check():
    return dict(status="alive")

async def generate(messages, model):
    client = OpenAI(
        # This is the default and can be omitted
        api_key=os.environ.get("OPENAI_API_KEY"),
        
    )
    print(model)
    if not (model.startswith("gpt-3.5") or model.startswith("gpt-4")):
        client.base_url="http://0.0.0.0:8000/v1"

    response = client.chat.completions.create(
        messages=messages,
        model=model,
        stream=True
    )
    for chunk in response:
        
        content = chunk.choices[0].delta.content
        print(content)
        if content:
            yield content


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Websocket endpoint for real-time AI responses."""
    await websocket.accept()
    while True:
        input_ws = await websocket.receive_json()
        async for ai_response in generate(input_ws["messages"], input_ws["model"]):
            await websocket.send_json(
                {
                    "type": "token",
                    "text": ai_response
                })
        await websocket.send_json({
            "type": "exit_token"
        })