FROM python:3.14-slim

COPY . .

RUN pip install -r requirements.txt

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "80"]