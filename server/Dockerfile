FROM tiangolo/uvicorn-gunicorn:python3.10

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY * /app
RUN black /app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]