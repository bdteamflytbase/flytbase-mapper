"""
FlytBase Mapper GPU Worker — Entry Point
Connects to RabbitMQ and processes photogrammetry jobs.
"""
import asyncio
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from consumer import start_consumer

if __name__ == "__main__":
    asyncio.run(start_consumer())
