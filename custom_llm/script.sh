#!/bin/bash

python -m vllm.entrypoints.openai.api_server --model bigcode/starcoder2-3b --gpu-memory-utilization 0.8