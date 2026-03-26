FROM python:3.12-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    docker.io \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY scripts/ scripts/
COPY viewer/ viewer/
COPY output/change_analysis.json output/change_analysis.json

# Create directories
RUN mkdir -p data output images odm_project

EXPOSE 4000

ENV PYTHONUNBUFFERED=1

CMD ["python", "scripts/api.py", "--port", "4000"]
