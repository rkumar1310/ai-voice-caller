# tasks.py
from invoke import task
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()


@task
def dev(c):
    """
    Run main.py using values from .env file.
    """
    hf_token = os.getenv("AUTH_TOKEN", "<AUTH_TOKEN>")
    openai_api_key = os.getenv("OPENAI_API_KEY", "<OPEN_API_KEY>")
    command = f'python3 -m src.main --vad-args \'{{"auth_token": "{hf_token}"}}\' --asr-type faster_whisper_api --asr-args \'{{"openai_key" : "{openai_api_key}"}}\''
    c.run(command, pty=True)  # Enable real-time output
