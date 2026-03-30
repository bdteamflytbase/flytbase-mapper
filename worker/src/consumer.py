"""
RabbitMQ Consumer — picks jobs from mapper.jobs queue and dispatches to handler.
"""
import asyncio
import json
import logging
import os

import aio_pika

from handler import handle_job

logger = logging.getLogger("consumer")
QUEUE = "mapper.jobs"


async def start_consumer():
    url = os.environ["RABBITMQ_URL"]
    logger.info(f"Connecting to RabbitMQ...")

    while True:
        try:
            connection = await aio_pika.connect_robust(url)
            async with connection:
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=1)  # one job at a time (GPU)
                queue = await channel.declare_queue(QUEUE, durable=True)

                logger.info(f"Listening on queue: {QUEUE}")

                async with queue.iterator() as q_iter:
                    async for message in q_iter:
                        async with message.process(requeue=False):
                            try:
                                payload = json.loads(message.body.decode())
                                logger.info(f"Received job: {payload.get('job_id')}")
                                await handle_job(payload)
                            except Exception as e:
                                logger.exception(f"Job failed with unhandled error: {e}")
        except Exception as e:
            logger.error(f"RabbitMQ connection error: {e}. Retrying in 10s...")
            await asyncio.sleep(10)
