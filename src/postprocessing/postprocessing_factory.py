from .rule_based_speech_processor import RuleBasedSpeechProcessor1, RuleBasedSpeechProcessor2

class PostprocessingFactory:
    @staticmethod
    def create_postprocessing_pipeline(type, **kwargs):
        if type == "rule_based_speech_processor1":
            return RuleBasedSpeechProcessor1(**kwargs)
        if type == "rule_based_speech_processor2":
            return RuleBasedSpeechProcessor2(**kwargs)
        else:
            raise ValueError(f"Unknown postprocessing pipeline type: {type}")
