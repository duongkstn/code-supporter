# Running Custom LLM

Using vllm to run LLMs locally or a GPU server. vllm is a library for efficient LLM inferencing, it seamlessly supports various Huggingface models for coding:

- bigcode/starcoder
- bigcode/starcoder2-3b (7b, 15b)
- codellama/CodeLlama-7b-hf (13b)
- WizardLM/WizardCoder-15B-V1.0
- openchat/opencoderplus
- mosaicml/mpt-7b
- Salesforce/xgen-7b-8k-base
- deepseek-ai/deepseek-coder-6.7b-instruct
- mistralai/Mistral-7B-Instruct-v0.2
...


The vllm server has the same interface as OpenAI's API (using FastAPI).

## Installation

```
pip install vllm==0.3.3 transformers fastapi ray
```

## Running service
To utilize vllm server locally, you need to have at least one GPU 12GB. Run the following command:

```
python -m vllm.entrypoints.openai.api_server --model <model_name> --port <port>
```

Note that, since not everyone has full access to multiple GPUs, here are options you can do to run big models:

- gpu-memory-utilization: with 3b model, you can run on a single GPU 12GB by setting gpu-memory-utilization is about 0.8.
For example:
```
python -m vllm.entrypoints.openai.api_server --model bigcode/starcoder2-3b --gpu-memory-utilization 0.8
```

- quantization: (awq,gptq,squeezellm), you have to use quantized models in https://huggingface.co/TheBloke
For example: 
```
python -m vllm.entrypoints.api_server --model TheBloke/CodeLlama-7B-AWQ --quantization awq
python -m vllm.entrypoints.api_server --model TheBloke/starcoder-GPTQ --quantization gptq
```

## Other frameworks
- NVIDIA's TensorRT-LLM
- Huggingface's text-generation-inference

For instance:
```
sudo docker run --gpus all -p 8000:80 ghcr.io/huggingface/text-generation-inference:latest --model-id bigcode/santacoder
```





