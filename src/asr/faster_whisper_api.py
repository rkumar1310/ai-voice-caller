import io
import os

from openai import OpenAI

from src.audio_utils import save_audio_to_file

from .asr_interface import ASRInterface


class FasterWhisperAPI(ASRInterface):
    def __init__(self, **kwargs):
        pass

    async def transcribe(self, client):
        file_path = await save_audio_to_file(
            client.scratch_buffer, client.get_file_name()
        )

        import requests
        import time

        start_time = time.time()
        url = "https://terror-md-il-katrina.trycloudflare.com/upload"
        # header bypass-tunnel-reminder
        headers = {"bypass-tunnel-reminder": "true"}
        files = {"file": open(file_path, "rb")}  # Specify the file you want to upload

        response = requests.post(url, files=files, headers=headers)

        resp = response.json()

        # os.remove(file_path)

        to_return = {
            "language": "UNSUPPORTED_BY_HUGGINGFACE_WHISPER",
            "language_probability": None,
            "text": resp["transcription"].strip(),
            "words": "UNSUPPORTED_BY_HUGGINGFACE_WHISPER",
        }
        return to_return
