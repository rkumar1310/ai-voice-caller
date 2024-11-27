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
        participant_topic_types: List[str],
        main_interviewer_topic_type: str,
        model_client: ChatCompletionClient,
        participant_descriptions: List[str],
        chat_stopped: bool = False,
    ) -> None:
        super().__init__("Group chat manager")
        self._participant_topic_types = participant_topic_types
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
        # If the message is an approval message from the user, stop the chat.
        if message.body.source == "User":
            assert isinstance(message.body.content, str)
            if (
                message.body.content.lower()
                .strip(string.punctuation)
                .endswith("approve")
            ):
                return
        # Format message history.
        messages: List[str] = []
        for msg in self._chat_history:
            if isinstance(msg.content, str):
                messages.append(f"{msg.source}: {msg.content}")
            elif isinstance(msg.content, list):
                line: List[str] = []
                for item in msg.content:
                    if isinstance(item, str):
                        line.append(item)
                    else:
                        line.append("[Image]")
                messages.append(f"{msg.source}: {', '.join(line)}")
        history = "\n".join(messages)

        # Format roles.
        roles = "\n".join(
            [
                f"{topic_type}: {description}".strip()
                for topic_type, description in zip(
                    self._participant_topic_types,
                    self._participant_descriptions,
                    strict=True,
                )
                if topic_type != self._previous_participant_topic_type
            ]
        )
        selector_prompt = """You are facilitating an interview between a user and an assistant.
        You can decide if the conversation should continue with any role or should be stopped.
        The following roles are available:
{roles}.
Read the following conversation. Then select the next role from {participants} to play. Only return the role or return 'stop' to stop the conversation.

{history}

Read the above conversation. Then select the next role from {participants} to play. Only return the role or return 'stop' to stop the conversation
"""

        system_message = SystemMessage(
            selector_prompt.format(
                roles=roles,
                history=history,
                participants=str(
                    [
                        topic_type
                        for topic_type in self._participant_topic_types
                        if topic_type != self._previous_participant_topic_type
                    ]
                ),
            )
        )
        completion = await self._model_client.create(
            [system_message], cancellation_token=ctx.cancellation_token
        )
        assert isinstance(completion.content, str)
        if completion.content.lower().strip() != "stop":
            for topic_type in self._participant_topic_types:
                if topic_type.lower() in completion.content.lower():
                    selected_topic_type = topic_type
                    self._previous_participant_topic_type = selected_topic_type
                    await self.publish_message(
                        RequestToSpeak(), DefaultTopicId(type=selected_topic_type)
                    )
                    return
        else:  # Stop the conversation.
            await self.publish_message(
                SayGoodbye(), DefaultTopicId(type=self._main_interviewer_topic_type)
            )
            self._chat_stopped = True
            return
        raise ValueError(f"Invalid role selected: {completion.content}")

    @message_handler
    async def handle_call_connected(
        self, message: CallConnected, ctx: MessageContext
    ) -> None:
        await self.publish_message(
            RequestToIntroduce(), DefaultTopicId(type=self._main_interviewer_topic_type)
        )
