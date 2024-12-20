import string
from typing import List

from autogen_core.base import MessageContext
from autogen_core.components import (
    DefaultTopicId,
    RoutedAgent,
    message_handler,
)
from autogen_core.components.models import (
    ChatCompletionClient,
    SystemMessage,
    UserMessage,
)

from src.multi_agent.messages import (
    CallConnected,
    GroupChatMessage,
    RequestToIntroduce,
    RequestToSpeak,
    SayGoodbye,
)
from rich.console import Console
from rich.markdown import Markdown


class GroupChatManager(RoutedAgent):

    def __init__(
        self,
        user_topic_type: str,
        main_interviewer_topic_type: str,
        model_client: ChatCompletionClient,
        participant_descriptions: List[str],
        chat_stopped: bool = False,
    ) -> None:
        super().__init__("Group chat manager")
        self._user_topic_type = user_topic_type
        self._main_interviewer_topic_type = main_interviewer_topic_type
        self._model_client = model_client
        self._chat_history: List[UserMessage] = []
        self._participant_descriptions = participant_descriptions
        self._previous_participant_topic_type: str | None = None
        self._chat_stopped = chat_stopped

    @message_handler
    async def handle_message(
        self, message: GroupChatMessage, ctx: MessageContext
    ) -> None:
        if self._chat_stopped:
            Console().print(Markdown(f"### System: \nChat is stopped."))
            return

        self._chat_history.append(message.body)
        print(
            f"GroupChatManager: {message.body.source}: {message.body.content}",
            flush=True,
        )
        # If the message is an approval message from the user, stop the chat.
        if message.body.source == "User":
            # just ask the response agent to continue
            await self.publish_message(
                RequestToSpeak(), DefaultTopicId(type=self._main_interviewer_topic_type)
            )
            return
        else:
            # check if the message has "bye" or "goodbye" in it
            if any(word in message.body.content.lower() for word in ["bye", "goodbye"]):
                print("GroupChatManager: stopping chat", flush=True)
                self._chat_stopped = True
                return
            # ask the user to continue
            await self.publish_message(
                RequestToSpeak(), DefaultTopicId(type=self._user_topic_type)
            )
            return

    @message_handler
    async def handle_call_connected(
        self, message: CallConnected, ctx: MessageContext
    ) -> None:
        await self.publish_message(
            RequestToIntroduce(), DefaultTopicId(type=self._main_interviewer_topic_type)
        )
