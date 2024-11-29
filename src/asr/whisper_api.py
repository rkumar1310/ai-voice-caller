import io
import os

from openai import OpenAI

from src.audio_utils import save_audio_to_file

from .asr_interface import ASRInterface


class WhisperAPI(ASRInterface):
    def __init__(self, **kwargs):
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            api_key = kwargs.get("openai_key")
        self.openai = OpenAI(api_key=api_key)

    async def transcribe(self, client):
        file_path = await save_audio_to_file(
            client.scratch_buffer, client.get_file_name()
        )

        audio_file = open(file_path, "rb")
        to_return = self.openai.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="text",
            prompt=client.transcription_text,
        )

        # os.remove(file_path)

        to_return = {
            "language": "UNSUPPORTED_BY_HUGGINGFACE_WHISPER",
            "language_probability": None,
            "text": to_return.strip(),
            "words": "UNSUPPORTED_BY_HUGGINGFACE_WHISPER",
        }
        return to_return
