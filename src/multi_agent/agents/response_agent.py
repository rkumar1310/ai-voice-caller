from src.multi_agent.agents.base_group_chat_agent import BaseGroupChatAgent
from autogen_core.base import MessageContext

from autogen_core.components.models import (
    ChatCompletionClient,
    UserMessage,
    AssistantMessage,
    SystemMessage,
)
from autogen_core.components import (
    DefaultTopicId,
    message_handler,
)

from src.multi_agent.messages import GroupChatMessage, RequestToIntroduce, SayGoodbye

from rich.console import Console
from rich.markdown import Markdown


class ResponseAgent(BaseGroupChatAgent):
    def __init__(
        self,
        description: str,
        group_chat_topic_type: str,
        model_client: ChatCompletionClient,
    ) -> None:
        super().__init__(
            description=description,
            group_chat_topic_type=group_chat_topic_type,
            model_client=model_client,
            system_message="""
            You are a highly skilled interviewer who is conducting a screening interview for a range of positions.
            You are primarily interested in the candidate's experience and skills, and you are looking for a candidate who is a good fit for any company in general.
            You are not interested in the candidate's personal life or hobbies.
            You are highly professional and focused on the task at hand.
            Your aim is to learn as much as possible about the candidate's experience and professional skills.
            Since you are talking over the phone, you should keep the responses short and to the point.
            Here are the details of the candidate you are interviewing:
            Candidate Name: Rajesh
            Education: Bachelor's degree in Computer Science
            Experience: 5 years of experience in software development
            Skills: Java, Python, C++, SQL
            """,
        )

    @message_handler
    async def handle_request_to_introduce(
        self, message: RequestToIntroduce, ctx: MessageContext
    ) -> None:
        # print(f"\n{'-'*80}\n{self.id.type}:", flush=True)
        Console().print(Markdown(f"### {self.id.type}: "))
        self._chat_history.append(
            UserMessage(
                content=f"Call connected. You are now speaking with the candidate. Please begin the interview.",
                source="system",
            )
        )
        completion = await self._model_client.create(
            [self._system_message] + self._chat_history
        )
        assert isinstance(completion.content, str)
        self._chat_history.append(
            AssistantMessage(content=completion.content, source=self.id.type)
        )
        Console().print(Markdown(completion.content))
        # print(completion.content, flush=True)
        await self.publish_message(
            GroupChatMessage(
                body=AssistantMessage(content=completion.content, source=self.id.type)
            ),
            topic_id=DefaultTopicId(type=self._group_chat_topic_type),
        )

    @message_handler
    async def handle_say_goodbye(
        self, message: SayGoodbye, ctx: MessageContext
    ) -> None:
        # print(f"\n{'-'*80}\n{self.id.type}:", flush=True)
        Console().print(Markdown(f"### {self.id.type}: "))

        completion = await self._model_client.create(
            [
                self._system_message,
                SystemMessage(
                    "The interview has ended. Thank and say goodbye to the candidate."
                ),
            ]
            + self._chat_history
        )
        assert isinstance(completion.content, str)
        self._chat_history.append(
            AssistantMessage(content=completion.content, source=self.id.type)
        )
        Console().print(Markdown(completion.content))
        # print(completion.content, flush=True)
        await self.publish_message(
            GroupChatMessage(
                body=AssistantMessage(content=completion.content, source=self.id.type)
            ),
            topic_id=DefaultTopicId(type=self._group_chat_topic_type),
        )
