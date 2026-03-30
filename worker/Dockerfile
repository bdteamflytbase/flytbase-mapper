# Worker is python:slim + docker.sock mount.
# ODM runs as a CHILD Docker container (Docker-in-Docker), not inside this image.
FROM python:3.12-slim

WORKDIR /worker

RUN apt-get update && apt-get install -y --no-install-recommends \
    docker.io \
    libgl1 \
    libglib2.0-0 \
    libgdal-dev \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ .

ENV PYTHONUNBUFFERED=1

CMD ["python", "main.py"]
