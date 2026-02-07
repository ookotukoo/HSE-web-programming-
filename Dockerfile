FROM python:3.14-slim

COPY . .

RUN pip install -r requirements.txt

CMD ["cd", "backend"]

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]