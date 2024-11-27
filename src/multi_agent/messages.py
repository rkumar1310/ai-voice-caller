from pydantic import BaseModel
from autogen_core.components.models import UserMessage, AssistantMessage


class GroupChatMessage(BaseModel):
    body: UserMessage | AssistantMessage


class RequestToSpeak(BaseModel):
    pass


class RequestToIntroduce(BaseModel):
    pass


class CallConnected(BaseModel):
    pass


class SayGoodbye(BaseModel):
    pass
