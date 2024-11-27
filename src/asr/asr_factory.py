from src.asr.whisper_api import WhisperAPI
from .faster_whisper_asr import FasterWhisperASR
from .whisper_asr import WhisperASR


class ASRFactory:
    @staticmethod
    def create_asr_pipeline(asr_type, **kwargs):
        if asr_type == "whisper":
            return WhisperASR(**kwargs)
        if asr_type == "faster_whisper":
            return FasterWhisperASR(**kwargs)
        if asr_type == "whisper_api":
            return WhisperAPI(**kwargs)
        else:
            raise ValueError(f"Unknown ASR pipeline type: {asr_type}")
